-- Rutinas de mañana, de noche o propias: pasos con tiempo, ejecución guiada y racha

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  kind text not null default 'custom' check (kind in ('morning','evening','custom')),
  start_min smallint check (start_min is null or start_min between 0 and 1439),    -- hora a la que suele empezar
  days smallint[] not null default '{0,1,2,3,4,5,6}',
  position integer not null default 0,
  event_id uuid references public.events(id) on delete set null,                    -- recordatorio diario (usa los avisos push)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routine_steps (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position integer not null default 0,
  title text not null check (length(title) between 1 and 160),
  minutes smallint check (minutes is null or minutes between 1 and 180),
  note text check (note is null or length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.routine_steps (routine_id, position);

create table public.routine_runs (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  done_steps text[] not null default '{}',
  total_steps smallint not null default 0 check (total_steps between 0 and 100),
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (routine_id, day)
);
create index on public.routine_runs (user_id, day desc);

do $$
declare t text;
begin
  foreach t in array array['routines','routine_steps','routine_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

create or replace function public.check_routine_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'routines' then
    if new.event_id is not null and not exists (select 1 from public.events e where e.id = new.event_id and e.user_id = new.user_id) then
      raise exception 'recordatorio inválido';
    end if;
  elsif not exists (select 1 from public.routines r where r.id = new.routine_id and r.user_id = new.user_id) then
    raise exception 'rutina inválida';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.routines for each row execute function public.check_routine_owner();
create trigger check_owner before insert or update on public.routine_steps for each row execute function public.check_routine_owner();
create trigger check_owner before insert or update on public.routine_runs for each row execute function public.check_routine_owner();
