ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS conditioning_startdate timestamptz,
  ADD COLUMN IF NOT EXISTS conditioning_notes text;

CREATE TABLE IF NOT EXISTS public.batch_aging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL UNIQUE REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  target_tasting_date date,
  reminder_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.batch_aging_tastings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_aging_id uuid NOT NULL REFERENCES public.batch_aging(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tasted_at date NOT NULL DEFAULT CURRENT_DATE,
  notes text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS batch_aging_tastings_aging_date_idx
  ON public.batch_aging_tastings (batch_aging_id, tasted_at DESC);

ALTER TABLE public.batch_aging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_aging_tastings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their batch aging" ON public.batch_aging;
CREATE POLICY "Users can manage their batch aging"
  ON public.batch_aging
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their batch aging tastings" ON public.batch_aging_tastings;
CREATE POLICY "Users can manage their batch aging tastings"
  ON public.batch_aging_tastings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.batch_conditioning_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  entry_type text NOT NULL CHECK (
    entry_type IN (
      'rack',
      'clarify',
      'mature',
      'stabilize',
      'backsweeten',
      'adjustment',
      'taste',
      'other'
    )
  ),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS batch_conditioning_entries_batch_date_idx
  ON public.batch_conditioning_entries (batch_id, occurred_at DESC, created_at DESC);

ALTER TABLE public.batch_conditioning_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Batch owners and contributors can view conditioning entries"
  ON public.batch_conditioning_entries;
CREATE POLICY "Batch owners and contributors can view conditioning entries"
  ON public.batch_conditioning_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.batches b
      LEFT JOIN public.kar_contributors kc
        ON kc.kar_id = b.aktivt_kar
       AND kc.user_id = auth.uid()
      WHERE b.id = batch_conditioning_entries.batch_id
        AND (b.user_id = auth.uid() OR kc.user_id IS NOT NULL)
    )
  );

GRANT SELECT ON public.batch_conditioning_entries TO authenticated;
