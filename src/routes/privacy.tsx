import { createFileRoute } from "@tanstack/react-router";
import { PublicHeader, PublicFooter } from "./how-it-works";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — LectureLoop" },
      { name: "description", content: "How LectureLoop handles your audio recordings, transcripts, and personal data." },
      { property: "og:title", content: "Privacy — LectureLoop" },
      { property: "og:description", content: "What we store, where we store it, and how to delete it." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-sm mt-8 max-w-none space-y-6 text-sm leading-relaxed">
          <Section title="What we collect">
            <ul className="list-disc space-y-1 pl-5">
              <li>Your email address (for sign-in).</li>
              <li>Audio recordings you make using LectureLoop.</li>
              <li>Transcripts and AI-generated study material derived from those recordings.</li>
              <li>Basic usage data to keep the service running.</li>
            </ul>
          </Section>

          <Section title="Where it lives">
            Audio chunks are stored privately in your account's storage bucket. Transcripts and generated
            notes live in our database, scoped to your user ID with row-level security so no other user
            can read them.
          </Section>

          <Section title="How recordings are processed">
            Each 3-minute audio slice is uploaded to our backend, then sent to our transcription model
            for processing. The model providers do not train on your audio. After transcription, the
            final transcript is used to generate study material and then kept in your account.
          </Section>

          <Section title="Consent and your lecturer">
            You are responsible for recording lawfully. Many jurisdictions and institutions require
            consent from the speaker (your lecturer) before recording a class. Check your local laws
            and your institution's policy before recording.
          </Section>

          <Section title="Deletion">
            You can delete any lecture from your dashboard, which removes its audio, transcript, and
            generated notes. Contact support to delete your entire account.
          </Section>

          <Section title="Contact">
            Questions about privacy? Reach out from your account.
          </Section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 text-muted-foreground">{children}</div>
    </section>
  );
}