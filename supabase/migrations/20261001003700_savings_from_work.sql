-- Ahorro conectado con Trabajos: cada aporte puede venir de un cobro
alter table public.fin_goal_moves add column source_payment_id uuid references public.payments(id) on delete set null;
create index on public.fin_goal_moves (source_payment_id) where source_payment_id is not null;
