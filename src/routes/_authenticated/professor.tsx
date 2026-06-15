import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { becomeProfessor, myRoles, enrollStudent, listMyEnrollments } from "@/lib/collab.functions";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/professor")({
  head: () => ({ meta: [{ title: "Professor mode — LectureLoop" }] }),
  component: ProfPage,
  errorComponent: ({ error }) => <p className="p-8 text-sm text-destructive">{error.message}</p>,
  notFoundComponent: () => <p className="p-8">Not found</p>,
});

function ProfPage() {
  const rolesFn = useServerFn(myRoles);
  const becomeFn = useServerFn(becomeProfessor);
  const enrollFn = useServerFn(enrollStudent);
  const listFn = useServerFn(listMyEnrollments);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [course, setCourse] = useState("");

  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: () => rolesFn() });
  const isProf = roles?.roles.includes("professor");

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments"],
    queryFn: () => listFn(),
    enabled: !!isProf,
  });

  const become = useMutation({
    mutationFn: () => becomeFn(),
    onSuccess: () => { toast.success("You're now a professor"); qc.invalidateQueries({ queryKey: ["my-roles"] }); },
  });

  const enroll = useMutation({
    mutationFn: () => enrollFn({ data: { studentEmail: email, course } }),
    onSuccess: () => { toast.success("Student enrolled"); setEmail(""); qc.invalidateQueries({ queryKey: ["enrollments"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><GraduationCap className="h-5 w-5" /> Professor mode</h1>
        <p className="mt-1 text-sm text-muted-foreground">Record lectures and push structured notes to your enrolled students.</p>

        {!isProf ? (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <p className="text-sm">Enable professor mode for your account. Free to switch back later.</p>
            <Button className="mt-3" onClick={() => become.mutate()} disabled={become.isPending}>Become a professor</Button>
          </div>
        ) : (
          <>
            <form
              onSubmit={(e) => { e.preventDefault(); if (email && course) enroll.mutate(); }}
              className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4"
            >
              <p className="text-sm font-medium">Enroll a student</p>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@university.edu" required />
              <Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Course code (e.g. CS101)" required />
              <Button type="submit" disabled={enroll.isPending}>Enroll</Button>
            </form>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium">Your roster</p>
              {(enrollments?.enrollments ?? []).map((en) => (
                <div key={en.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{(en.student_id as string).slice(0, 8)}…</span>
                  <span className="text-muted-foreground">{en.course}</span>
                </div>
              ))}
              {(enrollments?.enrollments ?? []).length === 0 && (
                <p className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">No students yet.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}