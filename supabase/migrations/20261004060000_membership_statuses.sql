-- Allow the new cosmetic membership statuses. They carry no extra permissions:
-- the app treats anything other than 'admin' / 'moderator' as a regular member.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%membership_status%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_membership_status_check
  check (membership_status in (
    'member', 'supporter', 'beta-tester', 'early-adopter', 'founder', 'contributor',
    'verified-brewer', 'pro-brewer', 'brewery', 'partner', 'sponsor', 'moderator', 'admin'
  ));
