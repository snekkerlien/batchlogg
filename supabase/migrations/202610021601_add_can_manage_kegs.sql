alter table public.profiles
  add column if not exists can_manage_kegs boolean not null default false;
