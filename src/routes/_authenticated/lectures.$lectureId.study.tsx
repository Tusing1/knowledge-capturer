import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getLecture } from "@/lib/lectures.functions";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2, RotateCcw, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/lectures/$lectureId/study")({
  head: () => ({ meta: [{ title: "Study — LectureLoop" }] }),
  component: StudyPage,
});

type Flashcard = { q: string; a: string };
type Question = { question: string; why?: string };

function StudyPage() {
  const { lectureId } = Route.useParams();
  const get = useServerFn(getLecture);
  const { data, isLoading } = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: () => get({ data: { lectureId } }),
  });

  const cards = useMemo<Flashcard[]>(() => (data?.output?.flashcards as Flashcard[]) ?? [], [data]);
  const questions = useMemo<Question[]>(
    () => (data?.output?.likely_questions as Question[]) ?? [],
    [data],
  );

  const [tab, setTab] = useState<"cards" | "quiz">("cards");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Link
          to="/lectures/$lectureId"
          params={{ lectureId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to lecture
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Study mode</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data?.lecture?.title}</p>

        <div className="mt-5 flex gap-2">
          <Button variant={tab === "cards" ? "default" : "outline"} size="sm" onClick={() => setTab("cards")}>
            Flashcards ({cards.length})
          </Button>
          <Button variant={tab === "quiz" ? "default" : "outline"} size="sm" onClick={() => setTab("quiz")}>
            Likely questions ({questions.length})
          </Button>
        </div>

        {isLoading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : tab === "cards" ? (
          <FlashcardDeck cards={cards} />
        ) : (
          <QuizList questions={questions} />
        )}
      </main>
    </div>
  );
}

function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  if (cards.length === 0) {
    return <Empty>No flashcards available for this lecture.</Empty>;
  }

  const card = cards[i];
  function next() {
    setFlipped(false);
    setI((p) => (p + 1) % cards.length);
  }
  function mark(ok: boolean) {
    setKnown((s) => {
      const n = new Set(s);
      if (ok) n.add(i);
      else n.delete(i);
      return n;
    });
    next();
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{i + 1} / {cards.length}</span>
        <span>{known.size} marked known</span>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="grid min-h-64 w-full place-items-center rounded-2xl border border-border bg-card p-8 text-center transition-colors hover:bg-accent"
      >
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {flipped ? "Answer" : "Question"} · tap to flip
          </p>
          <p className="mt-3 text-lg leading-relaxed">{flipped ? card.a : card.q}</p>
        </div>
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="outline" onClick={() => mark(false)}>
          <X className="h-4 w-4" /> Again
        </Button>
        <Button variant="outline" onClick={next}>
          <RotateCcw className="h-4 w-4" /> Skip
        </Button>
        <Button onClick={() => mark(true)}>
          <Check className="h-4 w-4" /> Got it
        </Button>
      </div>
    </div>
  );
}

function QuizList({ questions }: { questions: Question[] }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  if (questions.length === 0) return <Empty>No predicted questions for this lecture.</Empty>;

  function toggle(i: number) {
    setRevealed((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  }

  return (
    <div className="mt-6 space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <p className="font-medium">{i + 1}. {q.question}</p>
          {revealed.has(i) && q.why && (
            <p className="mt-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">{q.why}</p>
          )}
          {q.why && (
            <button
              type="button"
              onClick={() => toggle(i)}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              {revealed.has(i) ? "Hide hint" : "Show hint"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-10 rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}