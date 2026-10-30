CREATE TABLE IF NOT EXISTS public.ban_appeals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'info_requested', 'granted', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ban_appeal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.ban_appeals(user_id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('user', 'admin')),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 3 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ban_appeal_messages_user_created_idx
  ON public.ban_appeal_messages (user_id, created_at);

ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ban_appeal_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ban_appeals, public.ban_appeal_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.ban_appeals, public.ban_appeal_messages
  TO service_role;

INSERT INTO public.ban_appeals (user_id, status, created_at, updated_at)
SELECT
  (audit.details ->> 'user_id')::uuid,
  CASE
    WHEN audit.action = 'feedback.ban_appeal_granted' THEN 'granted'
    ELSE 'dismissed'
  END,
  audit.created_at,
  audit.created_at
FROM (
  SELECT DISTINCT ON (details ->> 'user_id')
    details,
    action,
    created_at
  FROM public.admin_audit_log
  WHERE action IN ('feedback.ban_appeal_granted', 'feedback.ban_appeal_dismissed')
    AND details ->> 'user_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1
      FROM auth.users AS account
      WHERE lower(account.id::text) = lower(details ->> 'user_id')
    )
  ORDER BY details ->> 'user_id', created_at DESC
) AS audit
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.ban_appeals (user_id, status, created_at, updated_at)
SELECT user_id, 'pending', min(created_at), max(created_at)
FROM public.feedback
WHERE category = 'ban_appeal'
  AND user_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM auth.users AS account
    WHERE account.id = feedback.user_id
  )
GROUP BY user_id
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.ban_appeal_messages (
  user_id,
  sender_id,
  sender_role,
  message,
  created_at
)
SELECT
  feedback.user_id,
  feedback.user_id,
  'user',
  left(feedback.message, 3000),
  feedback.created_at
FROM public.feedback AS feedback
JOIN public.ban_appeals AS appeal ON appeal.user_id = feedback.user_id
WHERE feedback.category = 'ban_appeal'
  AND char_length(btrim(feedback.message)) BETWEEN 3 AND 3000
  AND NOT EXISTS (
    SELECT 1
    FROM public.ban_appeal_messages AS existing
    WHERE existing.user_id = feedback.user_id
      AND existing.sender_role = 'user'
      AND existing.message = left(feedback.message, 3000)
      AND existing.created_at = feedback.created_at
  );

CREATE OR REPLACE FUNCTION public.submit_ban_appeal(
  p_user_id uuid,
  p_message text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  appeal_status text;
  active_ban boolean;
BEGIN
  IF p_message IS NULL OR char_length(btrim(p_message)) NOT BETWEEN 3 AND 3000 THEN
    RETURN 'invalid_message';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_restrictions AS restriction
    WHERE restriction.user_id = p_user_id
      AND restriction.restriction_type = 'ban'
      AND restriction.revoked_at IS NULL
      AND restriction.starts_at <= now()
      AND (restriction.ends_at IS NULL OR restriction.ends_at > now())
  )
  INTO active_ban;

  IF NOT active_ban THEN
    RETURN 'not_banned';
  END IF;

  INSERT INTO public.ban_appeals (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT appeal.status
  INTO appeal_status
  FROM public.ban_appeals AS appeal
  WHERE appeal.user_id = p_user_id
  FOR UPDATE;

  IF appeal_status IS DISTINCT FROM 'pending'
     AND appeal_status IS DISTINCT FROM 'info_requested' THEN
    RETURN 'appeal_exists';
  END IF;

  IF appeal_status = 'pending' AND EXISTS (
    SELECT 1
    FROM public.ban_appeal_messages AS message
    WHERE message.user_id = p_user_id
      AND message.sender_role = 'user'
  ) THEN
    RETURN 'appeal_exists';
  END IF;

  INSERT INTO public.ban_appeal_messages (user_id, sender_id, sender_role, message)
  VALUES (p_user_id, p_user_id, 'user', btrim(p_message));

  UPDATE public.ban_appeals
  SET status = 'pending', updated_at = now()
  WHERE user_id = p_user_id;

  RETURN 'success';
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_ban_appeal(
  p_user_id uuid,
  p_actor_id uuid,
  p_action text,
  p_message text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_status text;
  revoked_count integer;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('request_info', 'grant', 'dismiss') THEN
    RETURN 'invalid_action';
  END IF;

  IF p_action = 'request_info'
     AND (p_message IS NULL OR char_length(btrim(p_message)) NOT BETWEEN 3 AND 3000) THEN
    RETURN 'invalid_message';
  END IF;

  SELECT appeal.status
  INTO current_status
  FROM public.ban_appeals AS appeal
  WHERE appeal.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF current_status NOT IN ('pending', 'info_requested') THEN
    RETURN 'already_resolved';
  END IF;

  IF p_action = 'request_info' THEN
    IF current_status <> 'pending' THEN
      RETURN 'already_requested';
    END IF;

    INSERT INTO public.ban_appeal_messages (user_id, sender_id, sender_role, message)
    VALUES (p_user_id, p_actor_id, 'admin', btrim(p_message));

    UPDATE public.ban_appeals
    SET status = 'info_requested', updated_at = now()
    WHERE user_id = p_user_id;
    RETURN 'success';
  END IF;

  IF p_action = 'grant' THEN
    UPDATE public.user_restrictions
    SET revoked_at = now(), revoked_by = p_actor_id, updated_at = now()
    WHERE user_id = p_user_id
      AND restriction_type = 'ban'
      AND revoked_at IS NULL
      AND starts_at <= now()
      AND (ends_at IS NULL OR ends_at > now());
    GET DIAGNOSTICS revoked_count = ROW_COUNT;
    IF revoked_count = 0 THEN
      RETURN 'no_active_ban';
    END IF;
  END IF;

  UPDATE public.ban_appeals
  SET status = CASE WHEN p_action = 'grant' THEN 'granted' ELSE 'dismissed' END,
      updated_at = now()
  WHERE user_id = p_user_id;
  RETURN 'success';
END;
$$;

REVOKE ALL ON FUNCTION public.submit_ban_appeal(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manage_ban_appeal(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_ban_appeal(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.manage_ban_appeal(uuid, uuid, text, text) TO service_role;
