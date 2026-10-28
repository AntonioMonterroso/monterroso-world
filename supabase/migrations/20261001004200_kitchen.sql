-- Cocina: despensa (lo que hay en casa) y recetario personal.
-- Las recetas iniciales se cargan desde la app la primera vez (src/lib/kitchenSeed.ts), a nombre del usuario.

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  category text not null default 'Otro' check (length(category) between 1 and 60),
  have boolean not null default true,
  notes text check (notes is null or length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index on public.pantry_items (user_id, lower(name));

-- ingredients: [{ "n": "2 huevos", "k": "Huevos", "opt": false }]  (k = nombre en la despensa, o null si no se controla, como el agua)
-- steps: ["Paso 1", "Paso 2", …]
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 160),
  meal text not null default 'almuerzo' check (meal in ('desayuno','almuerzo','cena','sopa','rapida','postre','extra')),
  minutes smallint check (minutes is null or minutes between 1 and 1440),
  servings smallint check (servings is null or servings between 1 and 50),
  ingredients jsonb not null default '[]'::jsonb check (jsonb_typeof(ingredients) = 'array' and length(ingredients::text) <= 20000),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array' and length(steps::text) <= 20000),
  tips text check (tips is null or length(tips) <= 1000),
  favorite boolean not null default false,
  cooked_count integer not null default 0 check (cooked_count >= 0),
  last_cooked date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.recipes (user_id, meal);

do $$
declare t text;
begin
  foreach t in array array['pantry_items','recipes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;
