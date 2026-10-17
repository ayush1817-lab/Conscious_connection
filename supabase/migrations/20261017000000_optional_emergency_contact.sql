-- Client feedback (Oct 2026): hosts are no longer asked for an emergency contact.
-- The columns stay (now optional) so the field is easy to bring back later, and
-- events submitted before this change keep the details they were given.

alter table public.event_private_details
  alter column emergency_contact_name drop not null,
  alter column emergency_contact_phone drop not null;
