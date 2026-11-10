-- Updates are performed by the server after checking the developer role.
-- Do not allow direct client writes, including by administrators.
DROP POLICY IF EXISTS "Only developers can update feature toggles" ON public.feature_toggles;
DROP POLICY IF EXISTS "Only developers can insert feature toggles" ON public.feature_toggles;

DROP POLICY IF EXISTS "Only developers can read feature toggle audit logs" ON public.feature_toggles_audit;
CREATE POLICY "Only developers can read feature toggle audit logs"
  ON public.feature_toggles_audit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.membership_status IN ('developer', 'owner')
    )
  );
