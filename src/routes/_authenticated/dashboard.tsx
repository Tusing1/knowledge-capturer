import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listLectures } from "@/lib/lectures.functions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Mic, ChevronRight, Loader2, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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

  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const l of (data?.lectures ?? []) as any[]) for (const t of l.tags ?? []) s.add(t);
    return [...s].slice(0, 20);
  }, [data]);

  const visible = useMemo(() => {
    let arr = (data?.lectures ?? []) as any[];
    if (filter === "favorites") arr = arr.filter((l) => l.is_favorite);
    if (tagFilter) arr = arr.filter((l) => (l.tags ?? []).includes(tagFilter));
    return arr;
  }, [data, filter, tagFilter]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Your lectures</h1>
            <p className="mt-1 text-sm text-muted-foreground">All recordings, notes, and study material.</p>
          </div>
          <Button onClick={() => navigate({ to: "/record" })} size="sm">
            <Mic className="h-4 w-4" /> New
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all" && !tagFilter} onClick={() => { setFilter("all"); setTagFilter(null); }}>All</FilterChip>
          <FilterChip active={filter === "favorites"} onClick={() => { setFilter("favorites"); setTagFilter(null); }}>
            <Star className="h-3 w-3" /> Favorites
          </FilterChip>
          {allTags.map((t) => (
            <FilterChip key={t} active={tagFilter === t} onClick={() => { setTagFilter(tagFilter === t ? null : t); setFilter("all"); }}>
              #{t}
            </FilterChip>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">Failed to load lectures.</p>
          ) : visible.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground">No lectures yet.</p>
              <Button className="mt-4" onClick={() => navigate({ to: "/record" })}>
                <Mic className="h-4 w-4" /> Record your first lecture
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((l: any) => (
                <li key={l.id}>
                  <Link
                    to="/lectures/$lectureId"
                    params={{ lectureId: l.id }}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {l.is_favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />}
                        <p className="truncate font-medium">{l.title}</p>
                        <StatusBadge status={l.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {l.course ? `${l.course} · ` : ""}
                        {formatDistanceToNow(new Date(l.started_at), { addSuffix: true })}
                        {(l.tags ?? []).length > 0 && (
                          <span className="ml-2">· {(l.tags as string[]).map((t) => `#${t}`).join(" ")}</span>
                        )}
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

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
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