ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_membership_status_check;

-- Keep legacy Owner values valid; permission updates are protected by the profile trigger.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_membership_status_check
  CHECK (
    membership_status IN (
      'member',
      'supporter',
      'beta-tester',
      'early-adopter',
      'founder',
      'contributor',
      'verified-brewer',
      'pro-brewer',
      'brewery',
      'partner',
      'sponsor',
      'moderator',
      'admin',
      'developer',
      'owner'
    )
  );

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

INSERT INTO public.feature_flags (key, enabled)
VALUES
  ('dashboard', true),
  ('batch-history', true),
  ('recipes', true),
  ('inventory', true),
  ('calendar', true),
  ('shopping-list', true),
  ('brew-insights', true),
  ('calculators', true),
  ('community', true),
  ('business', true),
  ('games', true),
  ('kegs', true),
  ('brewcompanion', true),
  ('public-batches', true),
  ('changelog', true),
  ('sponsorship', true),
  ('premium', true)
ON CONFLICT (key) DO NOTHING;
