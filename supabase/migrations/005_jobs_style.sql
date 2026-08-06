-- Reel format, chosen per job by the owner on the upload page.
--   wipe    — before holds, then an expanding wipe reveals the after
--   stacked — before and after share the frame top/bottom for the whole reel
-- Existing rows keep the original wipe reveal.
alter table jobs add column if not exists style text not null default 'wipe';
