-- Trabajos por mes: proyectos y cobros (hechos y por hacer)

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  client text check (client is null or length(client) <= 200),
  status text not null default 'active' check (status in ('idea','active','review','delivered','closed')),
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),         -- mes al que pertenece, YYYY-MM
  due_date date,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  site_url text check (site_url is null or length(site_url) <= 500),
  notes text check (notes is null or length(notes) <= 4000),
  checklist jsonb not null default '[]'::jsonb,                           -- [{id,text,done}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 100)
);
create index on public.projects (user_id, month);

-- Cobros: con paid_at = cobrado; sin paid_at = pendiente (due_date es cuándo se espera)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  due_date date,
  paid_at date,
  method text check (method is null or length(method) <= 60),
  note text check (note is null or length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.payments (user_id, project_id);

do $$
declare t text;
begin
  foreach t in array array['projects','payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Un cobro solo puede colgar de un proyecto del mismo usuario
create or replace function public.check_payment_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id) then
    raise exception 'proyecto inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.payments for each row execute function public.check_payment_owner();

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.payments;
