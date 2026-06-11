-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Lectures
CREATE TABLE public.lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled lecture',
  course TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording','processing','ready','failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lectures_user_idx ON public.lectures(user_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO authenticated;
GRANT ALL ON public.lectures TO service_role;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner all lectures" ON public.lectures FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chunks
CREATE TABLE public.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  index INT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_ms INT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'audio/webm',
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','transcribing','transcribed','failed')),
  transcript TEXT,
  partial_notes JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lecture_id, index)
);
CREATE INDEX chunks_lecture_idx ON public.chunks(lecture_id, index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chunks TO authenticated;
GRANT ALL ON public.chunks TO service_role;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner all chunks" ON public.chunks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Lecture outputs
CREATE TABLE public.lecture_outputs (
  lecture_id UUID PRIMARY KEY REFERENCES public.lectures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_transcript TEXT,
  structured_notes JSONB,
  quotes JSONB,
  likely_questions JSONB,
  flashcards JSONB,
  summary TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecture_outputs TO authenticated;
GRANT ALL ON public.lecture_outputs TO service_role;
ALTER TABLE public.lecture_outputs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner all outputs" ON public.lecture_outputs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER lectures_set_updated_at BEFORE UPDATE ON public.lectures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();