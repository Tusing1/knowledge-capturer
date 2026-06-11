import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLectures } from "@/lib/lectures.functions";
import { AppHeader } from "@/components/app-header";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/courses/$course")({
  head: () => ({ meta: [{ title: "Course — LectureLoop" }] }),
  component: CourseDetailPage,
});

function CourseDetailPage() {
  const { course } = Route.useParams();
  const decoded = decodeURIComponent(course);
  const list = useServerFn(listLectures);
  const { data, isLoading } = useQuery({ queryKey: ["lectures"], queryFn: () => list() });

  const lectures = (data?.lectures ?? []).filter((l) => {
    const k = l.course?.trim() || "Uncategorized";
    return k === decoded;
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/_authenticated/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All courses
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{decoded}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lectures.length} lecture{lectures.length === 1 ? "" : "s"}</p>

        <div className="mt-6 rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : lectures.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">No lectures in this course.</p>
          ) : (
            <ul className="divide-y divide-border">
              {lectures.map((l) => (
                <li key={l.id}>
                  <Link
                    to="/_authenticated/lectures/$lectureId"
                    params={{ lectureId: l.id }}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(l.started_at), { addSuffix: true })} · {l.status}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
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