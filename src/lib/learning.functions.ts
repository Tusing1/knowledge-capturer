import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const AI_MODEL = "google/gemini-3-flash-preview";

// ---------- Spaced repetition (SM-2) ----------

export const seedFlashcardReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: out } = await context.supabase
      .from("lecture_outputs")
      .select("flashcards")
      .eq("lecture_id", data.lectureId)
      .maybeSingle();
    const cards = (out?.flashcards ?? []) as Array<{ q: string; a: string }>;
    if (!Array.isArray(cards) || cards.length === 0) return { inserted: 0 };
    const rows = cards.map((c, i) => ({
      user_id: context.userId,
      lecture_id: data.lectureId,
      card_index: i,
      front: c.q ?? "",
      back: c.a ?? "",
    }));
    const { error } = await context.supabase
      .from("flashcard_reviews")
      .upsert(rows, { onConflict: "lecture_id,card_index,user_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

export const getDueReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("flashcard_reviews")
      .select("id, lecture_id, card_index, front, back, ease_factor, interval_days, repetitions, due_at")
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true })
      .limit(40);
    if (error) throw new Error(error.message);
    const lectureIds = Array.from(new Set((data ?? []).map((r) => r.lecture_id)));
    let titles: Record<string, string> = {};
    if (lectureIds.length) {
      const { data: ls } = await context.supabase
        .from("lectures")
        .select("id, title")
        .in("id", lectureIds);
      titles = Object.fromEntries((ls ?? []).map((l) => [l.id as string, l.title as string]));
    }
    return { reviews: (data ?? []).map((r) => ({ ...r, lecture_title: titles[r.lecture_id] ?? "" })) };
  });

export const gradeReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reviewId: z.string().uuid(), quality: z.number().int().min(0).max(5) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: cur, error } = await context.supabase
      .from("flashcard_reviews")
      .select("ease_factor, interval_days, repetitions")
      .eq("id", data.reviewId)
      .single();
    if (error || !cur) throw new Error(error?.message ?? "Not found");
    // SM-2
    const q = data.quality;
    let ef = Number(cur.ease_factor) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ef < 1.3) ef = 1.3;
    let reps = cur.repetitions;
    let interval = cur.interval_days;
    if (q < 3) {
      reps = 0;
      interval = 1;
    } else {
      reps += 1;
      if (reps === 1) interval = 1;
      else if (reps === 2) interval = 6;
      else interval = Math.round(interval * ef);
    }
    const due = new Date(Date.now() + interval * 24 * 60 * 60 * 1000).toISOString();
    const { error: uErr } = await context.supabase
      .from("flashcard_reviews")
      .update({
        ease_factor: ef,
        interval_days: interval,
        repetitions: reps,
        due_at: due,
        last_reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.reviewId);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, nextDue: due, intervalDays: interval };
  });

// ---------- Exams ----------

export const listExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exams")
      .select("*")
      .order("exam_date", { ascending: true });
    if (error) throw new Error(error.message);
    return { exams: data ?? [] };
  });

export const createExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().min(1).max(200),
      examDate: z.string(),
      course: z.string().max(200).optional(),
      lectureIds: z.array(z.string().uuid()).max(100).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("exams")
      .insert({
        user_id: context.userId,
        title: data.title,
        exam_date: data.examDate,
        course: data.course ?? null,
        lecture_ids: data.lectureIds,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    // Seed reviews for the linked lectures and accelerate their schedule
    for (const lectureId of data.lectureIds) {
      const { data: out } = await context.supabase
        .from("lecture_outputs")
        .select("flashcards")
        .eq("lecture_id", lectureId)
        .maybeSingle();
      const cards = (out?.flashcards ?? []) as Array<{ q: string; a: string }>;
      if (!Array.isArray(cards) || !cards.length) continue;
      const rows = cards.map((c, i) => ({
        user_id: context.userId,
        lecture_id: lectureId,
        card_index: i,
        front: c.q ?? "",
        back: c.a ?? "",
      }));
      await context.supabase
        .from("flashcard_reviews")
        .upsert(rows, { onConflict: "lecture_id,card_index,user_id", ignoreDuplicates: true });
    }
    return { id: row.id as string };
  });

