-- Bloques de un solo día: si tienen fecha, solo aplican ese día (los demás se repiten cada semana)
alter table public.schedule_blocks add column on_date date;
create index on public.schedule_blocks (user_id, on_date) where on_date is not null;
