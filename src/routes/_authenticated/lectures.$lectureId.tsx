import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getLecture, finalizeLecture, signChunkUrl } from "@/lib/lectures.functions";
import { toggleFavorite, setLectureTags, createShareLink } from "@/lib/extra.functions";
import { cacheLecture, readCachedLecture } from "@/lib/offline-cache";
import { AppHeader } from "@/components/app-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Loader2, RefreshCw, WifiOff, Star, Share2, Download, Copy, X, FileDown, Play } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/lectures/$lectureId")({
  head: () => ({ meta: [{ title: "Lecture — LectureLoop" }] }),
  component: LecturePage,
});

type Quote = { text: string; importance?: string; reason?: string };
type Note = { heading: string; bullets: string[] };
type Question = { question: string; why?: string };
type Flashcard = { q: string; a: string };

function LecturePage() {
  const { lectureId } = Route.useParams();
  const get = useServerFn(getLecture);
  const finalize = useServerFn(finalizeLecture);
  const favFn = useServerFn(toggleFavorite);
  const tagsFn = useServerFn(setLectureTags);
  const shareFn = useServerFn(createShareLink);
  const signUrl = useServerFn(signChunkUrl);
  const qc = useQueryClient();
  const [offline, setOffline] = useState(false);
  const [cached, setCached] = useState<any>(null);
  const [tagInput, setTagInput] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: () => get({ data: { lectureId } }),
    refetchInterval: (q) => {
      const d = q.state.data as { lecture?: { status?: string } } | undefined;
      return d?.lecture?.status === "processing" || d?.lecture?.status === "recording" ? 4000 : false;
    },
    retry: 1,
  });

  useEffect(() => {
    if (data) {
      cacheLecture(lectureId, data);
      setCached(data);
      setOffline(false);
    } else if (error) {
      readCachedLecture(lectureId).then((c) => {
        if (c) {
          setCached(c);
          setOffline(true);
        }
      });
    }
  }, [data, error, lectureId]);

  const view = (data ?? cached) as Awaited<ReturnType<typeof getLecture>> | null;

  if (isLoading && !view) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <p className="p-12 text-center text-sm text-destructive">Could not load this lecture.</p>
      </div>
    );
  }

  const { lecture, output } = view;
  const status = lecture?.status;
  const lectureAny = lecture as any;
  const isFav = !!lectureAny?.is_favorite;
  const tags: string[] = lectureAny?.tags ?? [];
  const shareId: string | null = lectureAny?.share_id ?? null;
  const shareUrl = shareId ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareId}` : null;

  const fav = useMutation({
    mutationFn: (value: boolean) => favFn({ data: { lectureId, value } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lecture", lectureId] }),
  });

  const saveTags = useMutation({
    mutationFn: (next: string[]) => tagsFn({ data: { lectureId, tags: next } }),
    onSuccess: () => {
      setTagInput("");
      qc.invalidateQueries({ queryKey: ["lecture", lectureId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Tag rejected"),
  });

  const share = useMutation({
    mutationFn: (enable: boolean) => shareFn({ data: { lectureId, enable } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["lecture", lectureId] });
      if (r.shareId) toast.success("Share link enabled");
      else toast.success("Share link disabled");
    },
  });

  function addTag() {
    const v = tagInput.trim();
    if (!v || tags.includes(v)) return;
    saveTags.mutate([...tags, v]);
  }
  function removeTag(t: string) {
    saveTags.mutate(tags.filter((x) => x !== t));
  }

  function exportMarkdown() {
    const md = buildMarkdown(lecture?.title ?? "Lecture", output);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(lecture?.title ?? "lecture").replace(/[^a-z0-9-_ ]/gi, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const pageH = doc.internal.pageSize.getHeight();
    let y = margin;
    const line = (text: string, size = 11, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, width);
      for (const l of lines) {
        if (y > pageH - margin) { doc.addPage(); y = margin; }
        doc.text(l, margin, y);
        y += size * 1.3;
      }
    };
    line(lecture?.title ?? "Lecture", 18, true);
    if (lecture?.course) line(lecture.course, 10);
    y += 6;
    if (output?.summary) { line("Summary", 13, true); line(output.summary); y += 6; }
    if (notes.length) {
      line("Notes", 13, true);
      for (const n of notes) {
        line(n.heading ?? "", 11, true);
        for (const b of n.bullets ?? []) line(`• ${b}`);
        y += 4;
      }
    }
    if (quotes.length) {
      line("Quotes", 13, true);
      for (const q of quotes) line(`" ${q.text} "`);
      y += 4;
    }
    if (questions.length) {
      line("Likely questions", 13, true);
      for (const q of questions) line(`• ${q.question}`);
      y += 4;
    }
    if (flashcards.length) {
      line("Flashcards", 13, true);
      for (const f of flashcards) { line(`Q: ${f.q}`, 11, true); line(`A: ${f.a}`); y += 4; }
    }
    doc.save(`${(lecture?.title ?? "lecture").replace(/[^a-z0-9-_ ]/gi, "_")}.pdf`);
  }

  async function retryFinalize() {
    try {
      await finalize({ data: { lectureId } });
      toast.success("Notes generated");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const notes = (output?.structured_notes ?? []) as Note[];
  const quotes = (output?.quotes ?? []) as Quote[];
  const questions = (output?.likely_questions ?? []) as Question[];
  const flashcards = (output?.flashcards ?? []) as Flashcard[];
  const allChunks = ((view as any)?.chunks ?? []) as Array<{
    id: string;
    index: number;
    transcript: string | null;
    storage_path: string;
  }>;
  const playableChunks = allChunks.filter((c) => c.storage_path && !c.storage_path.startsWith("ondevice/"));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All lectures
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{lecture?.title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {lecture?.course ? `${lecture.course} · ` : ""}status: {status}
              {offline && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-500">
                  <WifiOff className="h-3 w-3" /> offline
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fav.mutate(!isFav)}
              aria-label={isFav ? "Unfavorite" : "Favorite"}
            >
              <Star className={isFav ? "h-4 w-4 fill-amber-500 text-amber-500" : "h-4 w-4"} />
            </Button>
            {status === "failed" && (
              <Button variant="outline" onClick={retryFinalize}>
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            )}
            {status === "ready" && (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link to="/lectures/$lectureId/study" params={{ lectureId }}>
                    <BookOpen className="h-4 w-4" /> Study
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportMarkdown}>
                      <FileDown className="h-4 w-4" /> Markdown (.md)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportPdf}>
                      <FileDown className="h-4 w-4" /> PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={() => share.mutate(!shareId)}>
                  <Share2 className="h-4 w-4" /> {shareId ? "Unshare" : "Share"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs">
              {t}
              <button onClick={() => removeTag(t)} aria-label={`Remove ${t}`} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <form
            onSubmit={(e) => { e.preventDefault(); addTag(); }}
            className="inline-flex items-center"
          >
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="+ add tag"
              className="h-7 w-32 text-xs"
            />
          </form>
        </div>

        {shareUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate">{shareUrl}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        )}

        {status === "processing" && (
          <div className="mt-6 flex items-center gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Building notes, quotes, flashcards, and likely questions…
          </div>
        )}

        {output?.summary && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
            <p className="mt-2 text-sm leading-relaxed">{output.summary}</p>
          </div>
        )}

        {output && (
          <Tabs defaultValue="notes" className="mt-6">
            <TabsList>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="questions">Likely Questions</TabsTrigger>
              <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="mt-4 space-y-4">
              {notes.length === 0 ? (
                <Empty>No notes yet.</Empty>
              ) : (
                notes.map((n, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5">
                    <h3 className="font-semibold">{n.heading}</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {(n.bullets ?? []).map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="quotes" className="mt-4 space-y-3">
              {quotes.length === 0 ? (
                <Empty>No quotes captured.</Empty>
              ) : (
                quotes.map((q, i) => (
                  <blockquote key={i} className="rounded-xl border-l-4 border-amber-500 bg-card p-4">
                    <p className="text-sm italic">"{q.text}"</p>
                    {q.reason && <p className="mt-2 text-xs text-muted-foreground">{q.reason}</p>}
                    {q.importance && (
                      <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                        {q.importance} priority
                      </span>
                    )}
                  </blockquote>
                ))
              )}
            </TabsContent>

            <TabsContent value="questions" className="mt-4 space-y-3">
              {questions.length === 0 ? (
                <Empty>No predicted questions yet.</Empty>
              ) : (
                questions.map((q, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4">
                    <p className="font-medium">{q.question}</p>
                    {q.why && <p className="mt-1 text-xs text-muted-foreground">{q.why}</p>}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="flashcards" className="mt-4 grid gap-3 sm:grid-cols-2">
              {flashcards.length === 0 ? (
                <Empty>No flashcards yet.</Empty>
              ) : (
                flashcards.map((f, i) => <Flashcard key={i} q={f.q} a={f.a} />)
              )}
            </TabsContent>

            <TabsContent value="transcript" className="mt-4">
              {playableChunks.length > 0 && (
                <div className="mb-4 space-y-2">
                  {playableChunks.map((c) => (
                    <ChunkPlayer
                      key={c.id}
                      chunkId={c.id}
                      index={c.index}
                      transcript={c.transcript ?? ""}
                      onSign={() => signUrl({ data: { chunkId: c.id } }).then((r) => r.url)}
                    />
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-border bg-card p-5">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">{output.full_transcript}</pre>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

function buildMarkdown(title: string, output: any): string {
  if (!output) return `# ${title}\n\n(no notes yet)\n`;
  const lines: string[] = [`# ${title}`, ""];
  if (output.summary) lines.push("## Summary", output.summary, "");
  if (Array.isArray(output.structured_notes) && output.structured_notes.length) {
    lines.push("## Notes");
    for (const n of output.structured_notes) {
      lines.push(`### ${n.heading ?? ""}`);
      for (const b of n.bullets ?? []) lines.push(`- ${b}`);
      lines.push("");
    }
  }
  if (Array.isArray(output.quotes) && output.quotes.length) {
    lines.push("## Quotes");
    for (const q of output.quotes) lines.push(`> ${q.text}`, "");
  }
  if (Array.isArray(output.likely_questions) && output.likely_questions.length) {
    lines.push("## Likely questions");
    for (const q of output.likely_questions) lines.push(`- ${q.question}`);
    lines.push("");
  }
  if (Array.isArray(output.flashcards) && output.flashcards.length) {
    lines.push("## Flashcards");
    for (const f of output.flashcards) lines.push(`- **Q:** ${f.q}  \n  **A:** ${f.a}`);
    lines.push("");
  }
  return lines.join("\n");
}

function Flashcard({ q, a }: { q: string; a: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      className="min-h-32 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {flipped ? "Answer" : "Question"} · tap to flip
      </p>
      <p className="mt-2 text-sm">{flipped ? a : q}</p>
    </button>
  );
}