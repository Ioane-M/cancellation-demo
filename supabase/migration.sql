-- Openslot demo backend (already applied to the Supabase project "openslot-demo").
create table if not exists public.demo_rooms (
  id text primary key check (id ~ '^[a-z0-9]{3,20}$'),
  state jsonb not null check (pg_column_size(state) < 400000),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.demo_rooms enable row level security;
create policy "demo rooms are readable" on public.demo_rooms for select to anon, authenticated using (true);

create or replace function public.get_or_create_room(p_room text, p_seed jsonb)
returns table(state jsonb, version integer) language plpgsql security definer set search_path = public as $$
begin
  if p_room !~ '^[a-z0-9]{3,20}$' then raise exception 'bad room id'; end if;
  insert into public.demo_rooms(id, state) values (p_room, p_seed) on conflict (id) do nothing;
  return query select r.state, r.version from public.demo_rooms r where r.id = p_room;
end $$;

create or replace function public.put_room_state(p_room text, p_expected integer, p_state jsonb)
returns table(ok boolean, version integer, state jsonb) language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  update public.demo_rooms r set state = p_state, version = r.version + 1, updated_at = now()
   where r.id = p_room and r.version = p_expected returning r.version into v;
  if found then return query select true, v, p_state; end if;
  return query select false, r.version, r.state from public.demo_rooms r where r.id = p_room;
end $$;

create or replace function public.purge_old_rooms() returns void language sql security definer set search_path = public as $$
  delete from public.demo_rooms where updated_at < now() - interval '14 days';
$$;

revoke all on function public.get_or_create_room(text, jsonb) from public;
revoke all on function public.put_room_state(text, integer, jsonb) from public;
revoke all on function public.purge_old_rooms() from public;
grant execute on function public.get_or_create_room(text, jsonb) to anon, authenticated;
grant execute on function public.put_room_state(text, integer, jsonb) to anon, authenticated;
grant execute on function public.purge_old_rooms() to anon, authenticated;
