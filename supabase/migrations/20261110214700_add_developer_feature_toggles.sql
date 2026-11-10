-- Create feature toggles table for developer-only features
CREATE TABLE IF NOT EXISTS public.feature_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  requires_developer_only boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add RLS
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature toggles
CREATE POLICY "Anyone can read feature toggles" ON public.feature_toggles
  FOR SELECT USING (true);

-- Only admins/developers can update feature toggles
CREATE POLICY "Only developers can update feature toggles" ON public.feature_toggles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM auth.users
      JOIN public.profiles ON auth.users.id = public.profiles.id
      WHERE auth.users.id = auth.uid()
      AND public.profiles.membership_status IN ('admin', 'developer', 'owner')
    )
  );

CREATE POLICY "Only developers can insert feature toggles" ON public.feature_toggles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      JOIN public.profiles ON auth.users.id = public.profiles.id
      WHERE auth.users.id = auth.uid()
      AND public.profiles.membership_status IN ('admin', 'developer', 'owner')
    )
  );

-- Insert initial feature toggles for the new features
INSERT INTO public.feature_toggles (key, name, description, enabled, requires_developer_only)
VALUES
  ('business-accounts', 'Business Account', 'Enable business/brewery account management', false, true),
  ('brewery-reviews', 'Beer & Brewing Reviews', 'Enable beer & brewing reviews and business directory', false, true)
ON CONFLICT (key) DO NOTHING;

-- Create an audit log for feature toggles
CREATE TABLE IF NOT EXISTS public.feature_toggles_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  toggle_key text NOT NULL REFERENCES public.feature_toggles(key) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_toggles_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only developers can read feature toggle audit logs" ON public.feature_toggles_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      JOIN public.profiles ON auth.users.id = public.profiles.id
      WHERE auth.users.id = auth.uid()
      AND public.profiles.membership_status IN ('admin', 'developer', 'owner')
    )
  );
