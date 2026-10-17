-- Client feedback (Oct 2026): podcasts from YouTube, Spotify or an uploaded audio file.
--
-- source says which one an episode uses; exactly that field must be filled in.
-- Existing podcasts are all YouTube. Audio files live in a new public bucket,
-- "podcasts" (MP3 or M4A, up to 50MB); only admins can upload.

create type public.podcast_source as enum ('youtube', 'spotify', 'audio');

alter table public.podcasts
  add column source public.podcast_source not null default 'youtube',
  add column spotify_url text,
  add column audio_path text,
  alter column youtube_url drop not null;

alter table public.podcasts add constraint podcasts_source_filled check (
  case source
    when 'youtube' then youtube_url is not null
    when 'spotify' then spotify_url is not null
    when 'audio' then audio_path is not null
  end
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('podcasts', 'podcasts', true, 52428800, array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can read podcast audio" on storage.objects
  for select to authenticated
  using (bucket_id = 'podcasts' and public.is_admin());

create policy "Admins can upload podcast audio" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'podcasts' and public.is_admin());

create policy "Admins can update podcast audio" on storage.objects
  for update to authenticated
  using (bucket_id = 'podcasts' and public.is_admin())
  with check (bucket_id = 'podcasts' and public.is_admin());

create policy "Admins can delete podcast audio" on storage.objects
  for delete to authenticated
  using (bucket_id = 'podcasts' and public.is_admin());
