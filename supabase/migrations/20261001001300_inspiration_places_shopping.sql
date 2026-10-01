-- Inspiración (tableros, links, capturas), lugares y viajes, y lista de compras

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.inspirations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  board_id uuid references public.boards(id) on delete set null,
  kind text not null check (kind in ('link','image','note')),
  title text not null check (length(title) between 1 and 200),
  url text check (url is null or (length(url) <= 1000 and url ~ '^https?://')),
  note text check (note is null or length(note) <= 2000),
  tags text[] not null default '{}' check (array_length(tags, 1) is null or array_length(tags, 1) <= 12),
  image_path text check (image_path is null or length(image_path) <= 300),   -- ruta en el almacenamiento privado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'link' or url is not null),
  check (kind <> 'image' or image_path is not null)
);
create index on public.inspirations (user_id, created_at desc);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  start_date date,
  end_date date,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  name text not null check (length(name) between 1 and 200),
  category text not null default 'Otro' check (length(category) between 1 and 60),
  status text not null default 'want' check (status in ('want','visited')),
  address text check (address is null or length(address) <= 300),
  url text check (url is null or (length(url) <= 1000 and url ~ '^https?://')),
  notes text check (notes is null or length(notes) <= 1000),
  rating smallint check (rating is null or rating between 1 and 5),
  visited_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.places (user_id, status);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  priority smallint not null default 2 check (priority between 1 and 3),     -- 1 alta, 2 media, 3 baja
  category text not null default 'Otro' check (length(category) between 1 and 60),
  price numeric(12,2) check (price is null or price >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  store text check (store is null or length(store) <= 200),
  url text check (url is null or (length(url) <= 1000 and url ~ '^https?://')),
  notes text check (notes is null or length(notes) <= 500),
  status text not null default 'pending' check (status in ('pending','bought')),
  bought_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.shopping_items (user_id, status, priority);

do $$
declare t text;
begin
  foreach t in array array['boards','inspirations','trips','places','shopping_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

-- Las referencias deben ser del mismo usuario
create or replace function public.check_inspiration_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.board_id is not null and not exists (select 1 from public.boards b where b.id = new.board_id and b.user_id = new.user_id) then
    raise exception 'tablero inválido';
  end if;
  if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.user_id::text then
    raise exception 'imagen inválida';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.inspirations for each row execute function public.check_inspiration_owner();

create or replace function public.check_place_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.trip_id is not null and not exists (select 1 from public.trips t where t.id = new.trip_id and t.user_id = new.user_id) then
    raise exception 'viaje inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.places for each row execute function public.check_place_owner();

-- Almacenamiento privado para capturas: cada quien solo ve su carpeta (<user_id>/archivo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspiration', 'inspiration', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

create policy "inspiration: ver lo propio" on storage.objects for select to authenticated
  using (bucket_id = 'inspiration' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "inspiration: subir a la propia carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'inspiration' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "inspiration: borrar lo propio" on storage.objects for delete to authenticated
  using (bucket_id = 'inspiration' and (storage.foldername(name))[1] = (select auth.uid())::text);
