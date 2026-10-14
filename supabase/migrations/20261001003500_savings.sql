-- Ahorro: cada retiro dice por qué, y los retiros planeados esperan tu confirmación
create table public.savings_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  account_id uuid references public.fin_accounts(id) on delete set null,   -- adónde volvería el dinero
  amount numeric(12,2) not null check (amount > 0),
  planned_for date not null,
  reason text not null check (length(reason) between 1 and 300),
  status text not null default 'pending' check (status in ('pending','done','cancelled')),
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.savings_plans (user_id, status, planned_for);
alter table public.savings_plans enable row level security;
create policy "savings_plans: dueño" on public.savings_plans for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger set_updated_at before update on public.savings_plans for each row execute function public.set_updated_at();
create trigger check_link before insert or update on public.savings_plans for each row execute function public.check_money_link();
alter publication supabase_realtime add table public.savings_plans;

alter table public.fin_goal_moves
  add column reason text check (reason is null or length(reason) <= 300),
  add column reason_kind text check (reason_kind in ('emergency','planned','other')),
  add column plan_id uuid references public.savings_plans(id) on delete set null;
