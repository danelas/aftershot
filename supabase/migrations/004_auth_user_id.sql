-- Google / Facebook sign-in.
--
-- The upload token stays the credential every route already checks; this column
-- only records which Supabase Auth user owns the row, so a returning customer
-- can get back to their token by signing in with the same email instead of
-- hunting for the welcome email.
alter table customers add column if not exists auth_user_id uuid;

-- One auth identity can't own two customer rows. Partial so the existing
-- token-only rows (all NULL) don't collide with each other.
create unique index if not exists customers_auth_user_id_key
  on customers (auth_user_id)
  where auth_user_id is not null;
