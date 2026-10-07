-- Conecta préstamos, pagos, aportes a metas y compras con las cuentas
alter table public.loans add column account_id uuid references public.fin_accounts(id) on delete set null;
alter table public.loan_payments add column account_id uuid references public.fin_accounts(id) on delete set null;

create table public.fin_goal_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,   -- al borrar la meta, el dinero vuelve a la cuenta
  account_id uuid not null references public.fin_accounts(id) on delete cascade,
  amount numeric(12,2) not null check (amount <> 0),                             -- + sale de la cuenta (aporte); − regresa (retiro)
  tx_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.fin_goal_moves (user_id, goal_id);
alter table public.fin_goal_moves enable row level security;
create policy "fin_goal_moves: dueño" on public.fin_goal_moves for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger set_updated_at before update on public.fin_goal_moves for each row execute function public.set_updated_at();
alter publication supabase_realtime add table public.fin_goal_moves;

create or replace function public.check_money_link() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.account_id is not null and not exists (select 1 from public.fin_accounts a where a.id = new.account_id and a.user_id = new.user_id) then raise exception 'cuenta inválida'; end if;
  if tg_table_name = 'fin_goal_moves' and not exists (select 1 from public.savings_goals g where g.id = new.goal_id and g.user_id = new.user_id) then raise exception 'meta inválida'; end if;
  return new;
end $$;
create trigger check_link before insert or update on public.loans for each row execute function public.check_money_link();
create trigger check_link before insert or update on public.loan_payments for each row execute function public.check_money_link();
create trigger check_link before insert or update on public.fin_goal_moves for each row execute function public.check_money_link();
