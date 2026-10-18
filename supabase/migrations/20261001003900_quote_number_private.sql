-- El número de la cotización (COT-AAAA-NNN) es solo para uso interno: no sale en el enlace compartido
create or replace function public.quote_by_token(t text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(q) - 'user_id' - 'project_id' - 'share_token' - 'shared' - 'number'
    || jsonb_build_object('page', coalesce((select data from public.quote_page p where p.user_id = q.user_id), '{}'::jsonb))
  from public.quotes q
  where q.shared and q.share_token is not null and q.share_token = t and length(t) >= 16
  limit 1;
$$;
