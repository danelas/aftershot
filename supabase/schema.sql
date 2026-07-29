-- AfterShot schema. Run in the Supabase SQL editor.
-- One customer (a trade business) → many jobs → one reel per job → posts per platform.

create extension if not exists "pgcrypto";

-- A trade business (the paying owner).
create table if not exists customers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  business_name text not null,
  trade         text not null default 'pressure_washing', -- pressure_washing | detailing | landscaping
  city          text,
  logo_url      text,
  brand_color   text default '#0EA5E9',
  -- Conversion fields shown on the reel's sell-card (collected at onboarding).
  phone         text,
  handle        text,   -- @theirhandle
  service_area  text,   -- "Jupiter & Palm Beach County"
  rating        numeric,
  review_count  int,
  licensed_insured boolean not null default false,
  price_from    text,   -- "$199"
  cta_text      text not null default 'Free Quote',
  google_place_id text,  -- Places API id; rating/review_count refreshed weekly from it
  -- The secret slug in the home-screen upload URL /u/<upload_token>.
  upload_token  text not null unique default encode(gen_random_bytes(9), 'hex'),
  email         text not null,
  -- Billing
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan          text not null default 'trial', -- trial | founding | standard
  status        text not null default 'active', -- active | paused | canceled
  -- Web-push subscription JSON (from the PWA service worker), if granted.
  push_sub      jsonb,
  -- upload-post.com profile handle for this customer's connected accounts.
  upload_post_profile text,
  -- Which platforms to publish to (defaults to the ones that matter for trades).
  platforms text[] not null default '{instagram,tiktok,youtube}'
);

-- A single before/after submission.
create table if not exists jobs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  customer_id  uuid not null references customers(id) on delete cascade,
  before_url   text not null,   -- Supabase Storage path
  after_url    text not null,
  before_is_video boolean not null default false,
  after_is_video  boolean not null default false,
  hook         text,            -- optional owner-supplied caption/hook
  status       text not null default 'pending', -- pending | rendering | rendered | posting | done | failed
  attempts     int  not null default 0,
  error        text,
  reel_url     text,            -- rendered mp4 in Storage
  cover_url    text
);
create index if not exists jobs_status_idx on jobs (status, created_at);

-- One row per platform we published (or tried to) for a job.
create table if not exists posts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  job_id      uuid not null references jobs(id) on delete cascade,
  platform    text not null,   -- instagram | tiktok | youtube
  status      text not null default 'pending', -- pending | posted | failed
  external_id text,            -- platform post/video id
  permalink   text,
  error       text
);

-- Reminder cadence: when we last nudged an owner to send a new job.
create table if not exists reminders (
  customer_id uuid primary key references customers(id) on delete cascade,
  last_job_at timestamptz,
  last_nudge_at timestamptz,
  channel     text not null default 'email' -- email | push
);

-- Storage buckets (create in dashboard or via API):
--   'intake'  (private) — raw owner uploads
--   'reels'   (public)  — rendered mp4s + covers, so upload-post/platforms can fetch by URL
