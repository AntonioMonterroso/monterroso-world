-- Cotizaciones: catálogo público de precios, propuestas por cliente y enlaces para compartir

-- Paquetes del catálogo (precios cerrados o "a tu medida")
create table public.quote_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  tagline text check (tagline is null or length(tagline) <= 300),
  kind text not null default 'closed' check (kind in ('closed','custom')),
  setup_fee numeric(12,2) not null default 0 check (setup_fee >= 0),
  monthly_fee numeric(12,2) not null default 0 check (monthly_fee >= 0),
  price_note text check (price_note is null or length(price_note) <= 200),
  features jsonb not null default '[]'::jsonb,       -- [{text, included}]
  recommended boolean not null default false,
  published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(features) = 'array' and jsonb_array_length(features) <= 60)
);

-- Extras sueltos (dominio, soporte, etc.)
create table public.quote_extras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  detail text check (detail is null or length(detail) <= 400),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  period text not null default 'once' check (period in ('once','month','year')),
  approx boolean not null default false,
  published boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Textos de la página pública (una fila por usuario)
create table public.quote_page (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(data) = 'object' and length(data::text) <= 60000)
);

-- Propuestas por cliente (privadas; se comparten con un enlace opcional)
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  number text not null check (length(number) between 1 and 40),
  title text not null check (length(title) between 1 and 200),
  client_name text not null default '' check (length(client_name) <= 200),
  client_contact text check (client_contact is null or length(client_contact) <= 200),
  template text not null default 'custom' check (template in ('web','citas','programa','custom')),
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected')),
  lines jsonb not null default '[]'::jsonb,           -- [{id,label,detail,qty,unit,period,optional,on}]
  iva text not null default 'none' check (iva in ('none','included','added')),
  upfront_pct smallint not null default 70 check (upfront_pct between 0 and 100),
  valid_until date,
  body jsonb not null default '{}'::jsonb,            -- intro, secciones, condiciones…
  shared boolean not null default false,
  share_token text unique,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) <= 80),
  check (jsonb_typeof(body) = 'object' and length(body::text) <= 60000)
);
create index on public.quotes (user_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['quote_packages','quote_extras','quote_page','quotes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- Página pública de precios: solo lo publicado, sin exponer tablas
create or replace function public.public_pricing() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'page', coalesce((select data from public.quote_page order by updated_at desc limit 1), '{}'::jsonb),
    'packages', coalesce((select jsonb_agg(to_jsonb(p) - 'user_id' order by p.position, p.created_at) from public.quote_packages p where p.published), '[]'::jsonb),
    'extras', coalesce((select jsonb_agg(to_jsonb(e) - 'user_id' order by e.position, e.created_at) from public.quote_extras e where e.published), '[]'::jsonb)
  );
$$;

-- Una propuesta compartida, por su enlace secreto (y solo si la marcaste como compartida)
create or replace function public.quote_by_token(t text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(q) - 'user_id' - 'project_id' - 'share_token' - 'shared'
    || jsonb_build_object('page', coalesce((select data from public.quote_page p where p.user_id = q.user_id), '{}'::jsonb))
  from public.quotes q
  where q.shared and q.share_token is not null and q.share_token = t and length(t) >= 16
  limit 1;
$$;

revoke all on function public.public_pricing() from public;
revoke all on function public.quote_by_token(text) from public;
grant execute on function public.public_pricing() to anon, authenticated;
grant execute on function public.quote_by_token(text) to anon, authenticated;
