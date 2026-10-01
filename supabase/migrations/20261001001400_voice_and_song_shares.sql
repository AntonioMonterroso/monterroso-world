-- Notas de voz (privadas, el audio vive en el almacenamiento) y enlaces públicos de solo lectura de canciones/setlists.
-- Las notas de voz NUNCA se incluyen en un enlace público.

create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  song_id uuid references public.songs(id) on delete set null,
  title text not null check (length(title) between 1 and 200),
  duration_sec integer not null check (duration_sec between 1 and 600),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  mime text not null check (mime in ('audio/webm','audio/mp4','audio/ogg','audio/mpeg')),
  audio_path text not null check (length(audio_path) between 10 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.voice_notes (user_id, created_at desc);

create table public.song_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  song_id uuid references public.songs(id) on delete cascade,
  setlist_id uuid references public.setlists(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  include_notes boolean not null default true,        -- notas por línea ("// golpe abajo"); nunca notas de voz
  expires_at timestamptz,
  revoked boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((song_id is not null) <> (setlist_id is not null))
);

do $$
declare t text;
begin
  foreach t in array array['voice_notes','song_shares'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

create or replace function public.check_voice_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.song_id is not null and not exists (select 1 from public.songs s where s.id = new.song_id and s.user_id = new.user_id) then
    raise exception 'canción inválida';
  end if;
  if split_part(new.audio_path, '/', 1) <> new.user_id::text then
    raise exception 'audio inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.voice_notes for each row execute function public.check_voice_owner();

create or replace function public.check_share_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.song_id is not null and not exists (select 1 from public.songs s where s.id = new.song_id and s.user_id = new.user_id) then
    raise exception 'canción inválida';
  end if;
  if new.setlist_id is not null and not exists (select 1 from public.setlists l where l.id = new.setlist_id and l.user_id = new.user_id) then
    raise exception 'setlist inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.song_shares for each row execute function public.check_share_owner();

-- Almacenamiento privado de audio: cada quien solo ve su carpeta (<user_id>/archivo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice-notes', 'voice-notes', false, 5242880, array['audio/webm','audio/mp4','audio/ogg','audio/mpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['audio/webm','audio/mp4','audio/ogg','audio/mpeg'];

create policy "voice-notes: ver lo propio" on storage.objects for select to authenticated
  using (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "voice-notes: subir a la propia carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "voice-notes: borrar lo propio" on storage.objects for delete to authenticated
  using (bucket_id = 'voice-notes' and (storage.foldername(name))[1] = (select auth.uid())::text);
