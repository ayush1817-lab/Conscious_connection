-- Client feedback (Oct 2026): recurring events.
--
-- An event can repeat. recurrence_rule describes how, as JSON so more patterns
-- can be added later without a schema change:
--   {"freq": "weekly", "interval": 1}   every week, on the weekday of start_at
-- (PENDING: fortnightly would be {"freq": "weekly", "interval": 2}; monthly would
-- need a new "freq". The check below only allows what the site supports today.)
-- start_at/end_at are the first occurrence; recurrence_until is the optional last
-- date (Irish calendar date, inclusive). Times follow Irish wall-clock time, so
-- "7pm" stays 7pm across the clock change.
--
-- series_end_at (kept up to date by a trigger) is when the last occurrence ends,
-- or 'infinity' for a series without an end date. Everything that used to ask
-- "has this event ended?" with end_at now uses series_end_at.
--
-- RSVPs attach to one occurrence (registrations.occurrence_start), so capacity,
-- duplicates and the 7-day clean-up all work per date.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.events
  add column recurrence_rule jsonb,
  add column recurrence_until date,
  add column series_end_at timestamptz;

alter table public.events add constraint events_recurrence_rule_supported check (
  recurrence_rule is null
  or (
    recurrence_rule->>'freq' = 'weekly'
    and coalesce((recurrence_rule->>'interval')::int, 1) = 1
  )
);
alter table public.events add constraint events_recurrence_until_needs_rule check (
  recurrence_until is null or recurrence_rule is not null
);
alter table public.events add constraint events_recurrence_until_after_start check (
  recurrence_until is null or recurrence_until >= (start_at at time zone 'Europe/Dublin')::date
);

-- ---------------------------------------------------------------------------
-- Occurrence maths (Irish wall-clock time)
-- ---------------------------------------------------------------------------

-- Days between occurrences, or null for a one-off event.
create or replace function public.recurrence_step_days(p_rule jsonb)
returns int
language sql
immutable
set search_path = ''
as $$
  select case
    when p_rule is null then null
    when p_rule->>'freq' = 'weekly' then 7 * coalesce((p_rule->>'interval')::int, 1)
  end;
$$;

-- Start of occurrence number k (0 = the first).
create or replace function public.occurrence_start(p_start timestamptz, p_rule jsonb, p_k int)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select case
    when p_rule is null then p_start
    else ((p_start at time zone 'Europe/Dublin') + make_interval(days => public.recurrence_step_days(p_rule) * p_k)) at time zone 'Europe/Dublin'
  end;
$$;

-- The first occurrence that hasn't ended by p_after, or null if none is left.
create or replace function public.next_occurrence_start(
  p_start timestamptz,
  p_end timestamptz,
  p_rule jsonb,
  p_until date,
  p_after timestamptz default now()
)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  v_step int := public.recurrence_step_days(p_rule);
  v_k int;
  v_s timestamptz;
begin
  if v_step is null then
    return case when p_end > p_after then p_start end;
  end if;
  v_k := greatest(0, floor(extract(epoch from (p_after - p_end)) / (v_step * 86400.0))::int);
  -- The estimate can be one short around clock changes.
  for i in 1..3 loop
    v_s := public.occurrence_start(p_start, p_rule, v_k);
    exit when v_s + (p_end - p_start) > p_after;
    v_k := v_k + 1;
  end loop;
  if p_until is not null and (v_s at time zone 'Europe/Dublin')::date > p_until then
    return null;
  end if;
  return v_s;
end;
$$;

-- When the last occurrence ends ('infinity' when the series has no end date).
create or replace function public.series_end(p_start timestamptz, p_end timestamptz, p_rule jsonb, p_until date)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select case
    when p_rule is null then p_end
    when p_until is null then 'infinity'::timestamptz
    else public.occurrence_start(
      p_start, p_rule,
      floor((p_until - (p_start at time zone 'Europe/Dublin')::date) / public.recurrence_step_days(p_rule)::numeric)::int
    ) + (p_end - p_start)
  end;
$$;

-- True when p_occurrence is one of the event's occurrence start times.
create or replace function public.is_occurrence(p_start timestamptz, p_rule jsonb, p_until date, p_occurrence timestamptz)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_step int := public.recurrence_step_days(p_rule);
  v_k int;
begin
  if v_step is null then
    return p_occurrence = p_start;
  end if;
  v_k := round(extract(epoch from (p_occurrence - p_start)) / (v_step * 86400.0))::int;
  return v_k >= 0
    and public.occurrence_start(p_start, p_rule, v_k) = p_occurrence
    and (p_until is null or (p_occurrence at time zone 'Europe/Dublin')::date <= p_until);
end;
$$;

