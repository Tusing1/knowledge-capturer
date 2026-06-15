import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import ReactFlow, { Background, Controls, type Node, type Edge } from "reactflow";
import "reactflow/dist/style.css";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLecture } from "@/lib/lectures.functions";
import {
  generateConceptMap, generateCitations, generateGapAnalysis,
  upsertSyllabus, getSyllabus, seedFlashcardReviews,
} from "@/lib/learning.functions";
import { signSlideUpload, importSlides, captureWhiteboard, setLectureLanguage } from "@/lib/capture.functions";
import { supabase } from "@/integrations/supabase/client";
import { Brain, FileText, Camera, GitBranch, Quote, Languages, ArrowLeft, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lectures/$lectureId/extras")({
  head: () => ({ meta: [{ title: "Lecture extras — LectureLoop" }] }),
  component: ExtrasPage,
  errorComponent: ({ error }) => <p className="p-8 text-sm text-destructive">{error.message}</p>,
  notFoundComponent: () => <p className="p-8">Not found</p>,
});

function ExtrasPage() {
  const { lectureId } = Route.useParams();
  const getFn = useServerFn(getLecture);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["lecture", lectureId], queryFn: () => getFn({ data: { lectureId } }) });
  const lecture = (data?.lecture ?? null) as any;
  const output = (data?.output ?? null) as any;
  const conceptMap = output?.concept_map ?? null;
  const citations = output?.citations ?? null;
  const gap = output?.gap_analysis ?? null;
  const slidesText: string | null = lecture?.slides_text ?? null;
  const language: string = lecture?.output_language ?? "en";
  const whiteboards: Array<{ markdown: string; capturedAt: string }> = output?.whiteboard_captures ?? [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/lectures/$lectureId" params={{ lectureId }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to lecture
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{lecture?.title} · Extras</h1>

        <Tabs defaultValue="concept" className="mt-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="concept"><GitBranch className="mr-1 h-3.5 w-3.5" /> Concept map</TabsTrigger>
            <TabsTrigger value="citations"><Quote className="mr-1 h-3.5 w-3.5" /> Citations</TabsTrigger>
            <TabsTrigger value="gap"><Brain className="mr-1 h-3.5 w-3.5" /> Gap analysis</TabsTrigger>
            <TabsTrigger value="slides"><FileText className="mr-1 h-3.5 w-3.5" /> Slides</TabsTrigger>
            <TabsTrigger value="whiteboard"><Camera className="mr-1 h-3.5 w-3.5" /> Whiteboard OCR</TabsTrigger>
            <TabsTrigger value="settings"><Languages className="mr-1 h-3.5 w-3.5" /> Language &amp; review</TabsTrigger>
          </TabsList>

          <TabsContent value="concept" className="mt-4"><ConceptTab lectureId={lectureId} conceptMap={conceptMap} qc={qc} /></TabsContent>
          <TabsContent value="citations" className="mt-4"><CitationsTab lectureId={lectureId} citations={citations} qc={qc} /></TabsContent>
          <TabsContent value="gap" className="mt-4"><GapTab lectureId={lectureId} gap={gap} course={lecture?.course ?? null} qc={qc} /></TabsContent>
          <TabsContent value="slides" className="mt-4"><SlidesTab lectureId={lectureId} slidesText={slidesText} qc={qc} /></TabsContent>
          <TabsContent value="whiteboard" className="mt-4"><WhiteboardTab lectureId={lectureId} captures={whiteboards} qc={qc} /></TabsContent>
          <TabsContent value="settings" className="mt-4"><SettingsTab lectureId={lectureId} language={language} qc={qc} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ConceptTab({ lectureId, conceptMap, qc }: any) {
  const gen = useServerFn(generateConceptMap);
  const m = useMutation({
    mutationFn: () => gen({ data: { lectureId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lecture", lectureId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const nodes: Node[] = (conceptMap?.nodes ?? []).map((n: any, i: number) => ({
    id: n.id, data: { label: n.label }, position: { x: (i % 4) * 200, y: Math.floor(i / 4) * 130 },
  }));
  const edges: Edge[] = (conceptMap?.edges ?? []).map((e: any, i: number) => ({
    id: `e${i}`, source: e.from, target: e.to, label: e.relation, animated: true,
  }));
  return (
    <div className="space-y-3">
      <Button onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />} {conceptMap ? "Regenerate" : "Generate concept map"}
      </Button>
      {nodes.length > 0 && (
        <div className="h-[500px] rounded-xl border border-border bg-card">
          <ReactFlow nodes={nodes} edges={edges} fitView>
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      )}
      {(conceptMap?.nodes ?? []).length > 0 && (
        <div className="space-y-1 rounded-xl border border-border bg-card p-4 text-sm">
          {conceptMap.nodes.map((n: any) => (
            <div key={n.id}><span className="font-medium">{n.label}:</span> <span className="text-muted-foreground">{n.description}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

function CitationsTab({ lectureId, citations, qc }: any) {
  const gen = useServerFn(generateCitations);
  const m = useMutation({
    mutationFn: () => gen({ data: { lectureId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lecture", lectureId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const items = citations?.citations ?? [];
  return (
    <div className="space-y-3">
      <Button onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Quote className="h-4 w-4" />} {citations ? "Regenerate" : "Find citations"}
      </Button>
      <div className="space-y-2">
        {items.length === 0 && <p className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">No citations yet.</p>}
        {items.map((c: any, i: number) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 text-sm">
            <p className="text-xs uppercase text-muted-foreground">{c.type}</p>
            <p className="mt-1 font-medium">{c.mention}</p>
            <p className="mt-2 text-xs"><span className="font-mono text-muted-foreground">APA:</span> {c.apa}</p>
            <p className="text-xs"><span className="font-mono text-muted-foreground">MLA:</span> {c.mla}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GapTab({ lectureId, gap, course, qc }: any) {
  const sylGetFn = useServerFn(getSyllabus);
  const sylSetFn = useServerFn(upsertSyllabus);
  const genFn = useServerFn(generateGapAnalysis);
  const [syl, setSyl] = useState("");
  const { data: sylData } = useQuery({
    queryKey: ["syllabus", course], enabled: !!course,
    queryFn: () => sylGetFn({ data: { course } }),
  });
  if (sylData?.syllabus && !syl) setSyl(sylData.syllabus);
  const save = useMutation({
    mutationFn: () => sylSetFn({ data: { course, syllabus: syl } }),
    onSuccess: () => toast.success("Syllabus saved"),
  });
  const gen = useMutation({
    mutationFn: () => genFn({ data: { lectureId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lecture", lectureId] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  if (!course) return <p className="text-sm text-muted-foreground">Assign a course to this lecture to use gap analysis.</p>;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Syllabus for {course}</p>
        <Textarea rows={6} value={syl} onChange={(e) => setSyl(e.target.value)} placeholder="Paste your syllabus / topic list…" className="mt-2" maxLength={20000} />
        <Button className="mt-2" size="sm" variant="outline" onClick={() => save.mutate()}>Save syllabus</Button>
      </div>
      <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
        {gen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />} {gap ? "Re-analyze" : "Analyze gaps"}
      </Button>
      {gap && (
        <div className="grid gap-3 sm:grid-cols-3">
          <GapList title="Covered" items={gap.covered ?? []} tone="text-emerald-500" />
          <GapList title="Partial" items={gap.partial ?? []} tone="text-amber-500" />
          <GapList title="Missing" items={gap.missing ?? []} tone="text-destructive" />
        </div>
      )}
    </div>
  );
}

function GapList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className={`text-xs font-semibold uppercase ${tone}`}>{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((it, i) => <li key={i}>• {it}</li>)}
        {items.length === 0 && <li className="text-muted-foreground">—</li>}
      </ul>
    </div>
  );
}

function SlidesTab({ lectureId, slidesText, qc }: any) {
  const signFn = useServerFn(signSlideUpload);
  const importFn = useServerFn(importSlides);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const { path, token } = await signFn({ data: { lectureId, filename: file.name } });
      const { error } = await supabase.storage.from("lecture-slides").uploadToSignedUrl(path, token, file, { contentType: file.type });
      if (error) throw error;
      const r = await importFn({ data: { lectureId, storagePath: path } });
      toast.success(`Parsed ${r.slidesText.split("## Slide").length - 1} slides`);
      qc.invalidateQueries({ queryKey: ["lecture", lectureId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      <Button onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload slides (PDF)
      </Button>
      {slidesText && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Extracted slide text</p>
          <pre className="max-h-[500px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">{slidesText}</pre>
        </div>
      )}
    </div>
  );
}

function WhiteboardTab({ lectureId, captures, qc }: any) {
  const capFn = useServerFn(captureWhiteboard);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function capture(file: File) {
    setBusy(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      await capFn({ data: { lectureId, imageDataUrl: dataUrl } });
      toast.success("Whiteboard captured");
      qc.invalidateQueries({ queryKey: ["lecture", lectureId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) capture(f); }} />
      <Button onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} Capture whiteboard
      </Button>
      <div className="space-y-2">
        {captures.map((c: any, i: number) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-xs text-muted-foreground">{new Date(c.capturedAt).toLocaleString()}</p>
            <pre className="whitespace-pre-wrap text-sm">{c.markdown}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ lectureId, language, qc }: any) {
  const setLang = useServerFn(setLectureLanguage);
  const seedFn = useServerFn(seedFlashcardReviews);
  const [lang, setLangState] = useState(language);
  const save = useMutation({
    mutationFn: () => setLang({ data: { lectureId, language: lang } }),
    onSuccess: () => { toast.success("Language updated"); qc.invalidateQueries({ queryKey: ["lecture", lectureId] }); },
  });
  const seed = useMutation({
    mutationFn: () => seedFn({ data: { lectureId } }),
    onSuccess: (r) => toast.success(`Added ${r.inserted} cards to your review queue`),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Output language</p>
        <p className="text-xs text-muted-foreground">Notes will be produced in this language regardless of the lecture's spoken language.</p>
        <select value={lang} onChange={(e) => setLangState(e.target.value)} className="mt-2 rounded border border-border bg-background px-3 py-1.5 text-sm">
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="pt">Português</option>
          <option value="sw">Kiswahili</option>
          <option value="zh">中文</option>
          <option value="ar">العربية</option>
          <option value="hi">हिन्दी</option>
        </select>
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={() => save.mutate()}>Save</Button>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium">Add to spaced repetition</p>
        <p className="text-xs text-muted-foreground">Seeds this lecture's flashcards into your daily review queue.</p>
        <Button className="mt-3" size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>Add to review</Button>
      </div>
    </div>
  );
}