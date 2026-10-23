ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS split_loss_volume_l numeric;

CREATE OR REPLACE FUNCTION public.split_batch(
  p_batch_id uuid,
  p_user_id uuid,
  p_allocations jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  source_batch public.batches%ROWTYPE;
  allocation jsonb;
  vessel_id uuid;
  volume_l numeric;
  allocation_count integer := 0;
  total_volume_l numeric := 0;
  next_batch_number bigint;
  child_id uuid;
  child_batch_number text;
  child_results jsonb := '[]'::jsonb;
BEGIN
  IF p_allocations IS NULL
    OR jsonb_typeof(p_allocations) IS DISTINCT FROM 'array'
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ALLOCATIONS';
  END IF;
  IF jsonb_array_length(p_allocations) < 2 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ALLOCATIONS';
  END IF;

  SELECT *
    INTO source_batch
    FROM public.batches
   WHERE id = p_batch_id
     AND user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BATCH_NOT_FOUND';
  END IF;

  IF source_batch.status IS NULL
    OR source_batch.status NOT IN ('Aktiv', 'Sekundær', 'secondary')
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'BATCH_NOT_ACTIVE';
  END IF;

  IF source_batch.volume_l IS NULL OR source_batch.volume_l <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VOLUME_MISMATCH';
  END IF;

  FOR allocation IN SELECT value FROM jsonb_array_elements(p_allocations)
  LOOP
    IF jsonb_typeof(allocation->'vesselId') IS DISTINCT FROM 'string'
      OR (allocation->>'vesselId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR jsonb_typeof(allocation->'volumeL') IS DISTINCT FROM 'number'
    THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ALLOCATIONS';
    END IF;

    vessel_id := (allocation->>'vesselId')::uuid;
    volume_l := (allocation->>'volumeL')::numeric;
    IF volume_l <= 0 OR scale(volume_l) > 4 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_VOLUME';
    END IF;

    PERFORM 1
      FROM public.kar
     WHERE id = vessel_id
       AND user_id = p_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VESSEL_UNAVAILABLE';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM public.batches
       WHERE aktivt_kar = vessel_id
         AND id <> source_batch.id
         AND status IN ('Aktiv', 'Sekundær', 'secondary')
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VESSEL_IN_USE';
    END IF;

    allocation_count := allocation_count + 1;
    total_volume_l := total_volume_l + volume_l;
  END LOOP;

  IF allocation_count <> jsonb_array_length(p_allocations) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ALLOCATIONS';
  END IF;

  IF (
    SELECT count(DISTINCT value->>'vesselId')
      FROM jsonb_array_elements(p_allocations)
  ) <> allocation_count THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'INVALID_ALLOCATIONS';
  END IF;

  IF round(total_volume_l, 4) > round(source_batch.volume_l::numeric, 4) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'VOLUME_EXCEEDED';
  END IF;

  PERFORM 1
    FROM public.profiles
   WHERE id = p_user_id
   FOR UPDATE;

  SELECT COALESCE(MAX(batchnummer_int), 0) + 1
    INTO next_batch_number
    FROM public.batches
   WHERE user_id = p_user_id;

  UPDATE public.batches
     SET status = 'Split',
         split_at = now(),
         split_original_volume_l = source_batch.volume_l,
         split_loss_volume_l = GREATEST(
           0,
           source_batch.volume_l::numeric - total_volume_l
         )
   WHERE id = source_batch.id;

  FOR allocation IN SELECT value FROM jsonb_array_elements(p_allocations)
  LOOP
    vessel_id := (allocation->>'vesselId')::uuid;
    volume_l := (allocation->>'volumeL')::numeric;
    child_batch_number :=
      repeat('0', greatest(0, 4 - length(next_batch_number::text)))
      || next_batch_number::text;

    INSERT INTO public.batches
    SELECT (
      jsonb_populate_record(
        NULL::public.batches,
        to_jsonb(source_batch) || jsonb_build_object(
          'id', gen_random_uuid(),
          'batchnummer_int', next_batch_number,
          'batchnummer', child_batch_number,
          'aktivt_kar', vessel_id,
          'volume_l', volume_l,
          'status', 'Aktiv',
          'created_at', now(),
          'updated_at', now(),
          'split_parent_batch_id', source_batch.id,
          'split_at', now(),
          'split_original_volume_l', NULL,
          'split_loss_volume_l', NULL
        )
      )
    ).*
    RETURNING id INTO child_id;

    INSERT INTO public.sg_readings (batch_id, sg, created_at)
    SELECT child_id, sg, created_at
      FROM public.sg_readings
     WHERE batch_id = source_batch.id;

    child_results := child_results || jsonb_build_array(
      jsonb_build_object('id', child_id, 'batchnummer', child_batch_number)
    );
    next_batch_number := next_batch_number + 1;
  END LOOP;

  UPDATE public.kar
     SET status = 'Aktiv'
   WHERE id IN (
     SELECT (value->>'vesselId')::uuid
       FROM jsonb_array_elements(p_allocations)
   );

  IF NOT EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_allocations)
     WHERE value->>'vesselId' = source_batch.aktivt_kar::text
  ) THEN
    UPDATE public.kar
       SET status = 'Ledig'
     WHERE id = source_batch.aktivt_kar
       AND NOT EXISTS (
         SELECT 1
           FROM public.batches
          WHERE aktivt_kar = source_batch.aktivt_kar
            AND status IN ('Aktiv', 'Sekundær', 'secondary')
       );
  END IF;

  RETURN jsonb_build_object(
    'sourceBatchId', source_batch.id,
    'children', child_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.split_batch(uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.split_batch(uuid, uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.split_batch(uuid, uuid, jsonb) TO service_role;
