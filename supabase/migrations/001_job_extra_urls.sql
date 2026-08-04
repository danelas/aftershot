-- Extra shots on a job: up to 3 photos played after the before/after reveal
-- and before the sell card. Paths in the 'intake' bucket, in display order.
--
-- Purely additive and reversible:
--   alter table jobs drop column extra_urls;
alter table jobs
  add column if not exists extra_urls text[] not null default '{}';
