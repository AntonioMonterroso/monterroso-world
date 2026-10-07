-- Reglas «si pasa X, entonces hago Y»: atan una acción a un momento concreto del día
create table public.if_then (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trigger_kind text not null check (trigger_kind in ('time','block_start','block_end','open_morning','open_night')),
  time_min smallint check (time_min is null or time_min between 0 and 1439),
  block_kind text check (block_kind is null or block_kind in ('work','code','rehearsal','church','study','exercise','rest','meeting','other')),
  action text not null check (length(action) between 1 and 200),
  event_id uuid references public.events(id) on delete set null,   -- las reglas por hora crean un recordatorio diario
  active boolean not null default true,
  last_done date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.if_then enable row level security;
create policy "if_then: dueño" on public.if_then for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger set_updated_at before update on public.if_then for each row execute function public.set_updated_at();
alter publication supabase_realtime add table public.if_then;
create trigger check_event before insert or update on public.if_then for each row execute function public.check_event_ref();
