DROP POLICY IF EXISTS "Receive feature refresh signals" ON realtime.messages;
DROP POLICY IF EXISTS "Only developer can send feature refresh signals" ON realtime.messages;

DROP TABLE IF EXISTS public.feature_flags;
