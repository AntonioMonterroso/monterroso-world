-- Aprender (videos con notas y repaso espaciado) y directorio de links / portafolio

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null check (provider in ('youtube','vimeo')),
  video_id text not null check (video_id ~ '^[A-Za-z0-9_-]{4,20}$'),
  title text not null check (length(title) between 1 and 300),
  topic text check (topic is null or length(topic) <= 80),               -- la "ruta" o tema
  status text not null default 'queue' check (status in ('queue','watching','done')),
  start_sec integer not null default 0 check (start_sec between 0 and 86400),
  finished_on date,
  review_step smallint not null default 0 check (review_step between 0 and 10),   -- repasos hechos
  next_review date,                                                        -- próximo repaso (nulo = ninguno)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.videos (user_id, status);

create table public.video_notes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  at_sec integer not null default 0 check (at_sec between 0 and 86400),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.video_notes (video_id, at_sec);

create table public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url text not null check (length(url) <= 1000 and url ~ '^https?://'),
  title text not null check (length(title) between 1 and 200),
  category text not null default 'Otros' check (length(category) between 1 and 60),
  description text check (description is null or length(description) <= 500),
  favorite boolean not null default false,
  portfolio boolean not null default false,                               -- aparece en la pestaña Portafolio
  image_url text check (image_url is null or (length(image_url) <= 1000 and image_url ~ '^https://')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.links (user_id, category);

do $$
declare t text;
begin
  foreach t in array array['videos','video_notes','links'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

create or replace function public.check_note_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.videos v where v.id = new.video_id and v.user_id = new.user_id) then
    raise exception 'video inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.video_notes for each row execute function public.check_note_owner();
