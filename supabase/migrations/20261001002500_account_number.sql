-- Número de cuenta bancaria (solo dígitos y guiones)
alter table public.fin_accounts add column account_number text check (account_number is null or account_number ~ '^[0-9-]{4,30}$');
