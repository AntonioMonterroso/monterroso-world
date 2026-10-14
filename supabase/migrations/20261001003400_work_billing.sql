-- Trabajos: instalación/inscripción + mensualidad, conectados a las cuentas
alter table public.projects
  add column setup_fee numeric(12,2) not null default 0 check (setup_fee >= 0),
  add column monthly_fee numeric(12,2) not null default 0 check (monthly_fee >= 0),
  add column billing_day smallint check (billing_day between 1 and 28),
  add column monthly_start text check (monthly_start ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  add column monthly_end text check (monthly_end ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  add column account_id uuid references public.fin_accounts(id) on delete set null,
  add column reminder_event_id uuid references public.events(id) on delete set null;

alter table public.payments
  add column kind text not null default 'other' check (kind in ('setup','monthly','other')),
  add column period text check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  add column account_id uuid references public.fin_accounts(id) on delete set null;
-- una mensualidad por mes y por trabajo
create unique index payments_monthly_once on public.payments (project_id, period) where kind = 'monthly';

create trigger check_link before insert or update on public.projects for each row execute function public.check_money_link();
create trigger check_link before insert or update on public.payments for each row execute function public.check_money_link();
