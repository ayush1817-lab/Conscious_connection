-- Karina's feedback (Oct 2026, round two): hosts can send photos from their
-- event through their private host page. Photos wait in a private bucket until
-- an admin approves them; approving copies the photo into the public gallery.
-- Declined photos are deleted straight away (only the row is kept, as a record).

create type public.gallery_submission_status as enum ('pending', 'approved', 'declined');

create table public.gallery_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  -- The event stays named even after it's removed.
  event_id uuid references public.events (id) on delete set null,
  event_title text not null check (char_length(event_title) between 1 and 200),
  -- Path in the private gallery-submissions bucket; null once declined or approved.
  image_path text,
  caption text check (caption is null or char_length(caption) <= 200),
  status public.gallery_submission_status not null default 'pending',
  decided_at timestamptz,
  gallery_image_id uuid references public.gallery_images (id) on delete set null
);

create index gallery_submissions_status_idx on public.gallery_submissions (status, created_at);
create index gallery_submissions_event_idx on public.gallery_submissions (event_id);

create trigger set_updated_at before update on public.gallery_submissions
  for each row execute function public.set_updated_at();

alter table public.gallery_submissions enable row level security;
revoke all on public.gallery_submissions from anon;
create policy "Admins have full access" on public.gallery_submissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- Hosts write through the server (service role), never directly.

-- Private bucket: not publicly readable. Hosts upload through signed upload
-- URLs from the server; admins can view (signed links) and delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-submissions', 'gallery-submissions', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can read submitted photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'gallery-submissions' and public.is_admin());

create policy "Admins can delete submitted photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gallery-submissions' and public.is_admin());
