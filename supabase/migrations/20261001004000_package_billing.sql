-- Paquetes: precio de proyecto listo con pago único, mensualidad o ambas opciones, y categoría
alter table public.quote_packages
  add column billing text not null default 'monthly' check (billing in ('once','monthly','both')),
  add column once_price numeric(12,2) not null default 0 check (once_price >= 0),
  add column category text check (category is null or length(category) <= 60),
  add column show_price boolean not null default true;
