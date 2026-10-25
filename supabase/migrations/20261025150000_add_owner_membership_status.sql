ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_membership_status_check;

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
      'owner'
    )
  );
