ALTER TABLE public.community_reports
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderator_notes text,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_note text;

CREATE INDEX IF NOT EXISTS community_reports_assigned_status_created_idx
  ON public.community_reports (assigned_to, status, created_at DESC);

ALTER TABLE public.forum_topics
  ADD COLUMN IF NOT EXISTS moderation_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_hidden_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_hidden_reason text;

ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS moderation_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderation_hidden_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_hidden_reason text;

CREATE TABLE IF NOT EXISTS public.community_moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.community_reports(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (
    action_type IN (
      'warning',
      'mute',
      'content_hidden',
      'content_restored',
      'escalation',
      'note',
      'assigned',
      'unassigned',
      'appeal_upheld',
      'appeal_overturned'
    )
  ),
  reason text NOT NULL,
  restriction_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_moderation_actions_user_created_idx
  ON public.community_moderation_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_moderation_actions_report_created_idx
  ON public.community_moderation_actions (report_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_report_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.community_reports(id) ON DELETE CASCADE,
  action_id uuid NOT NULL UNIQUE REFERENCES public.community_moderation_actions(id) ON DELETE CASCADE,
  appellant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  appeal_text text NOT NULL CHECK (char_length(appeal_text) BETWEEN 10 AND 3000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'upheld', 'overturned')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_report_appeals_report_status_idx
  ON public.community_report_appeals (report_id, status, created_at DESC);

ALTER TABLE public.community_moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_report_appeals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.community_moderation_actions FROM anon, authenticated;
REVOKE ALL ON public.community_report_appeals FROM anon, authenticated;
GRANT ALL ON public.community_moderation_actions TO service_role;
GRANT ALL ON public.community_report_appeals TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_community_report_appeal(
  p_appeal_id uuid,
  p_report_id uuid,
  p_actor_id uuid,
  p_status text,
  p_resolution_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appeal_row public.community_report_appeals%ROWTYPE;
  resolved_at timestamptz := now();
BEGIN
  IF p_status NOT IN ('upheld', 'overturned')
    OR char_length(btrim(p_resolution_note)) < 3
    OR char_length(btrim(p_resolution_note)) > 1000 THEN
    RAISE EXCEPTION 'Invalid appeal decision' USING ERRCODE = '22023';
  END IF;

  UPDATE public.community_report_appeals
  SET
    status = p_status,
    reviewed_by = p_actor_id,
    reviewed_at = resolved_at,
    resolution_note = btrim(p_resolution_note)
  WHERE id = p_appeal_id
    AND report_id = p_report_id
    AND status = 'pending'
  RETURNING * INTO appeal_row;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF p_status = 'overturned' THEN
    UPDATE public.user_restrictions restriction
    SET
      revoked_at = resolved_at,
      revoked_by = p_actor_id,
      updated_at = resolved_at
    FROM public.community_moderation_actions action
    WHERE action.id = appeal_row.action_id
      AND action.action_type = 'mute'
      AND restriction.user_id = action.user_id
      AND restriction.restriction_type = 'mute'
      AND restriction.revoked_at IS NULL
      AND restriction.reason = action.reason
      AND restriction.ends_at IS NOT DISTINCT FROM action.restriction_ends_at
      AND restriction.created_by IS NOT DISTINCT FROM action.actor_id;
  END IF;

  RETURN jsonb_build_object(
    'id', appeal_row.id,
    'action_id', appeal_row.action_id,
    'appellant_id', appeal_row.appellant_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_community_report_appeal(uuid, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_community_report_appeal(uuid, uuid, uuid, text, text)
  TO service_role;
