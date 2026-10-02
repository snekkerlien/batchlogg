create or replace function public.create_kar_with_limit()
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  vessel_limit integer;
  vessel_count integer;
  next_number integer;
  created_vessel public.kar%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text, 0)
  );

  select coalesce(max_vessels, 12)::integer
  into vessel_limit
  from public.profiles
  where id = current_user_id;

  vessel_limit := coalesce(vessel_limit, 12);

  select count(*)::integer, (coalesce(max(nummer), 0) + 1)::integer
  into vessel_count, next_number
  from public.kar
  where user_id = current_user_id;

  if vessel_count >= vessel_limit then
    return jsonb_build_object(
      'created', false,
      'maxVessels', vessel_limit
    );
  end if;

  insert into public.kar (user_id, nummer, "displayNummer", status)
  values (
    current_user_id,
    next_number,
    vessel_count + 1,
    'Ledig'
  )
  returning * into created_vessel;

  return jsonb_build_object(
    'created', true,
    'maxVessels', vessel_limit,
    'kar', to_jsonb(created_vessel)
  );
end;
$$;

revoke all on function public.create_kar_with_limit() from public, anon;
grant execute on function public.create_kar_with_limit() to authenticated;

create or replace function public.enforce_kar_limit()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  vessel_limit integer;
  vessel_count integer;
begin
  if auth.uid() is not null and new.user_id <> auth.uid() then
    raise exception 'Cannot create a vessel for another user'
      using errcode = '42501';
  end if;

  if new.user_id is null then
    raise exception 'Vessel owner is required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.user_id::text, 0)
  );

  select coalesce(max_vessels, 12)::integer
  into vessel_limit
  from public.profiles
  where id = new.user_id;

  vessel_limit := coalesce(vessel_limit, 12);

  select count(*)::integer
  into vessel_count
  from public.kar
  where user_id = new.user_id;

  if vessel_count >= vessel_limit then
    raise exception 'Vessel limit reached'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_kar_limit_before_insert on public.kar;
create trigger enforce_kar_limit_before_insert
before insert on public.kar
for each row
execute function public.enforce_kar_limit();
