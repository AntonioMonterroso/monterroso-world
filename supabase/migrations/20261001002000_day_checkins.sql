-- Energía, ánimo y cierre del día: un registro por día

create table public.day_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  energy smallint check (energy is null or energy between 1 and 5),
  mood smallint check (mood is null or mood between 1 and 5),
  win text check (win is null or length(win) <= 500),            -- lo mejor del día
  tomorrow text check (tomorrow is null or length(tomorrow) <= 500), -- lo que queda para mañana
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create index on public.day_checkins (user_id, day desc);

alter table public.day_checkins enable row level security;
create policy "day_checkins: dueño" on public.day_checkins for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger set_updated_at before update on public.day_checkins for each row execute function public.set_updated_at();
alter publication supabase_realtime add table public.day_checkins;
