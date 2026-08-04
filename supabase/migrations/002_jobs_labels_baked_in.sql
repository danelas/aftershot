-- The owner's photos already have "BEFORE"/"AFTER" printed on them (every
-- collage app adds a plate). The reel then skips its own animated label, so a
-- shot isn't labelled twice.
--
-- Purely additive and reversible:
--   alter table jobs drop column labels_baked_in;
alter table jobs
  add column if not exists labels_baked_in boolean not null default false;
