-- Corrige check_money_link: referenciar new.goal_id fallaba en préstamos y pagos (no tienen esa columna)
create or replace function public.check_money_link() returns trigger
language plpgsql set search_path = '' as $$
declare goal uuid := nullif(to_jsonb(new)->>'goal_id', '')::uuid;
begin
  if new.account_id is not null and not exists (select 1 from public.fin_accounts a where a.id = new.account_id and a.user_id = new.user_id) then raise exception 'cuenta inválida'; end if;
  if goal is not null and not exists (select 1 from public.savings_goals g where g.id = goal and g.user_id = new.user_id) then raise exception 'meta inválida'; end if;
  return new;
end $$;
