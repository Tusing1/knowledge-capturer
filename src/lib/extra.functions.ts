import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DEMO_EMAIL = "demo@lectureloop.app";
const DEMO_PASSWORD = "DemoPremium-2026!";

// --- Profile / Pro ---

export const getProfileFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name, is_pro, pro_expires_at, is_demo, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const email = (context.claims as { email?: string } | undefined)?.email ?? null;
    const proActive = !!data?.is_pro && (!data?.pro_expires_at || new Date(data.pro_expires_at) > new Date());
    return { profile: data, email, proActive };
  });

export const activateDemoPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await context.supabase
      .from("profiles")
      .update({ is_pro: true, pro_expires_at: expires })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, expires };
  });

// Ensures the shared demo account exists and returns its credentials so the
// client can sign in normally. The account is flagged as Pro + demo.
export const ensureDemoAccount = createServerFn({ method: "POST" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Try to find existing user by listing (small scale OK for demo)
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = list?.users?.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
    if (!user) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: "Demo Premium" },
      });
      if (error) throw new Error(error.message);
      user = created.user!;
    }
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: user.id, display_name: "Demo Premium", is_pro: true, is_demo: true, pro_expires_at: expires });
    return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
  });

// --- Lecture mutations ---

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lectureId: z.string().uuid(), value: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lectures")
      .update({ is_favorite: data.value })
      .eq("id", data.lectureId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setLectureTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      lectureId: z.string().uuid(),
      tags: z.array(z.string().min(1).max(40).regex(/^[a-zA-Z0-9 _-]+$/)).max(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lectures")
      .update({ tags: data.tags })
      .eq("id", data.lectureId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lectureId: z.string().uuid(), enable: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const shareId = data.enable ? crypto.randomUUID() : null;
    const { data: row, error } = await context.supabase
      .from("lectures")
      .update({ share_id: shareId })
      .eq("id", data.lectureId)
      .select("share_id")
      .single();
    if (error) throw new Error(error.message);
    return { shareId: row.share_id as string | null };
  });

// --- Search ---

export const searchLectures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const q = data.q.trim();
    const { data: lectures, error: e1 } = await context.supabase
      .from("lectures")
      .select("id, title, course, status, started_at, tags, is_favorite")
      .or(`title.ilike.%${q}%,course.ilike.%${q}%`)
      .order("started_at", { ascending: false })
      .limit(50);
    if (e1) throw new Error(e1.message);

    const { data: outs, error: e2 } = await context.supabase
      .from("lecture_outputs")
      .select("lecture_id, summary")
      .ilike("full_transcript", `%${q}%`)
      .limit(50);
    if (e2) throw new Error(e2.message);

    const transcriptHits = (outs ?? []).map((o) => o.lecture_id as string);
    let extra: typeof lectures = [];
    if (transcriptHits.length) {
      const seen = new Set((lectures ?? []).map((l) => l.id));
      const missing = transcriptHits.filter((id) => !seen.has(id));
      if (missing.length) {
        const { data: more } = await context.supabase
          .from("lectures")
          .select("id, title, course, status, started_at, tags, is_favorite")
          .in("id", missing);
        extra = more ?? [];
      }
    }
    return { lectures: [...(lectures ?? []), ...extra], transcriptHits };
  });

// --- Public share (no auth) ---

export const getSharedLecture = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ shareId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lecture, error } = await supabaseAdmin
      .from("lectures")
      .select("id, title, course, started_at")
      .eq("share_id", data.shareId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lecture) return { lecture: null, output: null };
    const { data: output } = await supabaseAdmin
      .from("lecture_outputs")
      .select("summary, structured_notes, quotes, likely_questions, flashcards")
      .eq("lecture_id", lecture.id)
      .maybeSingle();
    return { lecture, output };
  });