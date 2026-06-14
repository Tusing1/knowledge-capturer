import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const CHUNK_BUCKET = "lecture-audio";
const TRANSCRIBE_MODEL = "google/gemini-3-flash-preview";
const FINALIZE_MODEL = "google/gemini-3-flash-preview";

// ----- Lecture lifecycle -----

export const startLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ title: z.string().min(1).max(200), course: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("lectures")
      .insert({ user_id: context.userId, title: data.title, course: data.course ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { lectureId: row.id as string };
  });

export const endLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lectures")
      .update({ ended_at: new Date().toISOString(), status: "processing" })
      .eq("id", data.lectureId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listLectures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lectures")
      .select("id, title, course, status, started_at, ended_at, tags, is_favorite, share_id")
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { lectures: data ?? [] };
  });

export const getLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: lecture, error: e1 }, { data: chunks, error: e2 }, { data: output, error: e3 }] =
      await Promise.all([
        context.supabase.from("lectures").select("*").eq("id", data.lectureId).single(),
        context.supabase
          .from("chunks")
          .select("id, index, status, transcript, partial_notes, duration_ms, created_at, error, storage_path, mime_type")
          .eq("lecture_id", data.lectureId)
          .order("index", { ascending: true }),
        context.supabase.from("lecture_outputs").select("*").eq("lecture_id", data.lectureId).maybeSingle(),
      ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (e3) throw new Error(e3.message);
    return { lecture, chunks: chunks ?? [], output: output ?? null };
  });

// ----- Chunk transcription -----

export const registerChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        lectureId: z.string().uuid(),
        index: z.number().int().min(0).max(10000),
        storagePath: z.string().min(1).max(500),
        durationMs: z.number().int().min(0).max(10 * 60 * 1000),
        mimeType: z.string().min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("chunks")
      .insert({
        lecture_id: data.lectureId,
        user_id: context.userId,
        index: data.index,
        storage_path: data.storagePath,
        duration_ms: data.durationMs,
        mime_type: data.mimeType,
        status: "uploaded",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { chunkId: row.id as string };
  });

// Free-tier path: client did on-device speech-to-text. We just store the text.
export const submitTranscriptChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        lectureId: z.string().uuid(),
        index: z.number().int().min(0).max(10000),
        transcript: z.string().min(1).max(50000),
        durationMs: z.number().int().min(0).max(10 * 60 * 1000).default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("chunks")
      .insert({
        lecture_id: data.lectureId,
        user_id: context.userId,
        index: data.index,
        storage_path: `ondevice/${data.lectureId}/${data.index}`,
        duration_ms: data.durationMs,
        mime_type: "text/plain",
        status: "transcribed",
        transcript: data.transcript,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { chunkId: row.id as string };
  });

export const transcribeChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ chunkId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { callGateway } = await import("./ai-gateway.server");

    const { data: chunk, error: e1 } = await context.supabase
      .from("chunks")
      .select("id, lecture_id, index, storage_path, mime_type, user_id")
      .eq("id", data.chunkId)
      .single();
    if (e1 || !chunk) throw new Error(e1?.message ?? "Chunk not found");
    if (chunk.user_id !== context.userId) throw new Error("Forbidden");

    await context.supabase.from("chunks").update({ status: "transcribing" }).eq("id", chunk.id);

    try {
      const { data: blob, error: dlErr } = await context.supabase.storage
        .from(CHUNK_BUCKET)
        .download(chunk.storage_path);
      if (dlErr || !blob) throw new Error(dlErr?.message ?? "Audio download failed");

      const buf = new Uint8Array(await blob.arrayBuffer());
      // base64 encode
      let bin = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < buf.length; i += chunkSize) {
        bin += String.fromCharCode(...buf.subarray(i, i + chunkSize));
      }
      const base64 = btoa(bin);
      const fmt = chunk.mime_type.includes("webm") ? "webm" : chunk.mime_type.includes("mp4") ? "mp4" : "webm";

      const transcript = await callGateway({
        model: TRANSCRIBE_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a precise lecture transcriber. Output ONLY the verbatim spoken words from the audio. No commentary, no timestamps, no speaker labels, no markdown. If audio is silent or unintelligible, return an empty string.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this 3-minute lecture segment." },
              { type: "input_audio", input_audio: { data: base64, format: fmt } },
            ],
          },
        ],
      });

      // Quick partial notes pass
      let partialNotes: unknown = null;
      if (transcript.trim().length > 40) {
        try {
          const raw = await callGateway({
            model: TRANSCRIBE_MODEL,
            temperature: 0.2,
            responseFormat: "json_object",
            messages: [
              {
                role: "system",
                content:
                  'Extract 1-4 concise bullet notes from this lecture excerpt. Return JSON: {"bullets": string[]}',
              },
              { role: "user", content: transcript },
            ],
          });
          partialNotes = JSON.parse(raw);
        } catch {
          partialNotes = null;
        }
      }

      await context.supabase
        .from("chunks")
        .update({ status: "transcribed", transcript, partial_notes: partialNotes as Json })
        .eq("id", chunk.id);

      return { ok: true, transcript };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await context.supabase
        .from("chunks")
        .update({ status: "failed", error: message.slice(0, 500) })
        .eq("id", chunk.id);
      throw new Error(message);
    }
  });

