import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Mic, Sparkles, Zap, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-5 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-foreground text-background">
            <Mic className="h-4 w-4" />
          </span>
          <span className="truncate">LectureLoop</span>
        </div>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          <Link to="/how-it-works" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">How it works</Link>
          <Link to="/pricing" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">Pricing</Link>
          <Button asChild variant="outline" size="sm" className="ml-2">
            <Link to="/auth">Sign in</Link>
          </Button>
        </nav>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="sm:hidden" onClick={() => setMenuOpen(true)}>
          <Menu className="h-4 w-4" />
        </Button>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <div className="flex h-full flex-col">
            <div className="border-b border-border/60 px-4 py-3">
              <SheetTitle className="flex items-center gap-2 text-base">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
                  <Mic className="h-3.5 w-3.5" />
                </span>
                LectureLoop
              </SheetTitle>
            </div>
            <nav className="flex-1 p-2">
              <Link to="/how-it-works" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-accent">How it works</Link>
              <Link to="/pricing" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-accent">Pricing</Link>
              <Link to="/privacy" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-accent">Privacy</Link>
            </nav>
            <div className="border-t border-border/60 p-3">
              <Button asChild className="w-full" onClick={() => setMenuOpen(false)}>
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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

      <footer className="mt-8 border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} LectureLoop</p>
          <nav className="flex gap-4">
            <Link to="/how-it-works" className="hover:text-foreground">How it works</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </nav>
        </div>
      </footer>
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
