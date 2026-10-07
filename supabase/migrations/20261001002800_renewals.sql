-- Vencimientos de rutina: lo que se renueva solo y se olvida (dominio, seguro, cuerdas, revisión del carro…)
create table public.renewals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  every_n smallint not null default 1 check (every_n between 1 and 60),
  unit text not null default 'month' check (unit in ('week','month','year')),
  next_due date not null,
  lead_days smallint not null default 7 check (lead_days between 0 and 90),   -- cuántos días antes avisar
  note text check (note is null or length(note) <= 300),
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.renewals enable row level security;
create policy "renewals: dueño" on public.renewals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger set_updated_at before update on public.renewals for each row execute function public.set_updated_at();
alter publication supabase_realtime add table public.renewals;
create trigger check_event before insert or update on public.renewals for each row execute function public.check_event_ref();
