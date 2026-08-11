# AfterShot

**Text-free, done-for-you before/after reels for transformation trades.**
The owner drops a before + after photo from each job into a one-tap home-screen
page. We auto-generate a captioned, music-scored before/after reel and auto-post
it to their Instagram / TikTok / YouTube. They never open an editor.

- **Beachhead:** pressure washing (cleanest, most viral before/after). Auto
  detailing + landscaping are fast-follows — same engine, different templates.
- **Price:** $99–149/mo. $79 founding tier for the first ~10.
- **The distribution loop:** every posted reel carries a subtle "made with
  AfterShot" end-card. In a genre that already goes viral, rival pros who see a
  competitor blow up click through. Plus warm-seed from existing PeekScout/GTL
  provider lists — not cold outreach.

## The whole product is one loop

```
owner opens home-screen page → drops before + after → job queued
   → worker renders BeforeAfter reel (Remotion, server-side)
   → poster publishes to IG/TikTok/YT
   → reminder nudges owner for the next job (email + web push)
   → repeat
```

## Architecture

Two deploy targets, one repo:

- **web** (Next.js App Router on Vercel) — the upload PWA (`/u/[token]`),
  owner dashboard (`/dash`), onboarding + Stripe checkout, reminder cron.
  Never renders video (serverless timeouts).
- **worker** (Node, on Render — mirrors `pro-email-extractor`'s cron worker) —
  polls Supabase `jobs where status='pending'` → renders the `BeforeAfter`
  Remotion composition → uploads the mp4 to Supabase Storage → posts via the
  poster → marks done. Retries with backoff (learned from PeekScout's
  upload-post poll-timeout / rolling-alias failures).

- **social agent** (`src/social/`, GitHub Actions) — our own marketing, not a
  customer's reel: renders one ad variant a day from the app screen-recording
  cuts and posts it to AfterShot's accounts. Render-only until `SOCIAL_POST=1`.
  See `src/social/README.md`.

State + storage + auth: Supabase. Billing: Stripe (attribution via
`client_reference_id`, per house style). Email: Resend.

### Reel engine
New Remotion composition `remotion/BeforeAfter.tsx`, 1080×1920 @ 30fps,
modelled on `remotion-ui/src/ListingReel.tsx`. NOT the client-side
`showcase/src/lib/brandClip.ts` canvas path — that needs a live browser; we
render headless with nobody watching.

### Posting
v1 goes through **upload-post.com** (invisible backend plumbing — the customer
never sees it; nothing white-labeled). It's a known cost + fragility, so in
parallel we start the **direct platform-API applications on day one** — those
approvals are the long pole (see `docs/platform-api-access.md`). We swap the
plumbing to direct APIs as each is approved. IG Graph + YouTube first; TikTok's
audit is slowest.

## 2-week roadmap

### Week 1 — the loop works end-to-end for one test customer
- [ ] Supabase schema + storage buckets (`supabase/schema.sql`)
- [ ] Upload PWA page `/u/[token]` — pick before + after, submit, done. Add-to-home-screen.
- [ ] `BeforeAfter` Remotion composition (before → wipe → after → end-card)
- [ ] Worker: poll → render → store. One job in, one reel out.

### Week 2 — it's a real product
- [ ] Poster: reel → upload-post → scheduled publish
- [ ] Onboarding: connect socials, upload logo, pick trade
- [ ] Stripe subscription ($99–149/mo) + `client_reference_id` attribution
- [ ] Owner dashboard: queued / posted reels
- [ ] Reminders: email (Resend) + web push. WhatsApp = later.
- [ ] Seed 5–10 real pressure-washers from PeekScout/GTL lists at $79 founding

## Decisions log
- **Intake = upload link (home-screen PWA), not SMS.** SMS loses on: A2P 10DLC
  carrier registration (days–weeks, would stall a 2-week launch) and MMS
  compressing source photos to garbage (kills a video product). PWA gives
  full-res + ships this week. SMS-in revisited later as a premium add-on.
- **Reminders = email + web push for v1; WhatsApp later.**
- **Posting = upload-post.com v1; direct platform APIs as they're approved.**
- **First trade = pressure washing.**
