-- Eventos y recordatorios (únicos o con repetición) + estado por fecha (hecho, checklist)

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null default 'event' check (type in ('event','reminder')),
  title text not null check (length(title) between 1 and 200),
  action text check (action is null or length(action) <= 500),          -- qué debo hacer
  kind text not null default 'other' check (kind in ('church','meeting','rehearsal','outing','appointment','work','other')),
  start_date date not null,
  start_min smallint not null check (start_min between 0 and 1439),
  end_min smallint check (end_min is null or (end_min > start_min and end_min <= 1440)),
  repeat text not null default 'none' check (repeat in ('none','daily','weekly','monthly')),
  interval_n smallint not null default 1 check (interval_n between 1 and 52),
  weekdays smallint[] not null default '{}',                              -- 0=domingo … 6=sábado
  until date,
  exceptions date[] not null default '{}',                                -- fechas omitidas
  location text check (location is null or length(location) <= 300),
  contact text check (contact is null or length(contact) <= 200),
  link text check (link is null or length(link) <= 500),
  notes text check (notes is null or length(notes) <= 2000),
  alerts smallint[] not null default '{10}',                              -- minutos antes (0 = a la hora)
  persistent boolean not null default false,                              -- insistir hasta confirmar
  checklist jsonb not null default '[]'::jsonb,                           -- [{id,text}]
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 50),
  check (array_length(alerts, 1) is null or array_length(alerts, 1) <= 10)
);
create index on public.events (user_id, active, start_date);

create table public.occurrence_state (
  event_id uuid not null references public.events(id) on delete cascade,
  occ_date date not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  done boolean not null default false,
  checked text[] not null default '{}',                                   -- ids de checklist marcados
  updated_at timestamptz not null default now(),
  primary key (event_id, occ_date)
);

do $$
declare t text;
begin
  foreach t in array array['events','occurrence_state'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Un estado solo puede apuntar a un evento del mismo usuario
create or replace function public.check_state_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.events e where e.id = new.event_id and e.user_id = new.user_id) then
    raise exception 'evento inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.occurrence_state for each row execute function public.check_state_owner();

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.occurrence_state;
