
-- 1. User roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'professor', 'student');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 2. Spaced repetition
CREATE TABLE public.flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  card_index int NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  ease_factor numeric NOT NULL DEFAULT 2.5,
  interval_days int NOT NULL DEFAULT 0,
  repetitions int NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lecture_id, card_index, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_reviews TO authenticated;
GRANT ALL ON public.flashcard_reviews TO service_role;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner all reviews" ON public.flashcard_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_flashcard_reviews_updated BEFORE UPDATE ON public.flashcard_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Exams
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  course text,
  exam_date date NOT NULL,
  lecture_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner all exams" ON public.exams FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Course syllabi
CREATE TABLE public.course_syllabi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course text NOT NULL,
  syllabus text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_syllabi TO authenticated;
GRANT ALL ON public.course_syllabi TO service_role;
ALTER TABLE public.course_syllabi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner all syllabi" ON public.course_syllabi FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_syllabi_updated BEFORE UPDATE ON public.course_syllabi FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Shared notes (course rooms)
CREATE TABLE public.shared_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course text NOT NULL,
  lecture_id uuid REFERENCES public.lectures(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'note',
  content text NOT NULL,
  votes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_notes TO authenticated;
GRANT ALL ON public.shared_notes TO service_role;
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view shared notes" ON public.shared_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own shared notes" ON public.shared_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own shared notes" ON public.shared_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.shared_note_votes (
  note_id uuid NOT NULL REFERENCES public.shared_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(note_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.shared_note_votes TO authenticated;
GRANT ALL ON public.shared_note_votes TO service_role;
ALTER TABLE public.shared_note_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View all votes" ON public.shared_note_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own vote" ON public.shared_note_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own vote" ON public.shared_note_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Enrollments
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL,
  student_id uuid NOT NULL,
  course text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professor_id, student_id, course)
);
GRANT SELECT, INSERT, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Professors manage enrollments" ON public.enrollments FOR ALL TO authenticated
  USING (auth.uid() = professor_id AND public.has_role(auth.uid(), 'professor'))
  WITH CHECK (auth.uid() = professor_id AND public.has_role(auth.uid(), 'professor'));
CREATE POLICY "Students view enrollments" ON public.enrollments FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- 7. Extend lectures + lecture_outputs
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS slides_text text,
  ADD COLUMN IF NOT EXISTS slides_storage_path text,
  ADD COLUMN IF NOT EXISTS output_language text NOT NULL DEFAULT 'en';

ALTER TABLE public.lecture_outputs
  ADD COLUMN IF NOT EXISTS concept_map jsonb,
  ADD COLUMN IF NOT EXISTS citations jsonb,
  ADD COLUMN IF NOT EXISTS gap_analysis jsonb,
  ADD COLUMN IF NOT EXISTS whiteboard_captures jsonb;
