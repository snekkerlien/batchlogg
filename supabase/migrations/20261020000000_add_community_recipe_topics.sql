ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS is_community_recipe boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS forum_topics_community_recipe_idx
  ON public.forum_topics (created_at DESC)
  WHERE is_community_recipe = true;
