import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { listRoomNotes, postRoomNote, voteRoomNote } from "@/lib/collab.functions";
import { ArrowUp, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/courses/$course/room")({
  head: ({ params }) => ({ meta: [{ title: `${decodeURIComponent(params.course)} room — LectureLoop` }] }),
  component: RoomPage,
  errorComponent: ({ error }) => <p className="p-8 text-sm text-destructive">{error.message}</p>,
  notFoundComponent: () => <p className="p-8">Not found</p>,
});

function RoomPage() {
  const { course } = Route.useParams();
  const courseName = decodeURIComponent(course);
  const listFn = useServerFn(listRoomNotes);
  const postFn = useServerFn(postRoomNote);
  const voteFn = useServerFn(voteRoomNote);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"note" | "quote" | "question">("note");

  const { data } = useQuery({ queryKey: ["room", courseName], queryFn: () => listFn({ data: { course: courseName } }) });

  const post = useMutation({
    mutationFn: () => postFn({ data: { course: courseName, content: text, kind } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["room", courseName] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const vote = useMutation({
    mutationFn: (vars: { noteId: string; value: boolean }) => voteFn({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room", courseName] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Users className="h-5 w-5" /> {courseName} · Course Room</h1>
        <p className="mt-1 text-sm text-muted-foreground">Anonymized notes, quotes and questions from your classmates. Upvote the best.</p>

        <form
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) post.mutate(); }}
          className="mt-6 space-y-2 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex gap-1">
            {(["note", "quote", "question"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1 text-xs capitalize ${kind === k ? "bg-foreground text-background" : "bg-muted"}`}
              >{k}</button>
            ))}
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Share with your classmates…" rows={3} maxLength={2000} />
          <Button type="submit" disabled={post.isPending}>Post anonymously</Button>
        </form>

        <div className="mt-6 space-y-2">
          {(data?.notes ?? []).map((n) => (
            <div key={n.id} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <button
                onClick={() => vote.mutate({ noteId: n.id, value: !n.voted })}
                className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs ${n.voted ? "bg-foreground text-background" : "bg-muted hover:bg-accent"}`}
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>{n.votes}</span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 capitalize">{n.kind}</span>
                  <span>{n.author_tag}{n.mine && " · you"}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{n.content}</p>
              </div>
            </div>
          ))}
          {(data?.notes ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">No posts yet. Be the first.</p>
          )}
        </div>
      </main>
    </div>
  );
}