-- Public site (docs/public-site-build-spec.md section 8): a host submits an event.
-- The event and its private details are created together or not at all.

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
  p_emergency_contact_name text,
  p_emergency_contact_phone text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.events (title, county, start_at, end_at, description, poster_path, capacity, status, submitted_at)
  values (p_title, p_county, p_start_at, p_end_at, p_description, p_poster_path, p_capacity, 'pending', now())
  returning id into v_id;

  insert into public.event_private_details (
    event_id, exact_address, host_name, host_email, host_phone, about_group,
    emergency_contact_name, emergency_contact_phone
  )
  values (
    v_id, p_exact_address, p_host_name, p_host_email, p_host_phone, p_about_group,
    p_emergency_contact_name, p_emergency_contact_phone
  );

  insert into public.event_activity (event_id, actor, action)
  values (v_id, 'host', 'Submitted');

  return v_id;
end;
$$;

-- Only the server (service role) calls this, after validating the form.
revoke all on function public.submit_event(text, text, timestamptz, timestamptz, text, text, int, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_event(text, text, timestamptz, timestamptz, text, text, int, text, text, text, text, text, text, text)
  to service_role;
