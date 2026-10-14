-- El historial de ahorro se conserva aunque borres una cuenta, y los aportes sin cuenta también quedan registrados
alter table public.fin_goal_moves alter column account_id drop not null;
alter table public.fin_goal_moves drop constraint fin_goal_moves_account_id_fkey;
alter table public.fin_goal_moves add constraint fin_goal_moves_account_id_fkey foreign key (account_id) references public.fin_accounts(id) on delete set null;
