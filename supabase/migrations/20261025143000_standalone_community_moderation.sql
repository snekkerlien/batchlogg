ALTER TABLE public.community_report_appeals
  ALTER COLUMN report_id DROP NOT NULL;

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
    AND report_id IS NOT DISTINCT FROM p_report_id
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
