-- Monterroso World · base: ajustes, bandeja de entrada, prioridades y bloques de horario.
-- Todas las tablas son privadas por usuario (RLS).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Ajustes por usuario (zona horaria, horas de silencio, preferencias)
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Bandeja de entrada: lo que se captura rápido y se clasifica después
create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (length(text) between 1 and 2000),
  kind text not null default 'note' check (kind in ('note','idea','task','link','question','worry')),
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.inbox_items (user_id, processed, created_at desc);

-- Tareas y prioridades del día
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 500),
  done boolean not null default false,
  priority_date date,                       -- si es una de las 3 prioridades de ese día
  importance smallint not null default 2 check (importance between 1 and 4),
  estimate_min integer check (estimate_min is null or estimate_min > 0),
  context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks (user_id, priority_date);

-- Bloques del horario (por día de la semana). 0 = domingo … 6 = sábado
create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  kind text not null default 'work' check (kind in ('work','code','rehearsal','church','study','exercise','rest','meeting','other')),
  days smallint[] not null default '{1,2,3,4,5}',
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint not null check (end_min between 1 and 1440),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_min > start_min)
);
create index on public.schedule_blocks (user_id, active);

do $$
declare t text;
begin
  foreach t in array array['settings','inbox_items','tasks','schedule_blocks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