grant execute on function public.recurrence_step_days(jsonb) to anon, authenticated, service_role;
grant execute on function public.occurrence_start(timestamptz, jsonb, int) to anon, authenticated, service_role;
grant execute on function public.next_occurrence_start(timestamptz, timestamptz, jsonb, date, timestamptz) to anon, authenticated, service_role;
grant execute on function public.series_end(timestamptz, timestamptz, jsonb, date) to anon, authenticated, service_role;
grant execute on function public.is_occurrence(timestamptz, jsonb, date, timestamptz) to anon, authenticated, service_role;

create or replace function public.set_series_end_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.series_end_at := public.series_end(new.start_at, new.end_at, new.recurrence_rule, new.recurrence_until);
  return new;
end;
$$;

create trigger set_series_end_at before insert or update of start_at, end_at, recurrence_rule, recurrence_until
  on public.events for each row execute function public.set_series_end_at();

update public.events set series_end_at = end_at;
alter table public.events alter column series_end_at set not null;
create index events_series_end_idx on public.events (series_end_at);

-- ---------------------------------------------------------------------------
-- Public visibility: live events whose series hasn't ended
-- ---------------------------------------------------------------------------

drop policy "Public can read live upcoming events" on public.events;
create policy "Public can read live upcoming events" on public.events
  for select to anon, authenticated
  using (status = 'live' and series_end_at > now());

grant select (recurrence_rule, recurrence_until, series_end_at) on public.events to anon;

-- What the public site lists: one row per visible event, with its next occurrence.
-- security_invoker, so the events RLS policy and column grants above still apply.
create view public.event_listing with (security_invoker = true) as
select
  e.id, e.title, e.county, e.start_at, e.end_at, e.description, e.poster_path, e.capacity, e.status,
  e.recurrence_rule, e.recurrence_until, e.series_end_at,
  n.next_start_at,
  n.next_start_at + (e.end_at - e.start_at) as next_end_at
from public.events e
cross join lateral (
  select public.next_occurrence_start(e.start_at, e.end_at, e.recurrence_rule, e.recurrence_until) as next_start_at
) n
where n.next_start_at is not null;

grant select on public.event_listing to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Registrations per occurrence
-- ---------------------------------------------------------------------------

alter table public.registrations add column occurrence_start timestamptz;
update public.registrations r set occurrence_start = e.start_at from public.events e where e.id = r.event_id;
alter table public.registrations alter column occurrence_start set not null;

-- A registration added without a date (one-off events, older code) gets the event's own date.
create or replace function public.set_registration_occurrence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.occurrence_start is null then
    select start_at into new.occurrence_start from public.events where id = new.event_id;
  end if;
  return new;
end;
$$;

create trigger set_registration_occurrence before insert on public.registrations
  for each row execute function public.set_registration_occurrence();

drop index public.registrations_event_email_key;
create unique index registrations_event_occurrence_email_key
  on public.registrations (event_id, occurrence_start, lower(email));
create index registrations_occurrence_idx on public.registrations (event_id, occurrence_start);

-- Same results as before; p_occurrence_start picks the date (the next one if null).
drop function public.register_for_event(uuid, text, text);
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

revoke all on function public.register_for_event(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.register_for_event(uuid, text, text, timestamptz) to service_role;

-- Places left for each event's next occurrence (as before: never names or emails).
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
  group by e.id, e.capacity;
$$;

-- Places left on chosen dates of one event, for the date picker on its page.
create or replace function public.occurrence_places_left(p_event_id uuid, p_starts timestamptz[])
returns table (occurrence_start timestamptz, places_left int)
language sql
stable
security definer
set search_path = ''
as $$
  select s.start, greatest(e.capacity - count(r.id)::int, 0)
  from public.events e
  cross join unnest(p_starts) as s(start)
  left join public.registrations r on r.event_id = e.id and r.occurrence_start = s.start
  where e.id = p_event_id and e.status = 'live' and e.series_end_at > now() and e.capacity is not null
  group by s.start, e.capacity;
$$;

revoke all on function public.occurrence_places_left(uuid, timestamptz[]) from public;
grant execute on function public.occurrence_places_left(uuid, timestamptz[]) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Submitting, with optional recurrence. p_extra carries newer optional fields
-- (recurrence_rule, recurrence_until) so later additions don't change the signature.
-- ---------------------------------------------------------------------------

drop function public.submit_event(text, text, timestamptz, timestamptz, text, text, int, text, text, text, text, text, text, text);
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
    recurrence_rule, recurrence_until
  )
  values (
    p_title, p_county, p_start_at, p_end_at, p_description, p_poster_path, p_capacity, 'pending', now(),
    nullif(p_extra->'recurrence_rule', 'null'::jsonb), (p_extra->>'recurrence_until')::date
  )
  returning id into v_id;

  insert into public.event_private_details (event_id, exact_address, host_name, host_email, host_phone, about_group)
  values (v_id, p_exact_address, p_host_name, p_host_email, p_host_phone, p_about_group);

  insert into public.event_activity (event_id, actor, action)
  values (v_id, 'host', 'Submitted');

  return v_id;
