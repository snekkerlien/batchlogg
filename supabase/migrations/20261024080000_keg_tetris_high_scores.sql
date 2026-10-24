CREATE TABLE public.keg_tetris_scores (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  high_score integer NOT NULL DEFAULT 0
    CHECK (high_score >= 0 AND high_score <= 1000000000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.keg_tetris_scores ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.keg_tetris_scores TO service_role;

CREATE OR REPLACE FUNCTION public.save_keg_tetris_high_score(
  p_user_id uuid,
  p_score integer
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.keg_tetris_scores (user_id, high_score, updated_at)
  VALUES (p_user_id, p_score, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    high_score = GREATEST(public.keg_tetris_scores.high_score, EXCLUDED.high_score),
    updated_at = CASE
      WHEN EXCLUDED.high_score > public.keg_tetris_scores.high_score THEN now()
      ELSE public.keg_tetris_scores.updated_at
    END
  RETURNING high_score;
$$;

REVOKE ALL ON FUNCTION public.save_keg_tetris_high_score(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_keg_tetris_high_score(uuid, integer)
  TO service_role;
