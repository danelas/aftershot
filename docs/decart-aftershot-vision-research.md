# AfterShot Vision — Decart realtime-video research

Source: ChatGPT shared conversation "Making Money with Decart"
https://chatgpt.com/share/6a7d3af8-fe7c-83ea-9ede-1ba7d5218695
Saved 2026-08-12. Third-party analysis — not verified by us. Treat the pricing,
rankings, and market claims below as that chat's opinion, and the company/customer
claims as things to re-check against primary sources before acting.

---

## What Decart actually exposes today (per that chat, citing Decart's docs)

- **Lucy 2.5 realtime** — takes a live camera stream over WebRTC and generates a
  modified version of it live: add/remove/replace objects, replace characters,
  change attributes, backgrounds, styles, effects. Decart's own quickstart demo
  changes a wall's paint color in a live camera stream. 720p. Prompts can be
  changed *without reconnecting the stream*.
- **VTON 3.5** — dedicated virtual try-on model: puts a garment from a reference
  image onto a person in live video, preserving movement and body shape.
- **Pricing** — ~$0.02 per generated second for Lucy 2.5 realtime.
- **SDKs** — JavaScript + mobile SDKs, direct WebRTC, client auth, and an
  "integrations" system explicitly aimed at platforms embedding Decart for their
  own users.

Key framing: a TikTok filter is `camera → detect face/body → warp/attach effect`
(AR + CV). Decart is `camera → generative model understands the scene →
regenerates the video → returns it live`. Much more general.

## The ranked business list (that chat's ranking)

| # | Business | Score | First revenue |
|---|---|---|---|
| 1 | Live Home Transformation / Sales Closer | 10/10 | Fast |
| 2 | Live Virtual Fitting Room for stores | 9.5/10 | Medium |
| 3 | AI Transformation Booth for events | 9.2/10 | Very fast |
| 4 | Live AI effects for streamers | 9/10 | Medium |
| 5 | Live Commerce Transformation Studio | 8.7/10 | Medium |
| 6 | Live AI staging for realtors | 8.5/10 | Fast |
| 7 | Interactive branded AI experiences | 8/10 | Slow |
| 8 | Generic AI video agency | 6/10 | Fast |

Explicitly told NOT to build: generic AI-filter app, "turn yourself into anime",
generic prompt-to-video site, a Decart API reseller, "upload a video, get four
versions." Those are features, not companies.

## #1 — "AfterShot Vision"

A contractor stands in the customer's actual kitchen, opens the phone camera,
and taps preset buttons (Modern / White Cabinets / Black Cabinets / Warm Wood /
Luxury / Coastal). The customer watches their own real kitchen transform live as
the phone moves. "What about darker walls?" — tap — change.

Verticals: painters, kitchen remodelers, bath remodelers, landscapers, pool
companies, roofers, flooring, interior designers.

Economics argument for ranking it above try-on: a clothing store gains one shirt
sale; a remodeler is trying to close $30k–$100k. Proposed (that chat's numbers,
not Decart's) $99 / $249 / $499+ per month — vs ~$0.02/generated-second cost.

Product loop is the actual business, not the transformation:
**See it → choose it → save it → quote it → close it.**

Required disclaimer: market it as **AI visualization**, not architectural/CAD
accuracy or an exact representation of installed materials. Lucy is generative
video, not engineering software.

### Why this matters for the existing AfterShot

It bolts onto the front of the current product and makes it own both ends of the
transaction:

- **Before the sale** — Vision helps the contractor *close* the customer.
- **After the job** — today's AfterShot turns the real before/after into their
  marketing video, which gets them the next customer.

BEFORE → VISION → AFTER. Same customer, same vertical, same list.

#6 (realtor staging) is the same engine with a different workflow and would live
under the same roof.

## The moat warning

If Decart succeeds, *using Decart is not a moat* — everyone can call the same
API. The defensible layer is the contractor workflow: materials/catalog
integration, quoting, saved designs, customer presentation, CRM, before/vision/
after history, sales data, and distribution to contractors.

Model to copy: **LOOOK.AI** — they didn't build "DecartAIWrapper.com", they own
AI smart mirrors for retail (hardware + UI + catalog + analytics + customers) and
the customer never hears the word Decart.

## Who's already using Decart (claims from that chat — verify before relying)

- **LOOOK.AI** — integrated Decart's SDK into retail smart mirrors; adds products
  from ordinary catalog images, no 3D garment models. Ran H&M Group x Stella
  McCartney's collection launch in Lima (40+ looks, 260+ minutes of active use,
  hundreds of virtual try-ons), built with Decart. Also Decart-powered try-on
  activations associated with Wynn Las Vegas.
- **Amazon** — WSJ (May) reported Amazon is Decart's largest customer, deployed
  across Twitch, online retail, and its movie/TV studios. Caveat: Decart has
  several technologies (DOS, Lucy, Oasis), so this doesn't establish that every
  Amazon deployment is Lucy.
- **Twitch creators** — Forbes reported Decart testing Lucy with Twitch creators;
  demoed character transformations, wardrobe changes, and environment changes
  live at TwitchCon.
- **Comcast + NVIDIA** — testing an AI network edge with Decart supplying
  realtime video AI; first application is per-household personalized video
  advertising. Comcast describes it as a trial, not a shipped product.
- **ElevenLabs** — "Building Living Characters With Decart and ElevenLabs":
  ElevenLabs voice + Decart visual character/lip-sync. A collaboration/demo, not
  evidence of a paying-customer relationship.
- **TikTok** — no announced Decart partnership as of 2026-08-12. TikTok has its
  own effects stack (Effect House, generative effects, Symphony, AI Editor) and
  strong incentives to control inference cost, latency, moderation, and data, so
  betting on TikTok as a Decart customer is a bad bet. The more likely and more
  valuable outcome is Stripe-shaped: thousands of small companies building things
  that used to require TikTok-scale engineering.

## The gap worth checking first

That chat found plenty of fashion/retail activity on Decart but **could not find
anyone shipping the full contractor product**: point the phone at the customer's
actual room → customer changes the project live → selection is saved → quote is
produced. That's the thing to validate before writing code.
