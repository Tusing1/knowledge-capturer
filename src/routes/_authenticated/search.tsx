import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { searchLectures } from "@/lib/extra.functions";
import { AppHeader } from "@/components/app-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Loader2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search — LectureLoop" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const search = useServerFn(searchLectures);
  const m = useMutation({ mutationFn: (query: string) => search({ data: { q: query } }) });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Find lectures by title, course, or transcript content.</p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) m.mutate(q.trim());
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. mitochondria, lecture 4, prof Smith…"
            autoFocus
          />
          <Button type="submit" disabled={m.isPending || !q.trim()}>
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
            Search
          </Button>
        </form>

        <div className="mt-6 space-y-2">
          {m.data?.lectures.length === 0 && (
            <p className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              No results.
            </p>
          )}
          {m.data?.lectures.map((l) => {
            const inTranscript = m.data!.transcriptHits.includes(l.id);
            return (
              <Link
                key={l.id}
                to="/lectures/$lectureId"
                params={{ lectureId: l.id }}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.course ?? "Uncategorized"}
                    {inTranscript && (
                      <span className="ml-2 inline-flex items-center gap-1 text-foreground">
                        <FileText className="h-3 w-3" /> match in transcript
                      </span>
                    )}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}