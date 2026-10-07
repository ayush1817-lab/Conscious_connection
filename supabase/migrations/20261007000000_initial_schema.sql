-- Conscious Connections: initial schema for the whole product (admin, public site, host pages).
-- Spec: docs/admin-build-spec.md sections 4–6.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.event_status as enum (
  'pending', 'needs_changes', 'declined', 'live', 'cancelled', 'taken_down'
);
-- "Expired" is derived (status = 'live' and end_at < now()), never stored.

create type public.attention_type as enum ('host_edited', 'host_cancelled', 'contact_request');
create type public.contact_request_status as enum ('requested', 'shared', 'declined');
create type public.activity_actor as enum ('admin', 'host', 'system');
create type public.email_provider as enum ('console', 'resend');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admins (created manually, see README)
-- ---------------------------------------------------------------------------

create table public.admins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null
);

-- True when the signed-in user is listed in public.admins.
-- security definer so it can read admins without recursing through RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  title text not null check (char_length(title) between 1 and 120),
  county text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  description text not null check (char_length(description) <= 500),
  poster_path text,
  capacity int check (capacity is null or capacity > 0),
  status public.event_status not null default 'pending',
  status_reason text,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  opened_by_admin_at timestamptz,
  host_edit_token_hash text unique,
  constraint events_end_after_start check (end_at > start_at)
);

create index events_status_start_idx on public.events (status, start_at);
create index events_end_idx on public.events (end_at);

-- 1:1 with events. Never readable by the public.
create table public.event_private_details (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null unique references public.events (id) on delete cascade,
  exact_address text not null,
  host_name text not null,
  host_email text not null,
  host_phone text not null,
  about_group text not null check (char_length(about_group) <= 300),
  emergency_contact_name text not null,
  emergency_contact_phone text not null
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  email text not null,
  consented_at timestamptz not null
);

create index registrations_event_idx on public.registrations (event_id);

-- Host edits to live events, for the before -> after view.
-- changes shape: { "<field>": { "before": ..., "after": ... } }
create table public.event_edits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events (id) on delete cascade,
  changes jsonb not null,
  seen_at timestamptz
);

create index event_edits_event_idx on public.event_edits (event_id);

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events (id) on delete cascade,
  host_reason text not null,
  status public.contact_request_status not null default 'requested',
  admin_reason text,
  decided_at timestamptz
);

create index contact_requests_event_idx on public.contact_requests (event_id);

create table public.attention_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid not null references public.events (id) on delete cascade,
  type public.attention_type not null,
  -- Points to event_edits (host_edited) or contact_requests (contact_request).
  -- Not a foreign key because it targets two tables; retention deletes the target rows.
  ref_id uuid,
  needs_decision boolean not null default false,
  seen_at timestamptz,
  resolved_at timestamptz
);

create index attention_items_open_idx on public.attention_items (created_at desc)
  where resolved_at is null;

-- Simple audit log shown on A6.
create table public.event_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  event_id uuid references public.events (id) on delete cascade, -- null for system-wide runs
  actor public.activity_actor not null,
  action text not null,
  note text
);

create index event_activity_event_idx on public.event_activity (event_id, created_at);

-- ---------------------------------------------------------------------------
-- Website content
-- ---------------------------------------------------------------------------

create table public.site_sections (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  page text not null,               -- e.g. 'home', 'about'
  key text not null,                -- e.g. 'hero', 'intro'
  heading text not null default '',
  body text not null default '',
  image_path text,
  sort_order int not null default 0,
  unique (page, key)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  title text not null,
  slug text not null unique,
  cover_path text,
  body text not null default '',
  published boolean not null default false,
  published_at timestamptz
);

create table public.podcasts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  title text not null,
  description text not null default '',
  youtube_url text not null,
  published boolean not null default false,
  published_at timestamptz
);

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  image_path text not null,
  caption text,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Email log (every email, whichever provider sent it)
-- ---------------------------------------------------------------------------

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  to_email text not null,
  template text not null,           -- e.g. 'E4'
  subject text not null,
  body text not null,
  sent_at timestamptz,
  provider public.email_provider not null,
  error text
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'admins', 'events', 'event_private_details', 'registrations', 'event_edits',
    'contact_requests', 'attention_items', 'event_activity', 'site_sections',
    'stories', 'podcasts', 'gallery_images', 'email_log'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: enabled on every table
-- ---------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.events enable row level security;
alter table public.event_private_details enable row level security;
alter table public.registrations enable row level security;
alter table public.event_edits enable row level security;
alter table public.contact_requests enable row level security;
alter table public.attention_items enable row level security;
alter table public.event_activity enable row level security;
alter table public.site_sections enable row level security;
alter table public.stories enable row level security;
alter table public.podcasts enable row level security;
alter table public.gallery_images enable row level security;
alter table public.email_log enable row level security;

-- Admin-only tables: no anon access at all (privileges revoked as well as RLS).
do $$
declare
  t text;
begin
  foreach t in array array[
    'event_private_details', 'registrations', 'contact_requests', 'event_edits',
    'attention_items', 'email_log', 'event_activity'
  ]
  loop
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy "Admins have full access" on public.%I
         for all to authenticated
         using (public.is_admin())
         with check (public.is_admin())', t);
  end loop;
end;
$$;

-- admins: an admin can see the team; anyone signed in can see their own row.
-- No insert/update/delete policy: admins are created with the service role (see README).
revoke all on public.admins from anon;
create policy "Admins can read admins" on public.admins
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- events: admins full access; the public sees only live events that haven't ended.
create policy "Admins have full access" on public.events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Public can read live upcoming events" on public.events
  for select to anon, authenticated
  using (status = 'live' and end_at > now());

-- Anon may only read public-safe columns (not the token hash, reasons or admin timestamps).
revoke all on public.events from anon;
grant select (id, title, county, start_at, end_at, description, poster_path, capacity, status)
  on public.events to anon;

-- Content tables: admins write; the public reads published rows.
-- site_sections and gallery_images have no draft state, so all rows are public.
do $$
declare
  t text;
begin
  foreach t in array array['site_sections', 'stories', 'podcasts', 'gallery_images']
  loop
    execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
    execute format(
      'create policy "Admins have full access" on public.%I
         for all to authenticated
         using (public.is_admin())
         with check (public.is_admin())', t);
  end loop;
end;
$$;

create policy "Public can read sections" on public.site_sections
  for select to anon, authenticated using (true);
create policy "Public can read gallery" on public.gallery_images
  for select to anon, authenticated using (true);
create policy "Public can read published stories" on public.stories
  for select to anon, authenticated using (published);
create policy "Public can read published podcasts" on public.podcasts
  for select to anon, authenticated using (published);

-- ---------------------------------------------------------------------------
-- Storage: public-read buckets, admin-only writes, JPG/PNG/WebP up to 5MB
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('posters', 'posters', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('gallery', 'gallery', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('content', 'content', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can read site images" on storage.objects
  for select to authenticated
  using (bucket_id in ('posters', 'gallery', 'content') and public.is_admin());

create policy "Admins can upload site images" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('posters', 'gallery', 'content') and public.is_admin());

create policy "Admins can update site images" on storage.objects
  for update to authenticated
  using (bucket_id in ('posters', 'gallery', 'content') and public.is_admin())
  with check (bucket_id in ('posters', 'gallery', 'content') and public.is_admin());

create policy "Admins can delete site images" on storage.objects
  for delete to authenticated
  using (bucket_id in ('posters', 'gallery', 'content') and public.is_admin());
