-- Púlpito: prédicas (guion + diapositivas) y notas de fe

create table public.sermons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  scripture text check (scripture is null or length(scripture) <= 200),     -- pasaje principal
  preach_date date,
  status text not null default 'draft' check (status in ('draft','ready','delivered')),
  notes text check (notes is null or length(notes) <= 4000),
  live_token text not null default encode(gen_random_bytes(18), 'hex'),     -- canal secreto de la pantalla en vivo
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sermon_phases (
  id uuid primary key default gen_random_uuid(),
  sermon_id uuid not null references public.sermons(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position integer not null default 0,
  kind text not null default 'other' check (kind in ('intro','reading','characters','context','advice','application','closing','other')),
  title text not null check (length(title) between 1 and 200),
  body text not null default '' check (length(body) <= 20000),
  minutes smallint check (minutes is null or minutes between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.sermon_phases (sermon_id, position);

create table public.sermon_slides (
  id uuid primary key default gen_random_uuid(),
  sermon_id uuid not null references public.sermons(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position integer not null default 0,
  kind text not null default 'verse' check (kind in ('title','verse','phrase','image','embed')),
  title text check (title is null or length(title) <= 200),
  body text check (body is null or length(body) <= 4000),
  reference text check (reference is null or length(reference) <= 120),
  url text check (url is null or (length(url) <= 1000 and url ~ '^https://')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.sermon_slides (sermon_id, position);

create table public.faith_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null default 'heard' check (kind in ('heard','verse','prayer','message')),
  title text not null check (length(title) between 1 and 200),
  body text check (body is null or length(body) <= 10000),
  reference text check (reference is null or length(reference) <= 200),
  speaker text check (speaker is null or length(speaker) <= 200),
  note_date date not null default current_date,
  answered boolean not null default false,                                  -- para peticiones de oración
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.faith_notes (user_id, note_date desc);

do $$
declare t text;
begin
  foreach t in array array['sermons','sermon_phases','sermon_slides','faith_notes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Fases y diapositivas solo cuelgan de prédicas propias
create or replace function public.check_sermon_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.sermons s where s.id = new.sermon_id and s.user_id = new.user_id) then
    raise exception 'prédica inválida';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.sermon_phases for each row execute function public.check_sermon_owner();
create trigger check_owner before insert or update on public.sermon_slides for each row execute function public.check_sermon_owner();

alter publication supabase_realtime add table public.sermons;
alter publication supabase_realtime add table public.sermon_phases;
alter publication supabase_realtime add table public.sermon_slides;
alter publication supabase_realtime add table public.faith_notes;
