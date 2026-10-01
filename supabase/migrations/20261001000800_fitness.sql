-- Ejercicio: rutinas, sesiones, cuerpo, salud diaria y compañeros con enlace compartido

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  notes text check (notes is null or length(notes) <= 2000),
  days smallint[] not null default '{}',                                  -- días sugeridos (0=domingo)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_items (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position integer not null default 0,
  name text not null check (length(name) between 1 and 120),
  sets smallint not null default 3 check (sets between 1 and 20),
  reps text not null default '10' check (length(reps) <= 20),
  weight numeric(6,2) check (weight is null or weight >= 0),
  rest_sec smallint check (rest_sec is null or rest_sec between 0 and 900),
  notes text check (notes is null or length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.workout_items (workout_id, position);

create table public.training_partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sesión registrada. partner_id nulo = yo. session_key une los registros de una sesión conjunta.
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  partner_id uuid references public.training_partners(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  session_key uuid,
  title text not null check (length(title) between 1 and 200),
  performed_on date not null default current_date,
  duration_min smallint check (duration_min is null or duration_min between 1 and 600),
  entries jsonb not null default '[]'::jsonb,                             -- [{name, sets:[{reps, weight}]}]
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(entries) = 'array' and jsonb_array_length(entries) <= 40 and length(entries::text) <= 30000)
);
create index on public.workout_logs (user_id, performed_on desc);

create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 400),
  note text check (note is null or length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.body_metrics (user_id, measured_on desc);

create table public.health_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  water_glasses smallint not null default 0 check (water_glasses between 0 and 40),
  sleep_hours numeric(3,1) check (sleep_hours is null or sleep_hours between 0 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Enlaces para compañeros: solo se guarda el hash del token. Se accede únicamente por la función `share`.
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  partner_id uuid not null references public.training_partners(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  workout_ids uuid[] not null default '{}',
  can_log boolean not null default true,
  expires_at timestamptz,
  pin_salt text,
  pin_hash text,
  revoked boolean not null default false,
  failed_attempts smallint not null default 0,
  locked_until timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((pin_hash is null) = (pin_salt is null)),
  check (array_length(workout_ids, 1) is null or array_length(workout_ids, 1) <= 50)
);

do $$
declare t text;
begin
  foreach t in array array['workouts','workout_items','training_partners','workout_logs','body_metrics','health_days','share_links'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;

-- Las filas relacionadas deben ser del mismo usuario
create or replace function public.check_fitness_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'workout_items' and not exists (select 1 from public.workouts w where w.id = new.workout_id and w.user_id = new.user_id) then
    raise exception 'rutina inválida';
  end if;
  if tg_table_name = 'workout_logs' then
    if new.partner_id is not null and not exists (select 1 from public.training_partners p where p.id = new.partner_id and p.user_id = new.user_id) then raise exception 'compañero inválido'; end if;
    if new.workout_id is not null and not exists (select 1 from public.workouts w where w.id = new.workout_id and w.user_id = new.user_id) then raise exception 'rutina inválida'; end if;
  end if;
  if tg_table_name = 'share_links' and not exists (select 1 from public.training_partners p where p.id = new.partner_id and p.user_id = new.user_id) then
    raise exception 'compañero inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.workout_items for each row execute function public.check_fitness_owner();
create trigger check_owner before insert or update on public.workout_logs for each row execute function public.check_fitness_owner();
create trigger check_owner before insert or update on public.share_links for each row execute function public.check_fitness_owner();
