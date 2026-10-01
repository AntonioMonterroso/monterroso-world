-- Hábitos y modo enfoque

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  target_per_week smallint not null default 7 check (target_per_week between 1 and 7),
  moment text not null default 'any' check (moment in ('morning','afternoon','evening','any')),
  position integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, day)
);
create index on public.habit_logs (user_id, day desc);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task text check (task is null or length(task) <= 300),
  planned_min smallint not null check (planned_min between 1 and 240),
  actual_min smallint not null default 0 check (actual_min between 0 and 600),
  completed boolean not null default false,
  distractions smallint not null default 0 check (distractions between 0 and 500),
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.focus_sessions (user_id, started_at desc);

-- De dónde vino una captura (por ejemplo, el estacionamiento de distracciones del modo enfoque)
alter table public.inbox_items add column if not exists source text not null default 'manual' check (source in ('manual','focus'));

do $$
declare t text;
begin
  foreach t in array array['habits','habit_logs','focus_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

create or replace function public.check_habit_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.habits h where h.id = new.habit_id and h.user_id = new.user_id) then
    raise exception 'hábito inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.habit_logs for each row execute function public.check_habit_owner();