// ----- Finalize -----

export const finalizeLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { callGateway } = await import("./ai-gateway.server");

    const { data: lecture, error: lErr } = await context.supabase
      .from("lectures")
      .select("id, user_id, title, course")
      .eq("id", data.lectureId)
      .single();
    if (lErr || !lecture) throw new Error(lErr?.message ?? "Lecture not found");

    const { data: chunks, error: cErr } = await context.supabase
      .from("chunks")
      .select("index, transcript")
      .eq("lecture_id", data.lectureId)
      .order("index", { ascending: true });
    if (cErr) throw new Error(cErr.message);

    const fullTranscript = (chunks ?? [])
      .map((c) => c.transcript ?? "")
      .filter((t) => t.trim().length > 0)
      .join("\n\n");

    if (fullTranscript.trim().length < 30) {
      await context.supabase
        .from("lectures")
        .update({ status: "failed" })
        .eq("id", data.lectureId);
      throw new Error("Not enough transcribed audio to generate notes.");
    }

    const systemPrompt = `You are an expert study-notes assistant. Given a raw lecture transcript, produce structured study material as STRICT JSON with this exact shape:
{
  "summary": string (2-4 sentence overview),
  "structured_notes": [ { "heading": string, "bullets": string[] } ],
  "quotes": [ { "text": string, "importance": "high" | "medium" | "low", "reason": string } ],
  "likely_questions": [ { "question": string, "why": string } ],
  "flashcards": [ { "q": string, "a": string } ]
}
Rules:
- "quotes" are direct verbatim sentences the lecturer said that are most likely to be examined or are central to the topic.
- "likely_questions" are questions the lecturer might ask students or put on an exam.
- Be specific to the actual transcript content. No filler.
- 5-12 quotes, 5-12 likely_questions, 8-20 flashcards.
- Output JSON only, no markdown.`;

    const userPrompt = `Lecture title: ${lecture.title}\nCourse: ${lecture.course ?? "(unspecified)"}\n\nTranscript:\n${fullTranscript.slice(0, 60000)}`;

    const raw = await callGateway({
      model: FINALIZE_MODEL,
      temperature: 0.3,
      responseFormat: "json_object",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    let parsed: {
      summary?: string;
      structured_notes?: unknown;
      quotes?: unknown;
      likely_questions?: unknown;
      flashcards?: unknown;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("AI returned unparseable JSON.");
    }

    const { error: upErr } = await context.supabase.from("lecture_outputs").upsert({
      lecture_id: data.lectureId,
      user_id: context.userId,
      full_transcript: fullTranscript,
      structured_notes: (parsed.structured_notes ?? []) as Json,
      quotes: (parsed.quotes ?? []) as Json,
      likely_questions: (parsed.likely_questions ?? []) as Json,
      flashcards: (parsed.flashcards ?? []) as Json,
      summary: parsed.summary ?? null,
      generated_at: new Date().toISOString(),
    });
    if (upErr) throw new Error(upErr.message);

    await context.supabase.from("lectures").update({ status: "ready" }).eq("id", data.lectureId);

    return { ok: true };
  });

// ----- Signed URL for chunk download (rare, used in lecture view audio playback) -----

export const signChunkUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ chunkId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: chunk, error } = await context.supabase
      .from("chunks")
      .select("storage_path, user_id")
      .eq("id", data.chunkId)
      .single();
    if (error || !chunk) throw new Error(error?.message ?? "Not found");
    if (chunk.user_id !== context.userId) throw new Error("Forbidden");
    const { data: signed, error: sErr } = await context.supabase.storage
      .from(CHUNK_BUCKET)
      .createSignedUrl(chunk.storage_path, 60 * 60);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl };
  });