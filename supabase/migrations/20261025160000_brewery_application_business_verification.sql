ALTER TABLE public.brewery_accounts
  ADD COLUMN IF NOT EXISTS application_business_registration_number text,
  ADD COLUMN IF NOT EXISTS application_verification_url text;
