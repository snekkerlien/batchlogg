DO $$
DECLARE
  movement_trigger record;
  remaining_trigger_definition text;
  dropped_trigger_count integer := 0;
BEGIN
  FOR movement_trigger IN
    SELECT
      trigger_row.tgname,
      trigger_row.tgtype,
      pg_get_triggerdef(trigger_row.oid) AS trigger_definition
    FROM pg_trigger AS trigger_row
    JOIN pg_proc AS trigger_function
      ON trigger_function.oid = trigger_row.tgfoid
    WHERE trigger_row.tgrelid = 'public.inventory_items'::regclass
      AND NOT trigger_row.tgisinternal
      AND (trigger_row.tgtype & 8) = 8
      AND pg_get_functiondef(trigger_function.oid) ILIKE '%inventory_movements%'
  LOOP
    EXECUTE format(
      'DROP TRIGGER %I ON public.inventory_items',
      movement_trigger.tgname
    );
    IF (movement_trigger.tgtype & (4 | 16 | 32)) <> 0 THEN
      remaining_trigger_definition := regexp_replace(
        regexp_replace(
          movement_trigger.trigger_definition,
          '\s+OR\s+DELETE',
          '',
          'gi'
        ),
        'DELETE\s+OR\s+',
        '',
        'gi'
      );
      EXECUTE remaining_trigger_definition;
    END IF;
    dropped_trigger_count := dropped_trigger_count + 1;
  END LOOP;

  IF dropped_trigger_count = 0 THEN
    RAISE EXCEPTION
      'Could not find the inventory item delete trigger that records inventory movements';
  END IF;
END;
$$;

ALTER TABLE public.inventory_movements
  ALTER COLUMN inventory_item_id DROP NOT NULL;

ALTER TABLE public.inventory_movements
  DROP CONSTRAINT inventory_movements_inventory_item_id_fkey;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_inventory_item_id_fkey
  FOREIGN KEY (inventory_item_id)
  REFERENCES public.inventory_items(id)
  ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.log_inventory_item_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory_movements (
    user_id,
    inventory_item_id,
    item_name,
    category,
    movement_type,
    quantity_change,
    balance_after,
    unit,
    batch_id
  )
  VALUES (
    OLD.user_id,
    NULL,
    OLD.name,
    OLD.category,
    'removed',
    -COALESCE(OLD.amount, 0),
    0,
    COALESCE(OLD.unit, ''),
    NULL
  );

  RETURN OLD;
END;
$$;

CREATE TRIGGER inventory_items_record_removal
AFTER DELETE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.log_inventory_item_removal();
