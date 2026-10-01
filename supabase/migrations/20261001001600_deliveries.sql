-- Envíos y seguimiento: qué mandaste, a quién, en qué estado está y cuándo dar seguimiento

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  recipient text check (recipient is null or length(recipient) <= 200),
  kind text not null default 'other' check (kind in ('quote','proposal','invoice','file','song','message','other')),
  channel text not null default 'email' check (channel in ('email','whatsapp','message','call','other')),
  status text not null default 'to_send' check (status in ('to_send','sent','seen','replied','paid','closed')),
  sent_at timestamptz,
  follow_up_date date,
  event_id uuid references public.events(id) on delete set null,              -- recordatorio de seguimiento
  project_id uuid references public.projects(id) on delete set null,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.deliveries (user_id, status);

alter table public.deliveries enable row level security;
create policy "deliveries: dueño" on public.deliveries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger set_updated_at before update on public.deliveries for each row execute function public.set_updated_at();
alter publication supabase_realtime add table public.deliveries;

create or replace function public.check_delivery_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.event_id is not null and not exists (select 1 from public.events e where e.id = new.event_id and e.user_id = new.user_id) then
    raise exception 'evento inválido';
  end if;
  if new.project_id is not null and not exists (select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id) then
    raise exception 'proyecto inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.deliveries for each row execute function public.check_delivery_owner();

-- El centro de avisos lee el historial junto con el título del evento
create policy "notification_log: borrar propio" on public.notification_log for delete to authenticated
  using ((select auth.uid()) = user_id);
