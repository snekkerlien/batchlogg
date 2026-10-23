CREATE TABLE IF NOT EXISTS public.brewery_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  business_type text NOT NULL DEFAULT 'brewery',
  business_type_other text CHECK (char_length(business_type_other) <= 100),
  application_contact_name text CHECK (char_length(application_contact_name) <= 120),
  application_business_email text CHECK (char_length(application_business_email) <= 254),
  application_offerings text CHECK (char_length(application_offerings) <= 2000),
  application_referral_source text CHECK (char_length(application_referral_source) <= 500),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  location text NOT NULL DEFAULT '' CHECK (char_length(location) <= 200),
  website_url text,
  logo_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  manual_access_granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  manual_access_granted_at timestamptz,
  manual_access_expires_at timestamptz,
  manual_access_note text CHECK (char_length(manual_access_note) <= 1000),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_subscription_status text,
  stripe_current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brewery_accounts
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'brewery';
ALTER TABLE public.brewery_accounts
  ADD COLUMN IF NOT EXISTS business_type_other text
  CHECK (char_length(business_type_other) <= 100);
ALTER TABLE public.brewery_accounts
  ADD COLUMN IF NOT EXISTS application_contact_name text
  CHECK (char_length(application_contact_name) <= 120);
ALTER TABLE public.brewery_accounts
  ADD COLUMN IF NOT EXISTS application_business_email text
  CHECK (char_length(application_business_email) <= 254);
ALTER TABLE public.brewery_accounts
  ADD COLUMN IF NOT EXISTS application_offerings text
  CHECK (char_length(application_offerings) <= 2000);
ALTER TABLE public.brewery_accounts
  ADD COLUMN IF NOT EXISTS application_referral_source text
  CHECK (char_length(application_referral_source) <= 500);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'brewery_accounts_business_type_check'
      AND conrelid = 'public.brewery_accounts'::regclass
  ) THEN
    ALTER TABLE public.brewery_accounts
      ADD CONSTRAINT brewery_accounts_business_type_check
      CHECK (business_type IN ('brewery', 'pub', 'homebrew_shop', 'other'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.brewery_members (
  brewery_id uuid NOT NULL REFERENCES public.brewery_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager', 'editor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brewery_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.brewery_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brewery_id uuid NOT NULL REFERENCES public.brewery_accounts(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  category text NOT NULL CONSTRAINT brewery_products_category_check CHECK (
    category IN (
      'all-grain-kit', 'beer', 'cider', 'mead', 'wine', 'spirits', 'non-alcoholic',
      'brewing-equipment', 'brewing-ingredients', 'merchandise', 'other'
    )
  ),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  product_url text CHECK (product_url IS NULL OR product_url ~ '^https://'),
  image_url text,
  style text CHECK (char_length(style) <= 120),
  abv numeric(5,2) CHECK (abv IS NULL OR (abv >= 0 AND abv <= 100)),
  batch_size_l numeric(7,2) CHECK (batch_size_l IS NULL OR batch_size_l BETWEEN 0 AND 10000),
  ebc numeric(7,2) CHECK (ebc IS NULL OR ebc BETWEEN 0 AND 1000),
  ibu numeric(7,2) CHECK (ibu IS NULL OR ibu BETWEEN 0 AND 1000),
  package_size text CHECK (char_length(package_size) <= 120),
  availability text NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'seasonal', 'discontinued')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(details) = 'object'),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brewery_id, slug)
);

ALTER TABLE public.brewery_products
  DROP CONSTRAINT IF EXISTS brewery_products_category_check;
ALTER TABLE public.brewery_products
  ADD CONSTRAINT brewery_products_category_check
  CHECK (
    category IN (
      'all-grain-kit', 'beer', 'cider', 'mead', 'wine', 'spirits', 'non-alcoholic',
      'brewing-equipment', 'brewing-ingredients', 'merchandise', 'other'
    )
  );
ALTER TABLE public.brewery_products
  ADD COLUMN IF NOT EXISTS batch_size_l numeric(7,2)
  CHECK (batch_size_l IS NULL OR batch_size_l BETWEEN 0 AND 10000);
ALTER TABLE public.brewery_products
  ADD COLUMN IF NOT EXISTS product_url text
  CHECK (product_url IS NULL OR product_url ~ '^https://');
ALTER TABLE public.brewery_products
  ADD COLUMN IF NOT EXISTS ebc numeric(7,2)
  CHECK (ebc IS NULL OR ebc BETWEEN 0 AND 1000);
ALTER TABLE public.brewery_products
  ADD COLUMN IF NOT EXISTS ibu numeric(7,2)
  CHECK (ibu IS NULL OR ibu BETWEEN 0 AND 1000);
CREATE TABLE IF NOT EXISTS public.brewery_product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.brewery_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 3000),
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.brewery_review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.brewery_product_reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'under_review', 'action_taken', 'closed')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS public.brewery_product_analytics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  brewery_id uuid NOT NULL REFERENCES public.brewery_accounts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.brewery_products(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'qr_scan')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brewery_accounts_status_idx
  ON public.brewery_accounts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS brewery_products_public_idx
  ON public.brewery_products (brewery_id, is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS brewery_reviews_public_idx
  ON public.brewery_product_reviews (product_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS brewery_review_reports_status_idx
  ON public.brewery_review_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS brewery_analytics_product_date_idx
  ON public.brewery_product_analytics (brewery_id, product_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_brewery_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brewery_accounts_updated_at ON public.brewery_accounts;
CREATE TRIGGER brewery_accounts_updated_at
  BEFORE UPDATE ON public.brewery_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_brewery_updated_at();

DROP TRIGGER IF EXISTS brewery_products_updated_at ON public.brewery_products;
CREATE TRIGGER brewery_products_updated_at
  BEFORE UPDATE ON public.brewery_products
  FOR EACH ROW EXECUTE FUNCTION public.set_brewery_updated_at();

DROP TRIGGER IF EXISTS brewery_reviews_updated_at ON public.brewery_product_reviews;
CREATE TRIGGER brewery_reviews_updated_at
  BEFORE UPDATE ON public.brewery_product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_brewery_updated_at();

ALTER TABLE public.brewery_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brewery_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brewery_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brewery_product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brewery_review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brewery_product_analytics ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.brewery_accounts FROM anon, authenticated;
REVOKE ALL ON public.brewery_members FROM anon, authenticated;
REVOKE ALL ON public.brewery_products FROM anon, authenticated;
REVOKE ALL ON public.brewery_product_reviews FROM anon, authenticated;
REVOKE ALL ON public.brewery_review_reports FROM anon, authenticated;
REVOKE ALL ON public.brewery_product_analytics FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brewery_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brewery_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brewery_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brewery_product_reviews TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brewery_review_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brewery_product_analytics TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.brewery_product_analytics_id_seq TO service_role;
