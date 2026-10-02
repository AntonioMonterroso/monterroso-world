-- Checklist de salida: listas por contexto (trabajo, ensayo, tocada, iglesia, gimnasio, cliente)

create table public.exit_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  kind text not null default 'other' check (kind in ('work','rehearsal','gig','church','gym','client','other')),
  items jsonb not null default '[]'::jsonb,                      -- [{id, text, forgot}]
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 60)
);
alter table public.exit_lists enable row level security;
create policy "exit_lists: dueño" on public.exit_lists for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create trigger set_updated_at before update on public.exit_lists for each row execute function public.set_updated_at();
alter publication supabase_realtime add table public.exit_lists;
