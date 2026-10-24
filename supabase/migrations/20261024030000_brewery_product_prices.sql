ALTER TABLE public.brewery_products
  ADD COLUMN IF NOT EXISTS price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS price_currency text;

ALTER TABLE public.brewery_products
  DROP CONSTRAINT IF EXISTS brewery_products_price_currency_check;

ALTER TABLE public.brewery_products
  ADD CONSTRAINT brewery_products_price_currency_check
  CHECK (
    (price IS NULL AND price_currency IS NULL) OR
    (
      price IS NOT NULL AND
      price_currency IS NOT NULL AND
      price >= 0 AND
      price_currency ~ '^[A-Z]{3}$'
    )
  );

COMMENT ON COLUMN public.brewery_products.price IS
  'Business-confirmed listed price; it is not automatically refreshed from the shop.';
