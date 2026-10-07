-- Recompensas que tú defines y los canjes que haces con tus puntos (los puntos se calculan de lo que ya haces)
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  cost integer not null check (cost between 1 and 100000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reward_id uuid references public.rewards(id) on delete set null,
  name text not null check (length(name) between 1 and 120),          -- se guarda el nombre por si la recompensa se borra
  cost integer not null check (cost between 1 and 100000),
  day date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$
declare t text;
begin
  foreach t in array array['rewards','reward_claims'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;
