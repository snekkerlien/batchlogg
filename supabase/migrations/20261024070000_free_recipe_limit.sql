CREATE OR REPLACE FUNCTION public.enforce_free_recipe_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text;
  saved_recipe_count bigint;
BEGIN
  IF NEW.user_id IS NULL OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.user_id::text, 0)
  );

  SELECT COALESCE(account_tier, 'free')
  INTO user_tier
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF user_tier = 'premium' THEN
    RETURN NEW;
  END IF;

  SELECT count(*)
  INTO saved_recipe_count
  FROM public.recipes
  WHERE user_id = NEW.user_id;

  IF saved_recipe_count >= 20 THEN
    RAISE EXCEPTION
      'Free accounts can save up to 20 recipes. Delete a recipe or upgrade to Premium to save more.'
      USING ERRCODE = '23514',
            CONSTRAINT = 'free_recipe_limit';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER recipes_enforce_free_recipe_limit
BEFORE INSERT ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_free_recipe_limit();
