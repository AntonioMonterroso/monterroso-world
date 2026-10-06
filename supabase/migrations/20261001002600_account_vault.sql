-- El número de cuenta ya no se guarda en claro: vive cifrado en la Bóveda y la cuenta solo apunta a él
alter table public.fin_accounts drop column if exists account_number;
alter table public.fin_accounts add column vault_item_id uuid references public.vault_items(id) on delete set null;

alter table public.vault_items drop constraint if exists vault_items_category_check;
alter table public.vault_items add constraint vault_items_category_check check (category in ('password','email','client','api','note','bank'));

create or replace function public.check_account_vault() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.vault_item_id is not null and not exists (select 1 from public.vault_items v where v.id = new.vault_item_id and v.user_id = new.user_id) then raise exception 'ítem de bóveda inválido'; end if;
  return new;
end $$;
create trigger check_vault before insert or update on public.fin_accounts for each row execute function public.check_account_vault();
