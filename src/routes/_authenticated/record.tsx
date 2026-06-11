import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  startLecture,
  registerChunk,
  transcribeChunk,
  endLecture,
  finalizeLecture,
} from "@/lib/lectures.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Square, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/record")({
  head: () => ({ meta: [{ title: "Record lecture — LectureLoop" }] }),
  component: RecordPage,
});

const CHUNK_MS = 3 * 60 * 1000; // 3 minutes

type ChunkUiState = {
  index: number;
  status: "uploading" | "transcribing" | "done" | "failed";
  preview?: string;
};

function RecordPage() {
  const navigate = useNavigate();
  const start = useServerFn(startLecture);
  const register = useServerFn(registerChunk);
  const transcribe = useServerFn(transcribeChunk);
  const end = useServerFn(endLecture);
  const finalize = useServerFn(finalizeLecture);

  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [lectureId, setLectureId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [chunks, setChunks] = useState<ChunkUiState[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [finalizing, setFinalizing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recordersRef = useRef<MediaRecorder[]>([]);
  const activeRef = useRef(0);
  const indexRef = useRef(0);
  const userIdRef = useRef<string | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lectureIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null;
    });
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAll() {
    if (cycleTimerRef.current) clearInterval(cycleTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    recordersRef.current.forEach((r) => {
      try {
        if (r.state !== "inactive") r.stop();
      } catch {
        /* ignore */
      }
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recordersRef.current = [];
  }

  function pickMime(): string {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
    }
    return "audio/webm";
  }

  async function handleStart() {
    if (!title.trim()) {
      toast.error("Give your lecture a title first.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const { lectureId: id } = await start({ data: { title: title.trim(), course: course.trim() || undefined } });
      setLectureId(id);
      lectureIdRef.current = id;
      setRecording(true);
      setChunks([]);
      indexRef.current = 0;
      activeRef.current = 0;

      const mime = pickMime();
      // Two recorders sharing one stream; alternate every CHUNK_MS.
      recordersRef.current = [makeRecorder(stream, mime), makeRecorder(stream, mime)];
      recordersRef.current[0].start();

      const startedAt = Date.now();
      elapsedTimerRef.current = setInterval(() => setElapsed(Date.now() - startedAt), 1000);

      cycleTimerRef.current = setInterval(() => {
        const current = recordersRef.current[activeRef.current];
        const next = recordersRef.current[1 - activeRef.current];
        try {
          next.start();
        } catch {
          /* ignore */
        }
        try {
          if (current.state === "recording") current.stop();
        } catch {
          /* ignore */
        }
        activeRef.current = 1 - activeRef.current;
      }, CHUNK_MS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start recording");
      stopAll();
      setRecording(false);
    }
  }

  function makeRecorder(stream: MediaStream, mime: string): MediaRecorder {
    const rec = new MediaRecorder(stream, { mimeType: mime });
    const parts: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) parts.push(e.data);
    };
    rec.onstop = async () => {
      const blob = new Blob(parts, { type: mime });
      parts.length = 0;
      if (blob.size < 1000) return; // skip empty
      const idx = indexRef.current++;
      await handleChunkBlob(blob, mime, idx);
    };
    return rec;
  }

  async function handleChunkBlob(blob: Blob, mime: string, index: number) {
    const userId = userIdRef.current;
    const lectureId = lectureIdRef.current;
    if (!userId || !lectureId) return;
    setChunks((c) => [...c, { index, status: "uploading" }]);
    try {
      const ext = mime.includes("webm") ? "webm" : mime.includes("mp4") ? "m4a" : "audio";
      const path = `${userId}/${lectureId}/${index}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("lecture-audio")
        .upload(path, blob, { contentType: mime, upsert: true });
      if (upErr) throw new Error(upErr.message);

      const { chunkId } = await register({
        data: { lectureId, index, storagePath: path, durationMs: CHUNK_MS, mimeType: mime },
      });

      setChunks((c) => c.map((x) => (x.index === index ? { ...x, status: "transcribing" } : x)));
      const res = await transcribe({ data: { chunkId } });
      setChunks((c) =>
        c.map((x) =>
          x.index === index
            ? { ...x, status: "done", preview: (res.transcript || "").slice(0, 180) }
            : x,
        ),
      );
    } catch (err) {
      setChunks((c) => c.map((x) => (x.index === index ? { ...x, status: "failed" } : x)));
      toast.error(`Chunk ${index + 1}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  async function handleStop() {
    const id = lectureIdRef.current;
    if (!id) return;
    setRecording(false);
    setFinalizing(true);
    stopAll();
    // Wait briefly for last onstop handlers
    await new Promise((r) => setTimeout(r, 800));
    // Wait for all chunks to finish processing
    await waitForChunks();

    try {
      await end({ data: { lectureId: id } });
      await finalize({ data: { lectureId: id } });
      toast.success("Lecture notes ready");
      navigate({ to: "/_authenticated/lectures/$lectureId", params: { lectureId: id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Finalize failed");
      setFinalizing(false);
    }
  }

  async function waitForChunks() {
    // Poll local state
    for (let i = 0; i < 60; i++) {
      const pending = chunkStatesRef.current.some((c) => c.status === "uploading" || c.status === "transcribing");
      if (!pending) return;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Keep a ref mirror of chunks for the polling loop
  const chunkStatesRef = useRef<ChunkUiState[]>([]);
  useEffect(() => {
    chunkStatesRef.current = chunks;
  }, [chunks]);

  const minutes = Math.floor(elapsed / 60000).toString().padStart(2, "0");
  const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, "0");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Record a lecture</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We capture the audio in rolling 3-minute slices, transcribe them in parallel, then stitch everything into notes when you stop.
        </p>

        {!recording && !lectureId && (
          <div className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="space-y-1">
              <Label htmlFor="title">Lecture title</Label>
              <Input id="title" placeholder="e.g. Calculus II — Series convergence" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="course">Course (optional)</Label>
              <Input id="course" placeholder="e.g. MATH 202" value={course} onChange={(e) => setCourse(e.target.value)} />
            </div>
            <Button size="lg" className="w-full" onClick={handleStart}>
              <Mic className="h-4 w-4" /> Start recording
            </Button>
            <p className="text-xs text-muted-foreground">
              Keep this tab open. Your phone or laptop must stay awake for the full lecture.
            </p>
          </div>
        )}

        {(recording || lectureId) && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  {recording && <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" /></span>}
                  <p className="text-sm font-medium">{recording ? "Recording" : finalizing ? "Building your notes…" : "Stopped"}</p>
                </div>
                <p className="mt-0.5 font-mono text-2xl tabular-nums">{minutes}:{seconds}</p>
              </div>
              {recording ? (
                <Button variant="destructive" size="lg" onClick={handleStop}>
                  <Square className="h-4 w-4" /> Stop & build notes
                </Button>
              ) : finalizing ? (
                <Button size="lg" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" /> Finalizing
                </Button>
              ) : null}
            </div>

            <div className="mt-6 space-y-2">
              {chunks.length === 0 ? (
                <p className="text-xs text-muted-foreground">First 3-minute slice will arrive shortly…</p>
              ) : (
                chunks.map((c) => (
                  <div key={c.index} className="flex items-start gap-3 rounded-md border border-border/60 bg-background/40 p-3">
                    <div className="mt-0.5">
                      {c.status === "done" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : c.status === "failed" ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Slice {c.index + 1} · {c.status}
                      </p>
                      {c.preview && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{c.preview}…</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}