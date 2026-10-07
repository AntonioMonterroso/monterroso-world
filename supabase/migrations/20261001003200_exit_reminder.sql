-- Aviso push para "Antes de salir": cada lista puede tener su recordatorio
alter table public.exit_lists
  add column remind_min integer check (remind_min between 0 and 1439),
  add column event_id uuid references public.events(id) on delete set null;
