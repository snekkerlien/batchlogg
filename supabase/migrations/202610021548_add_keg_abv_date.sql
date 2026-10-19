alter table public.kegs
  add column if not exists abv numeric(5, 2),
  add column if not exists brew_date date;
