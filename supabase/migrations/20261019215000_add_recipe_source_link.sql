ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS source_recipe_id uuid
  REFERENCES public.recipes (id)
  ON DELETE SET NULL;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_source_recipe_id_not_self
  CHECK (source_recipe_id IS NULL OR source_recipe_id <> id);

CREATE INDEX IF NOT EXISTS recipes_source_recipe_id_idx
  ON public.recipes (source_recipe_id)
  WHERE source_recipe_id IS NOT NULL;
