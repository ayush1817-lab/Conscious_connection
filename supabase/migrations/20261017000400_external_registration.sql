-- Client feedback (Oct 2026): events that take registrations on another site.
--
-- When external_registration_url is set, the event page shows a "Register here"
-- button that opens that link instead of our RSVP form, and register_for_event
-- refuses (returns 'external'). Only http(s) links are allowed.

alter table public.events add column external_registration_url text;
alter table public.events add constraint events_external_registration_url_valid check (
  external_registration_url is null
  or (external_registration_url ~* '^https?://[^\s/$.?#][^\s]*$' and length(external_registration_url) <= 2000)
);

grant select (external_registration_url) on public.events to anon;

-- The public listing gains the link (new columns go last).
create or replace view public.event_listing with (security_invoker = true) as
select
  e.id, e.title, e.county, e.start_at, e.end_at, e.description, e.poster_path, e.capacity, e.status,
  e.recurrence_rule, e.recurrence_until, e.series_end_at,
  n.next_start_at,
  n.next_start_at + (e.end_at - e.start_at) as next_end_at,
  e.external_registration_url
from public.events e
cross join lateral (
  select public.next_occurrence_start(e.start_at, e.end_at, e.recurrence_rule, e.recurrence_until) as next_start_at
) n
where n.next_start_at is not null;