export const deleteExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("exams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Concept map ----------

export const generateConceptMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { callGateway } = await import("./ai-gateway.server");
    const { data: out } = await context.supabase
      .from("lecture_outputs")
      .select("full_transcript, summary")
      .eq("lecture_id", data.lectureId)
      .maybeSingle();
    if (!out?.full_transcript) throw new Error("No transcript available.");
    const raw = await callGateway({
      model: AI_MODEL,
      temperature: 0.2,
      responseFormat: "json_object",
      messages: [
        {
          role: "system",
          content:
            'Build a concept map of the lecture. Return STRICT JSON: {"nodes":[{"id":string,"label":string,"description":string}],"edges":[{"from":string,"to":string,"relation":string}]}. 6-14 nodes. Each edge.relation is a short verb phrase.',
        },
        { role: "user", content: out.full_transcript.slice(0, 40000) },
      ],
    });
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("AI returned invalid JSON."); }
    const { error } = await context.supabase
      .from("lecture_outputs")
      .update({ concept_map: parsed as Json })
      .eq("lecture_id", data.lectureId);
    if (error) throw new Error(error.message);
    return { conceptMap: parsed };
  });

// ---------- Citations ----------

export const generateCitations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { callGateway } = await import("./ai-gateway.server");
    const { data: out } = await context.supabase
      .from("lecture_outputs")
      .select("full_transcript")
      .eq("lecture_id", data.lectureId)
      .maybeSingle();
    if (!out?.full_transcript) throw new Error("No transcript available.");
    const raw = await callGateway({
      model: AI_MODEL,
      temperature: 0.1,
      responseFormat: "json_object",
      messages: [
        {
          role: "system",
          content:
            'Extract any references the lecturer mentioned (books, papers, authors). Return JSON: {"citations":[{"type":"book"|"paper"|"article","mention":string,"apa":string,"mla":string}]}. If unsure of fields (year, journal), use "n.d." or leave blank. Empty array if none.',
        },
        { role: "user", content: out.full_transcript.slice(0, 40000) },
      ],
    });
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("AI returned invalid JSON."); }
    const { error } = await context.supabase
      .from("lecture_outputs")
      .update({ citations: parsed as Json })
      .eq("lecture_id", data.lectureId);
    if (error) throw new Error(error.message);
    return { citations: parsed };
  });

// ---------- Gap analysis ----------

export const upsertSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ course: z.string().min(1).max(200), syllabus: z.string().min(1).max(20000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("course_syllabi")
      .upsert(
        { user_id: context.userId, course: data.course, syllabus: data.syllabus },
        { onConflict: "user_id,course" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSyllabus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ course: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("course_syllabi")
      .select("syllabus")
      .eq("user_id", context.userId)
      .eq("course", data.course)
      .maybeSingle();
    return { syllabus: row?.syllabus ?? null };
  });

export const generateGapAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lectureId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { callGateway } = await import("./ai-gateway.server");
    const { data: lec } = await context.supabase
      .from("lectures")
      .select("course")
      .eq("id", data.lectureId)
      .single();
    if (!lec?.course) throw new Error("Assign a course to this lecture first.");
    const { data: syl } = await context.supabase
      .from("course_syllabi")
      .select("syllabus")
      .eq("user_id", context.userId)
      .eq("course", lec.course)
      .maybeSingle();
    if (!syl?.syllabus) throw new Error(`No syllabus saved for "${lec.course}".`);
    const { data: out } = await context.supabase
      .from("lecture_outputs")
      .select("summary, structured_notes")
      .eq("lecture_id", data.lectureId)
      .maybeSingle();
    const raw = await callGateway({
      model: AI_MODEL,
      temperature: 0.2,
      responseFormat: "json_object",
      messages: [
        {
          role: "system",
          content:
            'Compare a course syllabus to what was covered in this lecture. Return JSON: {"covered":string[],"partial":string[],"missing":string[]}. Each item is a brief topic from the syllabus.',
        },
        {
          role: "user",
          content: `Syllabus:\n${syl.syllabus}\n\nLecture summary:\n${out?.summary ?? ""}\n\nLecture notes:\n${JSON.stringify(out?.structured_notes ?? []).slice(0, 20000)}`,
        },
      ],
    });
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("AI returned invalid JSON."); }
    const { error } = await context.supabase
      .from("lecture_outputs")
      .update({ gap_analysis: parsed as Json })
      .eq("lecture_id", data.lectureId);
    if (error) throw new Error(error.message);
    return { gapAnalysis: parsed };
  });