import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, Sparkles, Zap, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LectureLoop — Never miss what your lecturer said" },
      {
        name: "description",
        content:
          "LectureLoop records your lectures, transcribes in parallel rolling chunks, and turns the whole class into structured notes, quotes, flashcards, and likely exam questions.",
      },
      { property: "og:title", content: "LectureLoop" },
      {
        property: "og:description",
        content:
          "Rolling-chunk lecture recorder that builds notes, quotes, and flashcards while you listen.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-foreground text-background">
            <Mic className="h-4 w-4" />
          </span>
          LectureLoop
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-12 sm:pt-20">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Never be caught off-guard in class again.
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
          LectureLoop listens to your lecture in rolling 3-minute slices, transcribes each one in parallel, then stitches
          everything into <span className="text-foreground">notes, lecturer quotes, flashcards, and the questions your lecturer is most likely to ask</span>.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          <Feature icon={<Zap className="h-4 w-4" />} title="Rolling 3-minute slices">
            Two recorders alternate so there's zero gap. Transcription runs while the next slice is already capturing.
          </Feature>
          <Feature icon={<Sparkles className="h-4 w-4" />} title="Notes + quotes + cards">
            When you stop, the AI compiles structured notes, the lecturer's most important verbatim quotes, flashcards, and likely exam questions.
          </Feature>
          <Feature icon={<WifiOff className="h-4 w-4" />} title="Reviewed offline">
            Anything you've opened is cached locally — re-read on the bus, in the library, anywhere.
          </Feature>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">{icon}</div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
