-- Client feedback (Oct 2026): anyone can share their story from the public site.
-- Submissions wait in a private review queue; approving one publishes it as a
-- normal story. The submitter's email is never public and is removed 30 days
-- after the decision (see run_retention below).

create type public.story_submission_status as enum ('pending', 'approved', 'declined');

-- Shown on the story page as "By <name>". Null means anonymous (or written by the team).
alter table public.stories add column if not exists author_name text check (author_name is null or char_length(author_name) <= 80);

create table public.story_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  title text not null check (char_length(title) between 1 and 150),
  body text not null check (char_length(body) between 1 and 10000),
  author_name text check (author_name is null or char_length(author_name) <= 80),
  email text check (email is null or char_length(email) <= 254),
  image_path text,
  status public.story_submission_status not null default 'pending',
  decision_reason text check (decision_reason is null or char_length(decision_reason) <= 1000),
  decided_at timestamptz,
  story_id uuid references public.stories (id) on delete set null
);

create index story_submissions_status_idx on public.story_submissions (status, created_at desc);

create trigger set_updated_at before update on public.story_submissions
  for each row execute function public.set_updated_at();

alter table public.story_submissions enable row level security;
revoke all on public.story_submissions from anon;
create policy "Admins have full access" on public.story_submissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- The public form writes through the server (service role), never directly.

-- Retention: same as before, plus submitters' emails 30 days after a decision.
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
  n_story_emails int;
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
