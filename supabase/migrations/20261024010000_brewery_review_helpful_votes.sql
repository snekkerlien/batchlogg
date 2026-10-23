CREATE TABLE IF NOT EXISTS public.brewery_review_helpful_votes (
  review_id uuid NOT NULL
    REFERENCES public.brewery_product_reviews(id)
    ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

ALTER TABLE public.brewery_review_helpful_votes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.brewery_review_helpful_votes FROM anon, authenticated;
GRANT ALL ON public.brewery_review_helpful_votes TO service_role;
