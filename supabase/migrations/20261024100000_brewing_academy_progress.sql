CREATE TABLE public.brewing_academy_progress (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  game_id text NOT NULL CHECK (
    game_id IN (
      'brew-basics',
      'brew-day-sequence',
      'fermentation-detective',
      'recipe-builder',
      'brew-math-lab',
      'flavor-aroma'
    )
  ),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  total_questions integer NOT NULL DEFAULT 0 CHECK (total_questions >= 0),
  correct_answers integer NOT NULL DEFAULT 0 CHECK (correct_answers >= 0),
  best_score integer NOT NULL DEFAULT 0 CHECK (best_score >= 0 AND best_score <= 7),
  last_score integer NOT NULL DEFAULT 0 CHECK (last_score >= 0 AND last_score <= 7),
  missed_question_counts jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(missed_question_counts) = 'object'),
  last_played_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game_id),
  CHECK (correct_answers <= total_questions)
);

ALTER TABLE public.brewing_academy_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, DELETE ON public.brewing_academy_progress TO service_role;

CREATE OR REPLACE FUNCTION public.record_brewing_academy_attempt(
  p_user_id uuid,
  p_game_id text,
  p_score integer,
  p_total_questions integer,
  p_missed_questions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_question text;
  v_missed_counts jsonb;
BEGIN
  IF p_game_id NOT IN (
    'brew-basics',
    'brew-day-sequence',
    'fermentation-detective',
    'recipe-builder',
    'brew-math-lab',
    'flavor-aroma'
  )
    OR p_total_questions < 1
    OR p_total_questions > 7
    OR p_score < 0
    OR p_score > p_total_questions
    OR jsonb_typeof(p_missed_questions) <> 'array'
    OR jsonb_array_length(p_missed_questions) <> p_total_questions - p_score
  THEN
    RAISE EXCEPTION 'Invalid Brewing Academy attempt';
  END IF;

  INSERT INTO public.brewing_academy_progress (
    user_id,
    game_id,
    attempt_count,
    total_questions,
    correct_answers,
    best_score,
    last_score,
    last_played_at
  )
  VALUES (
    p_user_id,
    p_game_id,
    1,
    p_total_questions,
    p_score,
    p_score,
    p_score,
    now()
  )
  ON CONFLICT (user_id, game_id)
  DO UPDATE SET
    attempt_count = public.brewing_academy_progress.attempt_count + 1,
    total_questions = public.brewing_academy_progress.total_questions + EXCLUDED.total_questions,
    correct_answers = public.brewing_academy_progress.correct_answers + EXCLUDED.correct_answers,
    best_score = GREATEST(public.brewing_academy_progress.best_score, EXCLUDED.best_score),
    last_score = EXCLUDED.last_score,
    last_played_at = now()
  RETURNING missed_question_counts INTO v_missed_counts;

  FOR v_question IN
    SELECT value
    FROM jsonb_array_elements_text(p_missed_questions)
  LOOP
    IF length(btrim(v_question)) = 0 OR length(v_question) > 500 THEN
      RAISE EXCEPTION 'Invalid missed question';
    END IF;
    v_missed_counts := jsonb_set(
      v_missed_counts,
      ARRAY[v_question],
      to_jsonb(COALESCE((v_missed_counts ->> v_question)::integer, 0) + 1),
      true
    );
  END LOOP;

  UPDATE public.brewing_academy_progress
  SET missed_question_counts = v_missed_counts
  WHERE user_id = p_user_id AND game_id = p_game_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_brewing_academy_attempt(uuid, text, integer, integer, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_brewing_academy_attempt(uuid, text, integer, integer, jsonb)
  TO service_role;
