import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, Mic, Sparkles, Zap, WifiOff, ArrowRight, Brain, Quote, Users } from "lucide-react";
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-[oklch(0.72_0.22_305)] opacity-30 blur-3xl animate-blob" />
        <div className="absolute -right-24 top-40 h-[22rem] w-[22rem] rounded-full bg-[oklch(0.88_0.22_130)] opacity-30 blur-3xl animate-blob" style={{ animationDelay: "-4s" }} />
        <div className="absolute left-1/3 top-[28rem] h-[20rem] w-[20rem] rounded-full bg-[oklch(0.78_0.22_25)] opacity-25 blur-3xl animate-blob" style={{ animationDelay: "-8s" }} />
      </div>

      <header className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-5 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-hero text-primary-foreground shadow-lg animate-pulse-ring">
            <Mic className="h-4 w-4" />
          </span>
          <span className="truncate text-lg">LectureLoop</span>
        </div>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          <Link to="/how-it-works" className="story-link rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">How it works</Link>
          <Link to="/pricing" className="story-link rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">Pricing</Link>
          <Button asChild size="sm" className="ml-2 gradient-hero text-primary-foreground border-0 shadow-md hover:opacity-90">
            <Link to="/auth">Sign in <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
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
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[oklch(0.78_0.22_25)] animate-pulse" />
            Built for students who don't want to miss a single word
          </span>
          <h1 className="mt-5 text-balance text-5xl font-bold tracking-tight sm:text-7xl">
            Never be caught{" "}
            <span className="text-gradient">off-guard</span>
            <br className="hidden sm:block" /> in class again.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            LectureLoop listens in rolling 3-minute slices, transcribes them in parallel, then stitches the whole class into{" "}
            <span className="font-semibold text-foreground">notes, quotes, flashcards, and the questions your lecturer is most likely to ask</span>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gradient-hero text-primary-foreground border-0 shadow-xl hover:scale-105 transition-transform">
              <Link to="/auth">Start free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 hover-scale">
              <Link to="/how-it-works">See how it works</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[oklch(0.88_0.22_130)]" /> Free to start</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[oklch(0.72_0.22_305)]" /> No card required</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[oklch(0.78_0.22_25)]" /> Works offline</span>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          <Feature tint="violet" icon={<Zap className="h-5 w-5" />} title="Rolling 3-min slices">
            Two recorders alternate so there's zero gap. Transcription runs while the next slice is already capturing.
          </Feature>
          <Feature tint="lime" icon={<Sparkles className="h-5 w-5" />} title="Notes + quotes + cards">
            When you stop, AI compiles structured notes, verbatim quotes, flashcards, and likely exam questions.
          </Feature>
          <Feature tint="coral" icon={<WifiOff className="h-5 w-5" />} title="Reviewed offline">
            Anything you've opened is cached locally — re-read on the bus, in the library, anywhere.
          </Feature>
          <Feature tint="lime" icon={<Brain className="h-5 w-5" />} title="Spaced repetition">
            Struggling flashcards resurface on an Anki-style schedule that adapts to you.
          </Feature>
          <Feature tint="violet" icon={<Users className="h-5 w-5" />} title="Course rooms">
            Study with classmates — share notes, compare flashcards, ask the prof.
          </Feature>
          <Feature tint="coral" icon={<Quote className="h-5 w-5" />} title="Citation catcher">
            Lecturer mentions a paper? It's flagged and pre-formatted automatically.
          </Feature>
        </div>
      </main>

      <footer className="relative mt-8 border-t border-border/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} LectureLoop</p>
          <nav className="flex gap-4">
            <Link to="/how-it-works" className="story-link hover:text-foreground">How it works</Link>
            <Link to="/pricing" className="story-link hover:text-foreground">Pricing</Link>
            <Link to="/privacy" className="story-link hover:text-foreground">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, children, tint }: { icon: React.ReactNode; title: string; children: React.ReactNode; tint: "violet" | "lime" | "coral" }) {
  const tints: Record<string, string> = {
    violet: "bg-[oklch(0.72_0.22_305)]",
    lime: "bg-[oklch(0.88_0.22_130)] text-[oklch(0.2_0.05_280)]",
    coral: "bg-[oklch(0.78_0.22_25)]",
  };
  return (
    <div className="hover-lift group rounded-2xl border border-border bg-card/80 p-6 backdrop-blur">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground shadow-md transition-transform group-hover:rotate-6 ${tints[tint]}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
