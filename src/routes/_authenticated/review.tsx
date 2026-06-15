import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { getDueReviews, gradeReview } from "@/lib/learning.functions";
import { Loader2, Brain } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Review — LectureLoop" }, { name: "description", content: "Spaced repetition flashcard review" }] }),
  component: ReviewPage,
  errorComponent: ({ error }) => <p className="p-8 text-sm text-destructive">{error.message}</p>,
  notFoundComponent: () => <p className="p-8">Not found</p>,
});

function ReviewPage() {
  const get = useServerFn(getDueReviews);
  const grade = useServerFn(gradeReview);
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["reviews-due"], queryFn: () => get() });

  const m = useMutation({
    mutationFn: (vars: { reviewId: string; quality: number }) => grade({ data: vars }),
    onSuccess: () => {
      setRevealed(false);
      qc.invalidateQueries({ queryKey: ["reviews-due"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const cards = data?.reviews ?? [];
  const card = cards[0];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Brain className="h-5 w-5" /> Daily review</h1>
        <p className="mt-1 text-sm text-muted-foreground">Spaced repetition keeps the cards you struggle with closer at hand.</p>

        {isLoading && <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
        {!isLoading && cards.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            All caught up. Come back tomorrow.
          </div>
        )}
        {card && (
          <div className="mt-6 space-y-4">
            <div className="text-xs text-muted-foreground">{cards.length} due · from <span className="font-medium text-foreground">{card.lecture_title}</span></div>
            <div className="min-h-48 rounded-2xl border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Question</p>
              <p className="mt-2 text-lg">{card.front}</p>
              {revealed && (
                <>
                  <p className="mt-6 text-xs uppercase tracking-wide text-muted-foreground">Answer</p>
                  <p className="mt-2 text-base">{card.back}</p>
                </>
              )}
            </div>
            {!revealed ? (
              <Button className="w-full" onClick={() => setRevealed(true)}>Show answer</Button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                <Button variant="destructive" disabled={m.isPending} onClick={() => m.mutate({ reviewId: card.id, quality: 1 })}>Again</Button>
                <Button variant="outline" disabled={m.isPending} onClick={() => m.mutate({ reviewId: card.id, quality: 3 })}>Hard</Button>
                <Button variant="outline" disabled={m.isPending} onClick={() => m.mutate({ reviewId: card.id, quality: 4 })}>Good</Button>
                <Button disabled={m.isPending} onClick={() => m.mutate({ reviewId: card.id, quality: 5 })}>Easy</Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}