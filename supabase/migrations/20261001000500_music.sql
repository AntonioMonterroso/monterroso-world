-- Música: canciones (letra con acordes), setlists y registro de práctica

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  artist text check (artist is null or length(artist) <= 200),
  song_key text check (song_key is null or length(song_key) <= 6),        -- tono original, p. ej. G, Am, Bb
  bpm smallint check (bpm is null or bpm between 20 and 300),
  time_sig text not null default '4/4' check (time_sig ~ '^[1-9][0-9]?/(2|4|8|16)$'),
  status text not null default 'learning' check (status in ('learning','practicing','ready')),
  instruments text[] not null default '{}',                              -- guitar, drums, piano, production, bass, vocals
  duration_sec integer check (duration_sec is null or duration_sec between 1 and 7200),
  capo smallint not null default 0 check (capo between 0 and 12),
  content text not null default '' check (length(content) <= 60000),     -- formato ChordPro: [Am] en línea, "# Sección", "// nota"
  notes text check (notes is null or length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.songs (user_id, title);

create table public.setlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  event_date date,
  notes text check (notes is null or length(notes) <= 2000),
  song_ids uuid[] not null default '{}',                                  -- orden de las canciones
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(song_ids, 1) is null or array_length(song_ids, 1) <= 100)
);

create table public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  song_id uuid references public.songs(id) on delete set null,
  instrument text not null default 'guitar' check (length(instrument) <= 30),
  minutes smallint not null check (minutes between 1 and 720),
  practiced_on date not null default current_date,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.practice_logs (user_id, practiced_on desc);

do $$
declare t text;
begin
  foreach t in array array['songs','setlists','practice_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Una práctica solo puede apuntar a una canción propia
create or replace function public.check_practice_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.song_id is not null and not exists (select 1 from public.songs s where s.id = new.song_id and s.user_id = new.user_id) then
    raise exception 'canción inválida';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.practice_logs for each row execute function public.check_practice_owner();

alter publication supabase_realtime add table public.songs;
alter publication supabase_realtime add table public.setlists;
alter publication supabase_realtime add table public.practice_logs;
