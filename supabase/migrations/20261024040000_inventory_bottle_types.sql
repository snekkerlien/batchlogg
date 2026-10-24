ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS bottle_type text
  CHECK (bottle_type IN ('Swing top', 'Cork', 'Cap'));
