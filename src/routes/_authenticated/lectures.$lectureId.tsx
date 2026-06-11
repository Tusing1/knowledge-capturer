import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getLecture, finalizeLecture } from "@/lib/lectures.functions";
import { cacheLecture, readCachedLecture } from "@/lib/offline-cache";
import { AppHeader } from "@/components/app-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";

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
  const [offline, setOffline] = useState(false);
  const [cached, setCached] = useState<any>(null);

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/_authenticated/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All lectures
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
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
          {status === "failed" && (
            <Button variant="outline" onClick={retryFinalize}>
              <RefreshCw className="h-4 w-4" /> Retry notes
            </Button>
          )}
        </div>

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