-- Dónde dejé las cosas, lo que presté, y lo que prometí a otras personas

create table public.stuff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  kind text not null default 'placed' check (kind in ('placed','lent')),
  place text check (place is null or length(place) <= 200),       -- dónde está ("cajón del escritorio")
  person text check (person is null or length(person) <= 120),    -- a quién se lo presté
  remind_on date,                                                  -- cuándo pedirlo de vuelta
  event_id uuid references public.events(id) on delete set null,
  returned boolean not null default false,
  returned_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.stuff (user_id, returned);

create table public.promises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null check (length(text) between 1 and 300),
  person text check (person is null or length(person) <= 120),
  due_date date,
  event_id uuid references public.events(id) on delete set null,
  done boolean not null default false,
  done_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.promises (user_id, done);

do $$
declare t text;
begin
  foreach t in array array['stuff','promises'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

create or replace function public.check_event_ref() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.event_id is not null and not exists (select 1 from public.events e where e.id = new.event_id and e.user_id = new.user_id) then raise exception 'evento inválido'; end if;
  return new;
end $$;
create trigger check_event before insert or update on public.stuff for each row execute function public.check_event_ref();
create trigger check_event before insert or update on public.promises for each row execute function public.check_event_ref();
