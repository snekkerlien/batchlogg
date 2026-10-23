ALTER TABLE public.brewery_members
  DROP CONSTRAINT IF EXISTS brewery_members_role_check;

UPDATE public.brewery_members
SET role = 'editor'
WHERE role = 'analyst';

ALTER TABLE public.brewery_members
  ADD CONSTRAINT brewery_members_role_check
  CHECK (role IN ('owner', 'manager', 'editor'));
