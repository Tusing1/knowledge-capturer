import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader, PublicFooter } from "./how-it-works";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — LectureLoop" },
      { name: "description", content: "Simple pricing for students. Start free, upgrade when you need unlimited lectures." },
      { property: "og:title", content: "LectureLoop pricing" },
      { property: "og:description", content: "Free for short lectures. Pro for unlimited recording, longer classes, and exports." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing</h1>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade if a full semester piles up.</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Tier
            name="Free"
            price="$0"
            tagline="Perfect to try a lecture this week."
            features={[
              "Up to 3 lectures per month",
              "Lectures up to 60 minutes",
              "Notes, quotes, flashcards, likely questions",
              "Offline review of opened lectures",
            ]}
            cta="Start free"
          />
          <Tier
            name="Pro"
            price="$6"
            priceSuffix="/month"
            tagline="For students recording every class."
            highlight
            features={[
              "Unlimited lectures",
              "Lectures up to 4 hours",
              "Course grouping & search",
              "Export notes & flashcards",
              "Priority transcription",
            ]}
            cta="Get Pro"
          />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Pricing shown is indicative. Payments aren't enabled yet — you can start free now and we'll let you know when Pro launches.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}

function Tier({
  name, price, priceSuffix, tagline, features, cta, highlight,
}: {
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 ${highlight ? "border-foreground bg-card" : "border-border bg-card"}`}>
      <p className="text-sm font-medium text-muted-foreground">{name}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {price}<span className="text-base font-normal text-muted-foreground">{priceSuffix}</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
      <ul className="mt-5 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" /> {f}
          </li>
        ))}
      </ul>
      <Button asChild className="mt-6 w-full" variant={highlight ? "default" : "outline"}>
        <Link to="/auth">{cta}</Link>
      </Button>
    </div>
  );
}