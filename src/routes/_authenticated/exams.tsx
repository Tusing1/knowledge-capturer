import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listExams, createExam, deleteExam } from "@/lib/learning.functions";
import { listLectures } from "@/lib/lectures.functions";
import { toast } from "sonner";
import { Calendar, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: [{ title: "Exams — LectureLoop" }] }),
  component: ExamsPage,
  errorComponent: ({ error }) => <p className="p-8 text-sm text-destructive">{error.message}</p>,
  notFoundComponent: () => <p className="p-8">Not found</p>,
});

function ExamsPage() {
  const listFn = useServerFn(listExams);
  const createFn = useServerFn(createExam);
  const delFn = useServerFn(deleteExam);
  const lecFn = useServerFn(listLectures);
  const qc = useQueryClient();
  const { data: exams } = useQuery({ queryKey: ["exams"], queryFn: () => listFn() });
  const { data: lectures } = useQuery({ queryKey: ["lectures"], queryFn: () => lecFn() });

  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [examDate, setExamDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const create = useMutation({
    mutationFn: () => createFn({ data: { title, course: course || undefined, examDate, lectureIds: [...selected] } }),
    onSuccess: () => {
      toast.success("Exam scheduled and reviews seeded");
      setTitle(""); setCourse(""); setExamDate(""); setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["reviews-due"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Calendar className="h-5 w-5" /> Exams</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set an exam date; we'll seed flashcards from those lectures into your review queue.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); if (title && examDate) create.mutate(); }}
          className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exam title" required />
            <Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Course (optional)" />
          </div>
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} required />
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            <p className="px-1 text-xs text-muted-foreground">Lectures to include:</p>
            {(lectures?.lectures ?? []).map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
                <input
                  type="checkbox"
                  checked={selected.has(l.id as string)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(l.id as string); else next.delete(l.id as string);
                    setSelected(next);
                  }}
                />
                <span className="truncate">{l.title}</span>
                {l.course && <span className="text-xs text-muted-foreground">· {l.course}</span>}
              </label>
            ))}
          </div>
          <Button type="submit" disabled={create.isPending}>Schedule exam</Button>
        </form>

        <div className="mt-6 space-y-2">
          {(exams?.exams ?? []).map((e) => {
            const daysLeft = Math.ceil((new Date(e.exam_date as string).getTime() - Date.now()) / 86400000);
            return (
              <div key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.course ? `${e.course} · ` : ""}{e.exam_date} · {daysLeft > 0 ? `${daysLeft} days` : "today"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(e.id as string)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}