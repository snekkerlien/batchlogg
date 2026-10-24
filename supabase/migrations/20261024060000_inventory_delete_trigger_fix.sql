DROP TRIGGER IF EXISTS inventory_items_record_removal
  ON public.inventory_items;

DO $$
DECLARE
  movement_trigger record;
  remaining_trigger_definition text;
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
  END LOOP;
END;
$$;

ALTER TABLE public.inventory_movements
  ALTER COLUMN inventory_item_id DROP NOT NULL;

ALTER TABLE public.inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_inventory_item_id_fkey;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_inventory_item_id_fkey
  FOREIGN KEY (inventory_item_id)
  REFERENCES public.inventory_items(id)
  ON DELETE SET NULL;

DROP FUNCTION IF EXISTS public.log_inventory_item_removal();
