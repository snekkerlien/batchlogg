create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 200),
  amount numeric not null default 0 check (amount >= 0),
  unit text not null default '' check (length(unit) <= 32),
  is_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_list_items_user_created_idx
  on public.shopping_list_items (user_id, created_at desc);

alter table public.shopping_list_items enable row level security;

create policy "Users can view their shopping list"
  on public.shopping_list_items for select
  using (auth.uid() = user_id);

create policy "Users can add to their shopping list"
  on public.shopping_list_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their shopping list"
  on public.shopping_list_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can remove from their shopping list"
  on public.shopping_list_items for delete
  using (auth.uid() = user_id);
