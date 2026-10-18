-- Client feedback (Oct 2026): event photos on the homepage and About page, with
-- alt text for every content image. Photo slots are ordinary site_sections rows
-- (image + optional caption in heading), so the admin edits them like any section.

alter table public.site_sections
  add column if not exists image_alt text check (image_alt is null or char_length(image_alt) <= 300);

insert into public.site_sections (page, key, heading, body, sort_order)
values
  ('home', 'photo_1', '', '', 21),
  ('home', 'photo_2', '', '', 22),
  ('home', 'photo_3', '', '', 23),
  ('about', 'photo_1', '', '', 21),
  ('about', 'photo_2', '', '', 22),
  ('about', 'photo_3', '', '', 23)
on conflict (page, key) do nothing;
