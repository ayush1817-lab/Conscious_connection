-- Client feedback (Nov 2026): an optional cover photo for a podcast, shown on
-- the "Listen now" card (web links) and beside the audio player. Stored in the
-- public "content" bucket under podcasts/<random id>.<ext>, like story photos.

alter table public.podcasts add column if not exists thumbnail_path text;
