-- Bóveda cifrada de extremo a extremo.
-- El servidor SOLO guarda texto cifrado y datos públicos de la derivación de llaves; nunca la clave maestra.

create table public.vault_meta (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  version smallint not null default 1,
  kdf_salt text not null,                         -- sal de PBKDF2 para la clave maestra (base64)
  kdf_iterations integer not null check (kdf_iterations between 100000 and 5000000),
  wrapped_dk_master text not null,                -- llave de datos cifrada con la clave maestra: "iv.ct" en base64
  rec_salt text not null,
  rec_iterations integer not null check (rec_iterations between 10000 and 5000000),
  wrapped_dk_recovery text not null,              -- la misma llave de datos cifrada con el código de recuperación
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vault_items (
  id uuid primary key,                            -- lo genera el cliente: se usa como dato autenticado del cifrado
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('password','email','client','api','note')),
  critical boolean not null default false,        -- marca de llaves secretas (service_role, etc.)
  project_id uuid references public.projects(id) on delete set null,
  ciphertext text not null check (length(ciphertext) between 1 and 200000),
  iv text not null check (length(iv) between 8 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.vault_items (user_id, category);

do $$
declare t text;
begin
  foreach t in array array['vault_meta','vault_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s: dueño" on public.%1$I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
alter publication supabase_realtime add table public.vault_items;

create or replace function public.check_vault_owner() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.project_id is not null and not exists (select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id) then
    raise exception 'trabajo inválido';
  end if;
  return new;
end $$;
create trigger check_owner before insert or update on public.vault_items for each row execute function public.check_vault_owner();
