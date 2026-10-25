ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Receive feature refresh signals" ON realtime.messages;
CREATE POLICY "Receive feature refresh signals"
  ON realtime.messages
  FOR SELECT
  TO anon, authenticated
  USING (
    extension = 'broadcast'
    AND realtime.topic() = 'feature-flags-refresh'
  );

DROP POLICY IF EXISTS "Only developer can send feature refresh signals" ON realtime.messages;
CREATE POLICY "Only developer can send feature refresh signals"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    extension = 'broadcast'
    AND realtime.topic() = 'feature-flags-refresh'
    AND auth.uid() = '5b3e9afb-283e-4003-81be-ef4ce407b1be'::uuid
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND membership_status IN ('developer', 'owner')
    )
  );
