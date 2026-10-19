alter table public.inventory_items
  add column if not exists alpha_acid numeric check (alpha_acid is null or (alpha_acid > 0 and alpha_acid <= 100)),
  add column if not exists ebc numeric check (ebc is null or ebc >= 0),
  add column if not exists hop_year integer check (hop_year is null or (hop_year >= 1900 and hop_year <= 2200));
