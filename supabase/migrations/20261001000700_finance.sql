-- Finanzas: movimientos, presupuesto, metas, suscripciones y préstamos

create table public.fin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  category text not null default 'Otros' check (length(category) between 1 and 60),
  area text not null default 'personal' check (area in ('web','music','personal')),
  tx_date date not null default current_date,
  note text check (note is null or length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.fin_transactions (user_id, tx_date desc);

create table public.fin_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (length(category) between 1 and 60),
  limit_amount numeric(12,2) not null check (limit_amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, currency)
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  target numeric(12,2) not null check (target > 0),
  saved numeric(12,2) not null default 0 check (saved >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  period text not null default 'monthly' check (period in ('weekly','monthly','yearly')),
  next_due date not null,
  category text not null default 'Software y servicios' check (length(category) between 1 and 60),
  area text not null default 'personal' check (area in ('web','music','personal')),
  url text check (url is null or length(url) <= 500),
  notes text check (notes is null or length(notes) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Préstamos: 'lent' = yo presté (me deben), 'borrowed' = me prestaron (debo)
create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  direction text not null check (direction in ('lent','borrowed')),
  person text not null check (length(person) between 1 and 200),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  loan_date date not null default current_date,
  due_date date,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null default current_date,
  note text check (note is null or length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.loan_payments (user_id, loan_id);

do $$
declare t text;
begin
  foreach t in array array['fin_transactions','fin_budgets','savings_goals','subscriptions','loans','loan_payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

create or replace function public.check_loan_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.loans l where l.id = new.loan_id and l.user_id = new.user_id) then
    raise exception 'préstamo inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.loan_payments for each row execute function public.check_loan_owner();
