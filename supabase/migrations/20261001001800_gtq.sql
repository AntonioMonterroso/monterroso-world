-- Todo el dinero del sistema es en quetzales
alter table public.projects alter column currency set default 'GTQ';
alter table public.fin_transactions alter column currency set default 'GTQ';
alter table public.fin_budgets alter column currency set default 'GTQ';
alter table public.savings_goals alter column currency set default 'GTQ';
alter table public.subscriptions alter column currency set default 'GTQ';
alter table public.loans alter column currency set default 'GTQ';
alter table public.shopping_items alter column currency set default 'GTQ';
update public.projects set currency = 'GTQ' where currency <> 'GTQ';
update public.fin_transactions set currency = 'GTQ' where currency <> 'GTQ';
update public.savings_goals set currency = 'GTQ' where currency <> 'GTQ';
update public.subscriptions set currency = 'GTQ' where currency <> 'GTQ';
update public.loans set currency = 'GTQ' where currency <> 'GTQ';
update public.shopping_items set currency = 'GTQ' where currency <> 'GTQ';
