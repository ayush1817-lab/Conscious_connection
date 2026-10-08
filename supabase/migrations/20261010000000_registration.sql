-- Public site (docs/public-site-build-spec.md sections 6 and 7): registering for
-- events, and rate limits for every public form.

-- ---------------------------------------------------------------------------
-- One registration per email per event (case-insensitive)
-- ---------------------------------------------------------------------------

create unique index registrations_event_email_key on public.registrations (event_id, lower(email));

-- ---------------------------------------------------------------------------
-- register_for_event: capacity is checked and the row inserted in one
-- transaction, with the event row locked, so two people can never take the
-- last place at the same time.
--
-- Returns one of:
--   'registered'          a new registration was made
--   'already_registered'  this email is already registered (nothing changes)
--   'full'                no places left
--   'not_available'       the event isn't live, has ended, or doesn't exist
-- ---------------------------------------------------------------------------

create or replace function public.register_for_event(p_event_id uuid, p_name text, p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_taken int;
begin
  select * into v_event from public.events where id = p_event_id for update;

  if not found or v_event.status <> 'live' or v_event.end_at <= now() then
    return 'not_available';
  end if;

  if exists (
    select 1 from public.registrations
    where event_id = p_event_id and lower(email) = lower(p_email)
  ) then
    return 'already_registered';
  end if;

  if v_event.capacity is not null then
    select count(*) into v_taken from public.registrations where event_id = p_event_id;
    if v_taken >= v_event.capacity then
      return 'full';
    end if;
  end if;

  insert into public.registrations (event_id, name, email, consented_at)
  values (p_event_id, p_name, p_email, now());
  return 'registered';
end;
$$;

-- Only the server (service role) calls this, after validating the form.
revoke all on function public.register_for_event(uuid, text, text) from public, anon, authenticated;
grant execute on function public.register_for_event(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Rate limits for public forms. key is "<action>:<sha256 of the visitor's IP>",
-- so no IP address is stored. Rows older than a day are useless and removed as
-- part of each check.
-- ---------------------------------------------------------------------------

create table public.rate_limits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);

create index rate_limits_key_idx on public.rate_limits (key, created_at);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
-- No policies: only the service role (which bypasses RLS) uses this table.

-- Records an attempt and returns true if it's within the limit, false if not.
create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  delete from public.rate_limits where created_at < now() - interval '1 day';

  -- Serialise attempts for the same key so bursts can't slip past the count.
  perform pg_advisory_xact_lock(hashtext(p_key));

  select count(*) into v_count
  from public.rate_limits
  where key = p_key and created_at > now() - p_window;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limits (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.hit_rate_limit(text, int, interval) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, interval) to service_role;
