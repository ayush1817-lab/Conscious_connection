-- Public site (docs/public-site-build-spec.md section 7): places left on visible events.
--
-- The public can't read registrations, so it can't count them. This function
-- returns only the number of places left for live, upcoming events that have a
-- capacity: never names, emails or anything else about who registered.

create or replace function public.event_places_left(event_ids uuid[])
returns table (event_id uuid, places_left int)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, greatest(e.capacity - count(r.id)::int, 0)
  from public.events e
  left join public.registrations r on r.event_id = e.id
  where e.id = any (event_ids)
    and e.status = 'live'
    and e.end_at > now()
    and e.capacity is not null
  group by e.id, e.capacity;
$$;

revoke all on function public.event_places_left(uuid[]) from public;
grant execute on function public.event_places_left(uuid[]) to anon, authenticated, service_role;
