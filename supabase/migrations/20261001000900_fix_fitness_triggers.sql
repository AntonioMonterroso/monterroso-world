-- Corrige las verificaciones de propietario: una función por tabla (la compartida leía campos inexistentes)
drop trigger if exists check_owner on public.workout_items;
drop trigger if exists check_owner on public.workout_logs;
drop trigger if exists check_owner on public.share_links;
drop function if exists public.check_fitness_owner();

create or replace function public.check_item_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.workouts w where w.id = new.workout_id and w.user_id = new.user_id) then
    raise exception 'rutina inválida';
  end if;
  return new;
end $$;

create or replace function public.check_log_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.partner_id is not null and not exists (select 1 from public.training_partners p where p.id = new.partner_id and p.user_id = new.user_id) then
    raise exception 'compañero inválido';
  end if;
  if new.workout_id is not null and not exists (select 1 from public.workouts w where w.id = new.workout_id and w.user_id = new.user_id) then
    raise exception 'rutina inválida';
  end if;
  return new;
end $$;

create or replace function public.check_link_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.training_partners p where p.id = new.partner_id and p.user_id = new.user_id) then
    raise exception 'compañero inválido';
  end if;
  return new;
end $$;

create trigger check_owner before insert or update on public.workout_items for each row execute function public.check_item_owner();
create trigger check_owner before insert or update on public.workout_logs for each row execute function public.check_log_owner();
create trigger check_owner before insert or update on public.share_links for each row execute function public.check_link_owner();
