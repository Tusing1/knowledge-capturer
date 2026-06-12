import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLectures } from "@/lib/lectures.functions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Mic, ChevronRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Your lectures — LectureLoop" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const list = useServerFn(listLectures);
  const { data, isLoading, error } = useQuery({
    queryKey: ["lectures"],
    queryFn: () => list(),
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your lectures</h1>
            <p className="mt-1 text-sm text-muted-foreground">All recordings, notes, and study material in one place.</p>
          </div>
          <Button onClick={() => navigate({ to: "/record" })}>
            <Mic className="h-4 w-4" /> New lecture
          </Button>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">Failed to load lectures.</p>
          ) : (data?.lectures ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">No lectures yet.</p>
              <Button className="mt-4" onClick={() => navigate({ to: "/record" })}>
                <Mic className="h-4 w-4" /> Record your first lecture
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data!.lectures.map((l) => (
                <li key={l.id}>
                  <Link
                    to="/lectures/$lectureId"
                    params={{ lectureId: l.id }}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{l.title}</p>
                        <StatusBadge status={l.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {l.course ? `${l.course} · ` : ""}
                        {formatDistanceToNow(new Date(l.started_at), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    recording: "bg-red-500/15 text-red-600 dark:text-red-400",
    processing: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    failed: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${styles[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}