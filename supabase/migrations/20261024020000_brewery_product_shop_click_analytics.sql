ALTER TABLE public.brewery_product_analytics
  DROP CONSTRAINT IF EXISTS brewery_product_analytics_event_type_check;

ALTER TABLE public.brewery_product_analytics
  ADD CONSTRAINT brewery_product_analytics_event_type_check
  CHECK (event_type IN ('page_view', 'qr_scan', 'outbound_click'));