-- Submitting: p_extra may now carry external_registration_url.
create or replace function public.submit_event(
  p_title text,
  p_county text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_description text,
  p_poster_path text,
  p_capacity int,
  p_exact_address text,
  p_host_name text,
  p_host_email text,
  p_host_phone text,
  p_about_group text,
  p_extra jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.events (
    title, county, start_at, end_at, description, poster_path, capacity, status, submitted_at,
    recurrence_rule, recurrence_until, external_registration_url
  )
  values (
    p_title, p_county, p_start_at, p_end_at, p_description, p_poster_path, p_capacity, 'pending', now(),
    nullif(p_extra->'recurrence_rule', 'null'::jsonb), (p_extra->>'recurrence_until')::date,
    nullif(p_extra->>'external_registration_url', '')
  )
  returning id into v_id;

  insert into public.event_private_details (event_id, exact_address, host_name, host_email, host_phone, about_group)
  values (v_id, p_exact_address, p_host_name, p_host_email, p_host_phone, p_about_group);

  insert into public.event_activity (event_id, actor, action)
  values (v_id, 'host', 'Submitted');

  return v_id;
end;
$$;

-- Host edits and resubmits can set or clear the link.
create or replace function public.host_edit_event(
  p_event_id uuid,
  p_token_hash text,
  p_event jsonb,
  p_details jsonb,
  p_changes jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_edit_id uuid;
  v_item_id uuid;
begin
  perform 1 from public.events
  where id = p_event_id and host_edit_token_hash = p_token_hash and status = 'live' and series_end_at > now()
  for update;
  if not found then
    return null;
  end if;

  update public.events set
    title = coalesce(p_event->>'title', title),
    county = coalesce(p_event->>'county', county),
    start_at = coalesce((p_event->>'start_at')::timestamptz, start_at),
    end_at = coalesce((p_event->>'end_at')::timestamptz, end_at),
    description = coalesce(p_event->>'description', description),
    poster_path = case when p_event ? 'poster_path' then p_event->>'poster_path' else poster_path end,
    capacity = case when p_event ? 'capacity' then (p_event->>'capacity')::int else capacity end,
    recurrence_rule = case when p_event ? 'recurrence_rule' then nullif(p_event->'recurrence_rule', 'null'::jsonb) else recurrence_rule end,
    recurrence_until = case when p_event ? 'recurrence_until' then (p_event->>'recurrence_until')::date else recurrence_until end,
    external_registration_url = case
      when p_event ? 'external_registration_url' then nullif(p_event->>'external_registration_url', '')
      else external_registration_url
    end
  where id = p_event_id;

  update public.event_private_details set
    exact_address = coalesce(p_details->>'exact_address', exact_address),
    host_name = coalesce(p_details->>'host_name', host_name),
    host_email = coalesce(p_details->>'host_email', host_email),
    host_phone = coalesce(p_details->>'host_phone', host_phone),
    about_group = coalesce(p_details->>'about_group', about_group)
  where event_id = p_event_id;

  insert into public.event_edits (event_id, changes) values (p_event_id, p_changes)
  returning id into v_edit_id;

  insert into public.attention_items (event_id, type, ref_id, needs_decision)
  values (p_event_id, 'host_edited', v_edit_id, false)
  returning id into v_item_id;

  insert into public.event_activity (event_id, actor, action, note)
  values (
    p_event_id, 'host', 'Edited the event',
    'Changed ' || (select string_agg(k, ', ') from jsonb_object_keys(p_changes) as k)
  );

  return v_item_id;
end;
$$;

create or replace function public.host_resubmit_event(p_event_id uuid, p_token_hash text, p_event jsonb, p_details jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.events set
    title = p_event->>'title',
    county = p_event->>'county',
    start_at = (p_event->>'start_at')::timestamptz,
    end_at = (p_event->>'end_at')::timestamptz,
    description = p_event->>'description',
    poster_path = p_event->>'poster_path',
    capacity = (p_event->>'capacity')::int,
    recurrence_rule = nullif(p_event->'recurrence_rule', 'null'::jsonb),
    recurrence_until = (p_event->>'recurrence_until')::date,
    external_registration_url = nullif(p_event->>'external_registration_url', ''),
    status = 'pending',
    status_reason = null,
    opened_by_admin_at = null,
    submitted_at = now()
  where id = p_event_id and host_edit_token_hash = p_token_hash and status = 'needs_changes';
  if not found then
    return false;
  end if;

  update public.event_private_details set
    exact_address = p_details->>'exact_address',
    host_name = p_details->>'host_name',
    host_email = p_details->>'host_email',
    host_phone = p_details->>'host_phone',
    about_group = p_details->>'about_group'
  where event_id = p_event_id;

  insert into public.event_activity (event_id, actor, action) values (p_event_id, 'host', 'Resubmitted after changes');
  return true;
end;
$$;

-- Registering on our site is refused when the event uses an external one.
create or replace function public.register_for_event(
  p_event_id uuid,
  p_name text,
  p_email text,
  p_occurrence_start timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_occurrence timestamptz;
  v_taken int;
begin
  select * into v_event from public.events where id = p_event_id for update;

  if not found or v_event.status <> 'live' or v_event.series_end_at <= now() then
    return 'not_available';
  end if;

  -- People register for this event on another website.
  if v_event.external_registration_url is not null then
    return 'external';
  end if;

  v_occurrence := coalesce(
    p_occurrence_start,
    public.next_occurrence_start(v_event.start_at, v_event.end_at, v_event.recurrence_rule, v_event.recurrence_until)
  );
  if v_occurrence is null
    or not public.is_occurrence(v_event.start_at, v_event.recurrence_rule, v_event.recurrence_until, v_occurrence)
    or v_occurrence + (v_event.end_at - v_event.start_at) <= now() then
    return 'not_available';
  end if;

  if exists (
    select 1 from public.registrations
    where event_id = p_event_id and occurrence_start = v_occurrence and lower(email) = lower(p_email)
  ) then
    return 'already_registered';
  end if;

  if v_event.capacity is not null then
    select count(*) into v_taken from public.registrations
    where event_id = p_event_id and occurrence_start = v_occurrence;
    if v_taken >= v_event.capacity then
      return 'full';
    end if;
  end if;

  insert into public.registrations (event_id, name, email, consented_at, occurrence_start)
  values (p_event_id, p_name, p_email, now(), v_occurrence);
  return 'registered';
end;
$$;

-- Places left only make sense for our own RSVPs, so external events have none.
create or replace function public.event_places_left(event_ids uuid[])
returns table (event_id uuid, places_left int)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, greatest(e.capacity - count(r.id)::int, 0)
  from public.events e
  cross join lateral (
    select public.next_occurrence_start(e.start_at, e.end_at, e.recurrence_rule, e.recurrence_until) as next_start
  ) n
  left join public.registrations r on r.event_id = e.id and r.occurrence_start = n.next_start
  where e.id = any (event_ids)
    and e.status = 'live'
    and n.next_start is not null
    and e.capacity is not null
    and e.external_registration_url is null
  group by e.id, e.capacity;
$$;
