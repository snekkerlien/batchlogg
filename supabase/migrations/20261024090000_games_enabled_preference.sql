ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS games_enabled boolean NOT NULL DEFAULT false;
