-- Cuentas: efectivo, bancos, tarjetas y billeteras. Cada movimiento puede ir a una cuenta; las transferencias mueven dinero entre cuentas.

create table public.fin_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  kind text not null default 'bank' check (kind in ('cash','bank','card','wallet')),
  bank text check (bank is null or length(bank) <= 60),            -- nombre del banco (BAC, Banrural, Industrial…)
  last4 text check (last4 is null or last4 ~ '^[0-9]{4}$'),
  opening_balance numeric(12,2) not null default 0,                -- saldo con el que empiezas a llevar la cuenta
  credit_limit numeric(12,2) check (credit_limit is null or credit_limit >= 0), -- solo tarjetas
  color text not null default 'var(--teal)' check (length(color) <= 40),
  position integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fin_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_id uuid not null references public.fin_accounts(id) on delete cascade,
  to_id uuid not null references public.fin_accounts(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  fee numeric(12,2) not null default 0 check (fee >= 0),            -- comisión del banco, sale de la cuenta de origen
  tx_date date not null default current_date,
  note text check (note is null or length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create index on public.fin_transfers (user_id, tx_date desc);

alter table public.fin_transactions add column account_id uuid references public.fin_accounts(id) on delete set null;
create index on public.fin_transactions (user_id, account_id);

do $$
declare t text;
begin
  foreach t in array array['fin_accounts','fin_transfers'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

-- Una cuenta referenciada siempre debe ser del mismo usuario
create or replace function public.check_account_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'fin_transactions' then
    if new.account_id is not null and not exists (select 1 from public.fin_accounts a where a.id = new.account_id and a.user_id = new.user_id) then raise exception 'cuenta inválida'; end if;
  else
    if not exists (select 1 from public.fin_accounts a where a.id = new.from_id and a.user_id = new.user_id)
       or not exists (select 1 from public.fin_accounts a where a.id = new.to_id and a.user_id = new.user_id) then raise exception 'cuenta inválida'; end if;
  end if;
  return new;
end $$;
create trigger check_account before insert or update on public.fin_transactions for each row execute function public.check_account_owner();
create trigger check_account before insert or update on public.fin_transfers for each row execute function public.check_account_owner();
