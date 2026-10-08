-- Daily GDPR cleanup (spec section 6).
--
-- For every event that ended more than 7 days ago, delete the personal data
-- (registrations, host details, contact requests, host edits) and the attention
-- items that point at it, and clear the host link hash. The events row itself is
-- kept (public-safe fields only) for counting; admin pages already hide it.
-- Copies of sent emails (email_log) are deleted 30 days after sending: they hold
-- the same personal data (E10 lists registrants' emails) but aren't linked to an
-- event, and 30 days still covers "did the host get my email?" questions.
-- Each run is logged in event_activity as 'system' with event_id null.
--
-- Called by the /api/cron/retention route (Vercel Cron) with the service role key,
-- or locally with `npm run retention`. Safe to run any number of times.

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
  n_details int;
  n_requests int;
  n_edits int;
  n_attention int;
  n_links int;
  n_emails int;
begin
  select coalesce(array_agg(e.id), '{}') into expired
  from public.events e
  where e.end_at < cutoff;

  delete from public.attention_items where event_id = any (expired);
  get diagnostics n_attention = row_count;
  delete from public.registrations where event_id = any (expired);
  get diagnostics n_registrations = row_count;
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

  removed := jsonb_build_object(
    'cutoff', cutoff,
    'registrations', n_registrations,
    'host_details', n_details,
    'contact_requests', n_requests,
    'host_edits', n_edits,
    'attention_items', n_attention,
    'host_links', n_links,
    'email_records', n_emails
  );

  insert into public.event_activity (event_id, actor, action, note)
  values (
    null,
    'system',
    'retention_cleanup',
    format(
      'Removed private data for events that ended before %s: %s registrations, %s host details, %s contact requests, %s host edits, %s attention items, %s host links. Removed %s email records older than 30 days.',
      to_char(cutoff at time zone 'Europe/Dublin', 'YYYY-MM-DD HH24:MI'),
      n_registrations, n_details, n_requests, n_edits, n_attention, n_links, n_emails
    )
  );

  return removed;
end;
$$;

revoke all on function public.run_retention() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;
