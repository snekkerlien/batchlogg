ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

UPDATE public.feedback
SET read_at = now()
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS feedback_unread_created_idx
  ON public.feedback (created_at DESC)
  WHERE read_at IS NULL;
