# Plan: LectureLoop — architecture doc + web/backend build

Two deliverables:

1. **Architecture document** (`/mnt/documents/LectureLoop-Architecture.md` + a Mermaid diagram) you can hand to a Flutter or React Native developer to build the native mobile app.
2. **Path B implementation in Lovable** — a working web app + cloud backend that the future native app will share. The web app is fully usable on its own (great for laptops in online classes) and exposes the same APIs the native app will call.

---

## Part 1 — Architecture document for native devs

A single markdown file plus a Mermaid diagram covering:

- **System overview**: rolling 3-min chunk recorder, parallel cloud transcription, per-chunk distillation, end-of-lecture stitching into notes, quotes, flashcards, likely-exam-questions.
- **Client responsibilities (native app)**: foreground-service audio capture (Android), proper `AVAudioSession` background category (iOS), 3-min rolling chunks via two alternating recorders so there is zero gap, local SQLite cache, background upload queue with retry, full offline read of past lectures, optional on-device fallback transcription (Whisper.cpp / whisper_ggml) for no-internet mode.
- **Shared backend (built in Part 2)**: auth, lecture sessions, chunk upload endpoint, transcription + per-chunk summarization pipeline, final stitcher, storage of audio + transcripts + notes, sync API.
- **API contract**: every REST endpoint with method, path, request shape, response shape — so the Flutter/RN dev can integrate without guessing.
- **Data model**: tables and columns.
- **Recommended native libraries**: Flutter (`record`, `flutter_background_service`, `dio`, `drift`) and RN/Expo (`expo-av` or `react-native-audio-recorder-player`, `expo-task-manager`, `expo-sqlite`, `tanstack-query`).
- **Known pitfalls**: iOS background audio entitlement, Android foreground-service notification requirement, battery, chunk boundary word-loss mitigation (250ms overlap).
- **Mermaid diagram** of the rolling-recorder + pipeline flow, saved as `/mnt/documents/LectureLoop-Flow.mmd` and surfaced as an artifact.

## Part 2 — Path B build in Lovable

### Stack
- **TanStack Start** (already scaffolded) for web app + server functions + API routes.
- **Lovable Cloud** for Postgres, auth (email/password + Google), and Storage (audio chunk blobs).
- **Lovable AI Gateway** for transcription (`google/gemini-3-flash-preview` accepts audio) and for note/quote/flashcard generation.

### Database (Lovable Cloud migrations)
- `lectures` — id, user_id, title, course, started_at, ended_at, status (`recording` / `processing` / `ready`), language.
- `chunks` — id, lecture_id, index, storage_path, duration_ms, status (`uploaded` / `transcribed` / `failed`), transcript, partial_notes (jsonb), created_at.
- `lecture_outputs` — lecture_id (PK), full_transcript, structured_notes (jsonb: sections + bullets), quotes (jsonb: array of `{text, importance, approx_time}`), likely_questions (jsonb), flashcards (jsonb: array of `{q,a}`), generated_at.
- `profiles` — id (FK auth.users), display_name, created_at.
- All tables: explicit GRANTs to `authenticated` + `service_role`, RLS scoped to `auth.uid()`.

### Web app routes
- `/` — landing explaining the product, CTA to sign in.
- `/auth` — email/password + Google sign-in.
- `/_authenticated/dashboard` — list of past lectures with status, search.
- `/_authenticated/record` — the live recording surface: start/stop, live chunk counter, live partial transcript stream from the most-recently-finished chunk, "processing" indicator for chunks being summarized.
- `/_authenticated/lectures/$lectureId` — final view: tabs for **Notes**, **Quotes**, **Flashcards**, **Likely Questions**, **Transcript**, plus audio playback. Cached to IndexedDB so it works offline once viewed.

### Recording engine (browser)
- `MediaRecorder` with two alternating instances so there is zero gap between 3-min chunks (one finalizes + uploads while the other is already recording).
- Each chunk: upload audio blob to Cloud Storage via a presigned upload server fn → insert `chunks` row → fire `transcribeChunk` server fn.

### Server functions (`src/lib/*.functions.ts`)
- `startLecture({title, course})` → creates lecture row.
- `requestChunkUpload({lectureId, index, durationMs})` → returns signed upload URL + chunk row id.
- `transcribeChunk({chunkId})` → fetches audio from storage, calls Lovable AI with audio input, writes transcript + 1–3 bullet partial_notes back.
- `finalizeLecture({lectureId})` → loads all transcripts in order, calls Lovable AI once with a structured-output schema to produce `{notes, quotes, likely_questions, flashcards}`, writes `lecture_outputs`, sets lecture status `ready`.
- `getLecture({lectureId})` and `listLectures()` for the UI.

### Public API routes (so native app uses the same backend)
Under `src/routes/api/` (auth-gated via bearer-token middleware reusing Supabase auth):
- `POST /api/lectures` → start lecture.
- `POST /api/lectures/:id/chunks` → register chunk + get upload URL.
- `POST /api/lectures/:id/finalize` → trigger finalize.
- `GET /api/lectures` and `GET /api/lectures/:id` → list/read.

### Offline (web)
- IndexedDB cache of viewed lectures (notes, quotes, flashcards, transcript). Audio not cached on web (size). Service worker for shell offline.

### Out of scope for this build
- True background recording on iOS Safari (browser limitation — that's why the native app exists).
- Per-user on-device Whisper.
- Payments / tiers.

---

## Technical details

- **Audio model**: Gemini 2.x/3 Flash via Lovable AI Gateway accepts inline audio (base64) for short clips; for 3-min chunks we upload audio to Cloud Storage and pass a fetched bytes payload to the model in the server fn.
- **Chunk overlap**: 250ms tail overlap between chunks to avoid clipping mid-word; the finalizer dedupes on stitching.
- **Structured output**: `Output.object` with a small Zod schema for the finalizer call (notes sections, quotes, flashcards, questions). Kept compact to avoid Gemini schema-state limits.
- **Auth on API routes**: shared middleware that validates the `Authorization: Bearer <jwt>` header against Supabase, used by both `createServerFn` (`requireSupabaseAuth`) and the public `/api/*` routes so native and web use one auth model.
- **Storage**: private bucket `lecture-audio`, path `userId/lectureId/index.webm`, RLS limits access to owner.

---

## Build order

1. Enable Lovable Cloud.
2. Migrations: tables + RLS + GRANTs + storage bucket.
3. Auth pages + `_authenticated` layout guard.
4. Server functions for lecture/chunk lifecycle.
5. Recording UI with rolling MediaRecorder pair.
6. Finalizer + structured AI call.
7. Lecture view (notes / quotes / flashcards / questions / transcript) with IndexedDB cache.
8. Public `/api/*` routes mirroring the server fns for native client.
9. Write `/mnt/documents/LectureLoop-Architecture.md` + Mermaid diagram.

Approve and I'll build.
