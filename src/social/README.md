# AfterShot social agent

Posts **AfterShot's own ad** once a day. This is marketing for the product — not
a customer's reel. Customer reels are `worker/index.mjs` + `render-worker.yml`.

```
variants/*.json  →  render.mjs (Remotion `ProductAd`)  →  post.mjs (upload-post)
   copy only          screen-recording cuts in            our brand profile
                      public/ad-cuts/                     IG / TikTok / YouTube
```

No new footage is needed to add an ad: the app recording is already cut into
`public/ad-cuts/seg0..7.mp4`, and a variant only swaps the copy over it.

## Run it

```bash
npm run social:list      # the rotation, with today's pick marked
npm run social:dry       # render today's ad at 0.75 scale, don't post
npm run social           # render at full size; posts only if SOCIAL_POST=1
node src/social/run.mjs --variant agency-price --dry-run
```

Output lands in `out/social/<date>-<id>.mp4` with a `.json` sidecar (the copy
that would go out with it) — that pair is what CI uploads for review.

On this Windows box a full 1080×1920 libx264 render OOMs, so pass `--scale 0.75`
or lower locally. CI renders at 1.

## Adding a variant

Drop a JSON file in `variants/`. The `id` must match the filename.

```json
{
  "id": "my-angle",
  "props": { "hookKicker": "...", "hookLine1": "...", "hookPunch": "..." },
  "title": "shown as the YouTube title (trimmed to 90 chars)",
  "caption": "the post body, hashtags at the end"
}
```

`props` may set any of `hookKicker`, `hookLine1/2`, `hookPunch`, `hookSeconds`,
`scenes`, `endLine1/2`, `endSub`, `endSeconds`, `musicFile`, `musicVolume` —
anything else is rejected at load, because a typo'd key would silently render
the default copy instead. Whatever you leave out comes from `productAdDefaults`
in `remotion/ProductAd.tsx`.

Overriding `scenes` re-cuts the ad (see `short-cut.json`). Each scene's
`seconds` must not exceed the length of its clip in `public/ad-cuts/`, or the
shot freezes on its last frame:

| clip | seg0 | seg1 | seg2 | seg3 | seg4 | seg5 | seg6 | seg7 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| secs | 3.0  | 3.4  | 2.4  | 2.8  | 2.6  | 3.0  | 2.8  | 2.6  |

New footage: re-record the app, then re-run
`gold-touch-list/remotion-ui/scripts/cut-aftershot-ad.mjs` and copy the segs
over `public/ad-cuts/`.

## Which ad runs today

Day-index rotation — `floor(now/1 day) % variants.length`. No stored cursor: the
schedule is reproducible from the date, a skipped day can't wedge anything, and
re-running a day re-renders the same ad instead of burning the next one. Adding
a variant reshuffles which day lands where, which is fine for an ad rotation.

## Publishing

Render-only by default. It publishes only when **both**:

- `SOCIAL_POST=1` (repo Variable in CI, env locally), and
- `AFTERSHOT_SOCIAL_PROFILE` names our upload-post profile.

There is deliberately **no fallback to `UPLOAD_POST_USER`** — that variable is
the customer-job plumbing, and a fallback here would publish our marketing to a
customer's Instagram.

| env | what |
| --- | --- |
| `UPLOAD_POST_API_KEY` | shared upload-post key |
| `AFTERSHOT_SOCIAL_PROFILE` | our brand profile name (spends one of the 5 basic-plan seats) |
| `SOCIAL_PLATFORMS` | default `instagram,tiktok,youtube` |
| `AFTERSHOT_FACEBOOK_PAGE_ID` | only if posting to Facebook |
| `SOCIAL_POST` | `1` to actually publish |
| `SOCIAL_RENDER_CONCURRENCY` | default 1 — see the note in `render.mjs` |

Platforms are intersected with what the profile has actually linked, because
posting to an unlinked platform fails the whole request, linked ones included.

## Schedule

`.github/workflows/social-ad.yml`, 14:20 UTC daily. Safe by default: it renders
and uploads the artifact, and only posts once repo Variable `SOCIAL_POST=1`.
A manual dispatch can force a variant, and `post: false` on a dispatch forces
render-only even when the Variable is on. Failures ping the Manager inbox.
