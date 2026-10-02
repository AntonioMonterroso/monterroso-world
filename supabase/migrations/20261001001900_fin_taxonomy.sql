-- Áreas y categorías de dinero propias: se pueden crear, renombrar, ordenar y borrar

alter table public.fin_transactions drop constraint fin_transactions_area_check;
alter table public.fin_transactions add constraint fin_transactions_area_check check (length(area) between 1 and 40);
alter table public.subscriptions drop constraint subscriptions_area_check;
alter table public.subscriptions add constraint subscriptions_area_check check (length(area) between 1 and 40);

create table public.fin_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null check (length(key) between 1 and 40),        -- lo que guardan los movimientos ('web', 'music', 'personal' o uno propio)
  name text not null check (length(name) between 1 and 40),
  color text not null default 'var(--ink-soft)' check (length(color) <= 40),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create table public.fin_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  name text not null check (length(name) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

do $$
declare t text;
begin
  foreach t in array array['fin_areas','fin_categories'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;
