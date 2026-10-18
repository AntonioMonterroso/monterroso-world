-- Seguimiento del cliente: hitos y avisos que se ven en su página (junto a la propuesta)
alter table public.quotes add column progress jsonb not null default '{}'::jsonb
  check (jsonb_typeof(progress) = 'object' and length(progress::text) <= 40000);
