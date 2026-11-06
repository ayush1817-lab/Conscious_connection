-- Client feedback (Nov 2026): a podcast can also be a plain web link (Linktree,
-- Apple Podcasts, SoundCloud, a website...). The site shows a "Listen" button
-- that opens it. source = 'link' needs link_url, an http(s) address.
--
-- The check compares source as text so this file also works when the new enum
-- value and the constraint are added in one transaction (Supabase SQL Editor).

alter type public.podcast_source add value if not exists 'link';

alter table public.podcasts add column if not exists link_url text;

alter table public.podcasts drop constraint if exists podcasts_source_filled;
alter table public.podcasts add constraint podcasts_source_filled check (
  case source::text
    when 'youtube' then youtube_url is not null
    when 'spotify' then spotify_url is not null
    when 'audio' then audio_path is not null
    when 'link' then link_url is not null
    else false
  end
);

alter table public.podcasts drop constraint if exists podcasts_link_url_web;
alter table public.podcasts add constraint podcasts_link_url_web check (link_url is null or link_url ~* '^https?://');
