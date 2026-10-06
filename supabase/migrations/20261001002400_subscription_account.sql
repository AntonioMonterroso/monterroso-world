-- Cada suscripción puede pagarse con una cuenta (banco, tarjeta, efectivo)
alter table public.subscriptions add column account_id uuid references public.fin_accounts(id) on delete set null;

create or replace function public.check_sub_account() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.account_id is not null and not exists (select 1 from public.fin_accounts a where a.id = new.account_id and a.user_id = new.user_id) then raise exception 'cuenta inválida'; end if;
  return new;
end $$;
create trigger check_account before insert or update on public.subscriptions for each row execute function public.check_sub_account();