end;
$$;

revoke all on function public.submit_event(text, text, timestamptz, timestamptz, text, text, int, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_event(text, text, timestamptz, timestamptz, text, text, int, text, text, text, text, text, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Host functions: "not ended" now means the series, and edits can change recurrence
-- ---------------------------------------------------------------------------

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
    recurrence_until = case when p_event ? 'recurrence_until' then (p_event->>'recurrence_until')::date else recurrence_until end
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

create or replace function public.host_request_contact(p_event_id uuid, p_token_hash text, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_item_id uuid;
begin
  perform 1 from public.events
  where id = p_event_id and host_edit_token_hash = p_token_hash and status = 'live' and series_end_at > now()
  for update;
  if not found then
    return null;
  end if;

  if exists (select 1 from public.contact_requests where event_id = p_event_id and status = 'requested') then
    return null;
  end if;

  insert into public.contact_requests (event_id, host_reason) values (p_event_id, p_reason)
  returning id into v_request_id;

  insert into public.attention_items (event_id, type, ref_id, needs_decision)
  values (p_event_id, 'contact_request', v_request_id, true)
  returning id into v_item_id;

  insert into public.event_activity (event_id, actor, action, note)
  values (p_event_id, 'host', 'Requested contact details', p_reason);

  return v_item_id;
end;
$$;

create or replace function public.host_cancel_event(p_event_id uuid, p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_id uuid;
begin
  update public.events set status = 'cancelled'
  where id = p_event_id and host_edit_token_hash = p_token_hash and status = 'live' and series_end_at > now();
  if not found then
    return null;
  end if;

  update public.attention_items set seen_at = now(), resolved_at = now()
  where event_id = p_event_id and resolved_at is null;
  update public.contact_requests set status = 'declined', admin_reason = 'The host cancelled the event.', decided_at = now()
  where event_id = p_event_id and status = 'requested';

  insert into public.attention_items (event_id, type, needs_decision)
  values (p_event_id, 'host_cancelled', false)
  returning id into v_item_id;

  insert into public.event_activity (event_id, actor, action) values (p_event_id, 'host', 'Cancelled');

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

-- ---------------------------------------------------------------------------
-- Retention: a series is "over" when its last occurrence ends; RSVPs for each
-- past occurrence of a running series are also removed 7 days after that date.
-- ---------------------------------------------------------------------------

create or replace function public.run_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz := now() - interval '7 days';
  expired uuid[];
  removed jsonb;
  n_registrations int;
  n_past_occurrences int;
  n_details int;
  n_requests int;
  n_edits int;
  n_attention int;
  n_links int;
  n_emails int;
  n_story_emails int;
begin
  select coalesce(array_agg(e.id), '{}') into expired
  from public.events e
  where e.series_end_at < cutoff;

  delete from public.attention_items where event_id = any (expired);
  get diagnostics n_attention = row_count;
  delete from public.registrations where event_id = any (expired);
  get diagnostics n_registrations = row_count;
  delete from public.registrations r
  using public.events e
  where e.id = r.event_id and r.occurrence_start + (e.end_at - e.start_at) < cutoff;
  get diagnostics n_past_occurrences = row_count;
  n_registrations := n_registrations + n_past_occurrences;
  delete from public.event_private_details where event_id = any (expired);
  get diagnostics n_details = row_count;
  delete from public.contact_requests where event_id = any (expired);
  get diagnostics n_requests = row_count;
  delete from public.event_edits where event_id = any (expired);
  get diagnostics n_edits = row_count;
  update public.events set host_edit_token_hash = null
  where id = any (expired) and host_edit_token_hash is not null;
  get diagnostics n_links = row_count;
  delete from public.email_log where created_at < now() - interval '30 days';
  get diagnostics n_emails = row_count;
  update public.story_submissions set email = null
  where email is not null and decided_at < now() - interval '30 days';
  get diagnostics n_story_emails = row_count;

  removed := jsonb_build_object(
    'cutoff', cutoff,
    'registrations', n_registrations,
    'host_details', n_details,
    'contact_requests', n_requests,
    'host_edits', n_edits,
    'attention_items', n_attention,
    'host_links', n_links,
    'email_records', n_emails,
    'story_emails', n_story_emails
  );

  insert into public.event_activity (event_id, actor, action, note)
  values (
    null,
    'system',
    'retention_cleanup',
    format(
      'Removed private data for events that ended before %s: %s registrations, %s host details, %s contact requests, %s host edits, %s attention items, %s host links. Removed %s email records older than 30 days and %s story submitters'' emails.',
      to_char(cutoff at time zone 'Europe/Dublin', 'YYYY-MM-DD HH24:MI'),
      n_registrations, n_details, n_requests, n_edits, n_attention, n_links, n_emails, n_story_emails
    )
  );

  return removed;
end;
$$;

revoke all on function public.run_retention() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;
