-- Public site (docs/public-site-build-spec.md section 9): changes a host makes
-- from their private link. Each runs in one transaction and re-checks the link
-- (token hash) and the event's status, so a link that was replaced or an event
-- that changed meanwhile can't be edited.

-- A host edits their live, upcoming event. p_event and p_details hold only the
-- columns that changed; p_changes is the { field: { before, after } } diff for
-- Karina. Returns the new attention item's id, or null if the event can no
-- longer be edited this way.
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
  where id = p_event_id and host_edit_token_hash = p_token_hash and status = 'live' and end_at > now()
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
    capacity = case when p_event ? 'capacity' then (p_event->>'capacity')::int else capacity end
  where id = p_event_id;

  update public.event_private_details set
    exact_address = coalesce(p_details->>'exact_address', exact_address),
    host_name = coalesce(p_details->>'host_name', host_name),
    host_email = coalesce(p_details->>'host_email', host_email),
    host_phone = coalesce(p_details->>'host_phone', host_phone),
    about_group = coalesce(p_details->>'about_group', about_group),
    emergency_contact_name = coalesce(p_details->>'emergency_contact_name', emergency_contact_name),
    emergency_contact_phone = coalesce(p_details->>'emergency_contact_phone', emergency_contact_phone)
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

-- A host asks Karina for registrants' contact details. Only one open request
-- at a time. Returns the attention item's id, or null if not allowed.
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
  where id = p_event_id and host_edit_token_hash = p_token_hash and status = 'live' and end_at > now()
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

-- A host cancels their live, upcoming event. Clears the event's open attention
-- items (and any open contact request), then adds a "host cancelled" item.
-- Returns that item's id, or null if the event can't be cancelled.
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
  where id = p_event_id and host_edit_token_hash = p_token_hash and status = 'live' and end_at > now();
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

-- A host whose event needs changes fixes it and sends it back for review.
-- Returns true if it was resubmitted.
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
    about_group = p_details->>'about_group',
    emergency_contact_name = p_details->>'emergency_contact_name',
    emergency_contact_phone = p_details->>'emergency_contact_phone'
  where event_id = p_event_id;

  insert into public.event_activity (event_id, actor, action) values (p_event_id, 'host', 'Resubmitted after changes');
  return true;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.host_edit_event(uuid, text, jsonb, jsonb, jsonb)',
    'public.host_request_contact(uuid, text, text)',
    'public.host_cancel_event(uuid, text)',
    'public.host_resubmit_event(uuid, text, jsonb, jsonb)'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
