
-- Pro flag + demo flag on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Tags, favorite, share id on lectures
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_id uuid UNIQUE;

CREATE INDEX IF NOT EXISTS lectures_share_id_idx ON public.lectures(share_id) WHERE share_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lectures_tags_idx ON public.lectures USING GIN (tags);
