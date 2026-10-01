-- Sincronización en vivo entre dispositivos
alter publication supabase_realtime add table public.schedule_blocks;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.inbox_items;
