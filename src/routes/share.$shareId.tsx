import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSharedLecture } from "@/lib/extra.functions";
import { Mic, Loader2 } from "lucide-react";

export const Route = createFileRoute("/share/$shareId")({
  head: ({ params }) => ({
    meta: [
      { title: "Shared lecture — LectureLoop" },
      { name: "description", content: "View shared lecture notes, quotes, and study material." },
      { property: "og:title", content: "Shared lecture notes" },
    ],
  }),
  component: SharedLecture,
});

type Note = { heading: string; bullets: string[] };
type Quote = { text: string; importance?: string; reason?: string };
type Question = { question: string; why?: string };
type Flashcard = { q: string; a: string };

function SharedLecture() {
  const { shareId } = Route.useParams();
  const fn = useServerFn(getSharedLecture);
  const { data, isLoading } = useQuery({
    queryKey: ["shared", shareId],
    queryFn: () => fn({ data: { shareId } }),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!data?.lecture) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        This link is invalid or was revoked.
      </div>
    );
  }

  const { lecture, output } = data;
  const notes = (output?.structured_notes ?? []) as Note[];
  const quotes = (output?.quotes ?? []) as Quote[];
  const questions = (output?.likely_questions ?? []) as Question[];
  const flashcards = (output?.flashcards ?? []) as Flashcard[];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
              <Mic className="h-3.5 w-3.5" />
            </span>
            LectureLoop
          </Link>
          <Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-xs text-muted-foreground">Shared lecture</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{lecture.title}</h1>
        {lecture.course && <p className="mt-1 text-sm text-muted-foreground">{lecture.course}</p>}

        {output?.summary && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
            <p className="mt-2 text-sm leading-relaxed">{output.summary}</p>
          </div>
        )}

        <Section title="Notes">
          {notes.map((n, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold">{n.heading}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {(n.bullets ?? []).map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </Section>

        <Section title="Quotes">
          {quotes.map((q, i) => (
            <blockquote key={i} className="rounded-xl border-l-4 border-amber-500 bg-card p-4">
              <p className="text-sm italic">"{q.text}"</p>
            </blockquote>
          ))}
        </Section>

        <Section title="Likely questions">
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium">{q.question}</p>
            </div>
          ))}
        </Section>

        <Section title="Flashcards">
          <div className="grid gap-3 sm:grid-cols-2">
            {flashcards.map((f, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Q</p>
                <p className="mt-1 text-sm">{f.q}</p>
                <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">A</p>
                <p className="mt-1 text-sm">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>

        <footer className="mt-12 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          Made with LectureLoop ·{" "}
          <Link to="/" className="underline-offset-4 hover:underline">Create your own</Link>
        </footer>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const empty = Array.isArray(children) ? children.length === 0 : !children;
  if (empty) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}