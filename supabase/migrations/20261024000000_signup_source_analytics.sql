ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_source text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_signup_source_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_signup_source_check
  CHECK (
    signup_source IS NULL OR signup_source IN (
      'direct',
      'search',
      'social',
      'referral',
      'campaign',
      'other'
    )
  );

COMMENT ON COLUMN public.profiles.signup_source IS
  'Coarse signup acquisition category; does not contain referrer URLs or campaign identifiers.';
