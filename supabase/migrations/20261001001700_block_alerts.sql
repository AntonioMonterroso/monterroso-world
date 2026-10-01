-- Avisos del horario: cada bloque puede avisar cuando empieza (configurable en Ajustes)

alter table public.schedule_blocks add column notify boolean not null default true;

create table public.block_notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_id uuid not null references public.schedule_blocks(id) on delete cascade,
  occ_date date not null,
  kind text not null,                       -- alert:<min antes>
  sent_at timestamptz not null default now(),
  unique (block_id, occ_date, kind)
);
create index on public.block_notification_log (user_id, sent_at desc);
alter table public.block_notification_log enable row level security;
create policy "block_notification_log: lectura propia" on public.block_notification_log for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "block_notification_log: borrar propio" on public.block_notification_log for delete to authenticated
  using ((select auth.uid()) = user_id);
