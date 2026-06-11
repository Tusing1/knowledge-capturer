import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { listLectures } from "@/lib/lectures.functions";
import { AppHeader } from "@/components/app-header";
import { BookOpen, ChevronRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({ meta: [{ title: "Courses — LectureLoop" }] }),
  component: CoursesPage,
});

function CoursesPage() {
  const list = useServerFn(listLectures);
  const { data, isLoading } = useQuery({ queryKey: ["lectures"], queryFn: () => list() });

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of data?.lectures ?? []) {
      const key = l.course?.trim() || "Uncategorized";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your lectures grouped by course.</p>

        <div className="mt-6 rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : grouped.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">No lectures yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {grouped.map(([course, count]) => (
                <li key={course}>
                  <Link
                    to="/_authenticated/courses/$course"
                    params={{ course: encodeURIComponent(course) }}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-md bg-muted">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium">{course}</p>
                        <p className="text-xs text-muted-foreground">{count} lecture{count === 1 ? "" : "s"}</p>
                      </div>
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