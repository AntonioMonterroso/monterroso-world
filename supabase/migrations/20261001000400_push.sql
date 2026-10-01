-- Notificaciones push: suscripciones, registro de envíos, posponer y cron cada minuto

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique check (length(endpoint) <= 2000),
  p256dh text not null,
  auth text not null,
  user_agent text check (user_agent is null or length(user_agent) <= 300),
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push_subscriptions: dueño" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Qué se envió y cuándo (evita duplicados; alimenta el centro de notificaciones)
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  occ_date date not null,
  kind text not null,                       -- alert:<min> | nag | snooze
  sent_at timestamptz not null default now(),
  nag_count integer not null default 1,
  unique (event_id, occ_date, kind)
);
alter table public.notification_log enable row level security;
create policy "notification_log: lectura propia" on public.notification_log for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.occurrence_state add column if not exists snoozed_until timestamptz;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Cada minuto llama a la función `push`. El secreto vive en Vault, no en este archivo.
select cron.schedule('push-reminders', '* * * * *', $job$
  select net.http_post(
    url := 'https://mrujxfkrvzfotvxgfadg.supabase.co/functions/v1/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
$job$);
