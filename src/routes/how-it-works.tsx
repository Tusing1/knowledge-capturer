import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, Zap, Sparkles, FileText, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How LectureLoop works" },
      { name: "description", content: "How LectureLoop turns a live lecture into structured notes, lecturer quotes, flashcards, and likely exam questions." },
      { property: "og:title", content: "How LectureLoop works" },
      { property: "og:description", content: "Rolling 3-minute slices, parallel transcription, and AI-stitched study material." },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h1>
        <p className="mt-3 text-muted-foreground">
          LectureLoop is a rolling recorder. It never stops listening between slices, so nothing the lecturer
          says falls through the cracks.
        </p>

        <ol className="mt-10 space-y-6">
          <Step n={1} icon={<Mic className="h-4 w-4" />} title="Press record">
            Open the recorder before class. We capture audio in two alternating 3-minute slices so there
            is zero gap when one slice ends and the next begins.
          </Step>
          <Step n={2} icon={<Zap className="h-4 w-4" />} title="Each slice transcribes in parallel">
            As soon as a slice closes, it is sent off to be transcribed in the background while the next
            slice is already recording. Your phone or laptop never has to wait.
          </Step>
          <Step n={3} icon={<Sparkles className="h-4 w-4" />} title="At the end, AI stitches everything">
            When you stop the lecture, the full transcript is fed to a study-notes model that produces
            sections + bullets, the lecturer's most important verbatim quotes, flashcards, and the
            questions your lecturer is most likely to ask in an exam.
          </Step>
          <Step n={4} icon={<FileText className="h-4 w-4" />} title="Review in clean tabs">
            Notes, quotes, likely questions, flashcards, and the full transcript — each on its own tab.
          </Step>
          <Step n={5} icon={<WifiOff className="h-4 w-4" />} title="Re-read anywhere, even offline">
            Anything you open is cached locally. Read on the bus, in the library, in airplane mode.
          </Step>
        </ol>

        <div className="mt-12 flex gap-3">
          <Button asChild size="lg"><Link to="/auth">Start free</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/pricing">See pricing</Link></Button>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function Step({ n, icon, title, children }: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Step {n}</p>
        <h3 className="mt-0.5 font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

export function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
      <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-foreground text-background">
          <Mic className="h-4 w-4" />
        </span>
        LectureLoop
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link to="/how-it-works" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">How it works</Link>
        <Link to="/pricing" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground">Pricing</Link>
        <Button asChild variant="outline" size="sm" className="ml-2">
          <Link to="/auth">Sign in</Link>
        </Button>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-border/60">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} LectureLoop</p>
        <nav className="flex gap-4">
          <Link to="/how-it-works" className="hover:text-foreground">How it works</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}