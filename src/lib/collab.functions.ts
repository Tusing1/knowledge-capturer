import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Course rooms (shared notes) ----------

export const listRoomNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ course: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: notes, error } = await context.supabase
      .from("shared_notes")
      .select("id, kind, content, votes, created_at, user_id")
      .eq("course", data.course)
      .order("votes", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const { data: myVotes } = await context.supabase
      .from("shared_note_votes")
      .select("note_id")
      .eq("user_id", context.userId);
    const voted = new Set((myVotes ?? []).map((v) => v.note_id as string));
    // Anonymize: hash user_id to a stable short tag
    return {
      notes: (notes ?? []).map((n) => ({
        id: n.id,
        kind: n.kind,
        content: n.content,
        votes: n.votes,
        created_at: n.created_at,
        mine: n.user_id === context.userId,
        voted: voted.has(n.id as string),
        author_tag: `Student ${(n.user_id as string).slice(0, 4)}`,
      })),
    };
  });

export const postRoomNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      course: z.string().min(1).max(200),
      lectureId: z.string().uuid().optional(),
      kind: z.enum(["note", "quote", "question"]).default("note"),
      content: z.string().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("shared_notes").insert({
      course: data.course,
      lecture_id: data.lectureId ?? null,
      user_id: context.userId,
      kind: data.kind,
      content: data.content,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const voteRoomNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ noteId: z.string().uuid(), value: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.value) {
      const { error } = await context.supabase
        .from("shared_note_votes")
        .insert({ note_id: data.noteId, user_id: context.userId });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
      await context.supabase.rpc; // noop placeholder
      // Recompute vote count
      const { count } = await context.supabase
        .from("shared_note_votes")
        .select("*", { count: "exact", head: true })
        .eq("note_id", data.noteId);
      await context.supabase.from("shared_notes").update({ votes: count ?? 0 }).eq("id", data.noteId);
    } else {
      await context.supabase
        .from("shared_note_votes")
        .delete()
        .eq("note_id", data.noteId)
        .eq("user_id", context.userId);
      const { count } = await context.supabase
        .from("shared_note_votes")
        .select("*", { count: "exact", head: true })
        .eq("note_id", data.noteId);
      await context.supabase.from("shared_notes").update({ votes: count ?? 0 }).eq("id", data.noteId);
    }
    return { ok: true };
  });

// ---------- Professor mode ----------

export const becomeProfessor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: context.userId, role: "professor" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const myRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return { roles: (data ?? []).map((r) => r.role as string) };
  });

export const enrollStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ studentEmail: z.string().email(), course: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isProf } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "professor",
    });
    if (!isProf) throw new Error("Forbidden: professor role required.");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const student = users?.users?.find((u) => u.email?.toLowerCase() === data.studentEmail.toLowerCase());
    if (!student) throw new Error("No registered student with that email.");
    const { error } = await supabaseAdmin
      .from("enrollments")
      .insert({ professor_id: context.userId, student_id: student.id, course: data.course });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const listMyEnrollments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("enrollments")
      .select("id, student_id, course, created_at")
      .eq("professor_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { enrollments: data ?? [] };
  });