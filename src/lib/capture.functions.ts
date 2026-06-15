import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const AI_MODEL = "google/gemini-3-flash-preview";
const SLIDES_BUCKET = "lecture-slides";

export const setLectureLanguage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ lectureId: z.string().uuid(), language: z.string().min(2).max(20) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lectures")
      .update({ output_language: data.language })
      .eq("id", data.lectureId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Sign an upload URL for a slide PDF file
export const signSlideUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ lectureId: z.string().uuid(), filename: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const path = `${context.userId}/${data.lectureId}/${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data: signed, error } = await context.supabase.storage
      .from(SLIDES_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { uploadUrl: signed.signedUrl, path, token: signed.token };
  });

// Parse uploaded slides (PDF) with Gemini and store extracted text
export const importSlides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ lectureId: z.string().uuid(), storagePath: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { callGateway } = await import("./ai-gateway.server");
    const { data: blob, error } = await context.supabase.storage
      .from(SLIDES_BUCKET)
      .download(data.storagePath);
    if (error || !blob) throw new Error(error?.message ?? "Download failed");
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
    const base64 = btoa(bin);
    const text = await callGateway({
      model: AI_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Extract the textual content from these lecture slides. Output one slide per line, prefixed with '## Slide N: <title>' then the bullet content. Plain text only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Slides:" },
            { type: "file", file: { filename: "slides.pdf", file_data: `data:application/pdf;base64,${base64}` } },
          ],
        },
      ],
    });
    const { error: uErr } = await context.supabase
      .from("lectures")
      .update({ slides_text: text, slides_storage_path: data.storagePath })
      .eq("id", data.lectureId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, slidesText: text };
  });

// Whiteboard / camera OCR — accept an image data URL, extract content as a markdown block
export const captureWhiteboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ lectureId: z.string().uuid(), imageDataUrl: z.string().min(20).max(8_000_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { callGateway } = await import("./ai-gateway.server");
    const text = await callGateway({
      model: AI_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "You see a photo of a lecture whiteboard or slide. Transcribe all text and describe any diagrams in concise markdown. Use bullet points, headings, equations in LaTeX when present.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Capture this whiteboard content." },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        },
      ],
    });
    const { data: out } = await context.supabase
      .from("lecture_outputs")
      .select("whiteboard_captures")
      .eq("lecture_id", data.lectureId)
      .maybeSingle();
    const prev = Array.isArray(out?.whiteboard_captures) ? (out!.whiteboard_captures as unknown[]) : [];
    const next = [...prev, { capturedAt: new Date().toISOString(), markdown: text }];
    const { error } = await context.supabase
      .from("lecture_outputs")
      .upsert(
        {
          lecture_id: data.lectureId,
          user_id: context.userId,
          whiteboard_captures: next as Json,
        },
        { onConflict: "lecture_id" },
      );
    if (error) throw new Error(error.message);
    return { markdown: text };
  });