# Prospector

Finds before/after posts on Instagram, renders an AfterShot reel branded with
the poster's own logo + phone number, and drops each one into Telegram with a
ready-to-paste DM. **Sending the DM is manual by design** — Instagram has no
cold-DM API and automated senders get banned, so the pipeline stops at your
phone.

## Flow

1. **Discover** — Apify `instagram-hashtag-scraper` over the configured
   hashtags (default: pressurewashing, roofcleaning, softwash,
   drivewaycleaning). A post qualifies if it's a carousel with ≥2 still images
   and both "before" and "after" in the caption.
2. **Brand** — Apify `instagram-profile-scraper` for each new account:
   profile pic → logo, business phone field or a phone regex over the bio.
3. **Render** — the normal customer pipeline, driven from outside: `/api/onboard`
   creates a customer (`prospect-<handle>@theaftershot.com`), the two carousel
   stills go into the `intake` bucket, `/api/jobs` queues the render.
4. **Queue** — each finished reel arrives in Telegram with the handle, phone,
   profile link, and the DM text. Watch the reel (this is also where you catch
   a flipped before/after), then send it from the IG app.

Already-contacted handles are remembered in `reels/prospect/state.json` in
Supabase storage — re-runs skip them.

## Run

```bash
npm run prospect              # full run, 5 prospects
npm run prospect -- --dry-run # discover + filter only
npm run prospect -- --limit 10 --hashtags pressurewashing,paverrestoration
```

## Env

In `.env` / `.env.local` (Supabase vars are already there):

| var | source |
| --- | --- |
| `APIFY_TOKEN` | same token PeekScout uses (showcase repo) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | same as telegram-routines |

## Costs & cadence

Each run is two Apify actor runs (hashtag sweep + profile batch) — roughly a
dollar or two per day at default volume. Keep the per-run cap modest: 5–10
reels a day is ~2 minutes of manual DM sending, which is also the volume that
looks human on the sending account.
