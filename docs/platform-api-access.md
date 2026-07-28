# Platform API access — start these on DAY ONE

These approvals are the long pole. upload-post.com carries v1 so we're not
blocked, but we file all three direct-API applications immediately and swap the
plumbing as each clears. Order by attainability.

## 1. YouTube Data API v3 (easiest, do first)
- Google Cloud project → enable **YouTube Data API v3**.
- OAuth consent screen: external, scopes `youtube.upload`, `youtube.readonly`.
- **Audit needed** only past the unverified-app 100-user cap / to remove the
  "unverified app" screen — but uploads work in testing mode immediately for a
  handful of connected accounts. Good enough to launch the beachhead.
- Quota: default 10,000 units/day; an upload costs ~1,600 units (~6 uploads/day/project).
  Request a quota increase early — it takes time.

## 2. Instagram (Graph API — Content Publishing)
- Requires: Meta app + **Instagram Business/Creator account linked to a
  Facebook Page**. Owners must connect via Facebook Login.
- Permissions: `instagram_content_publish`, `instagram_basic`,
  `pages_show_list`, `business_management`.
- **App Review required** for those permissions on accounts you don't own →
  submit screencast + use-case. Budget 1–3 weeks.
- Reels publishing supported via the content-publishing endpoints (video +
  cover + caption; poll container status before publish).

## 3. TikTok Content Posting API (slowest — this is the wall)
- Direct Post requires TikTok app review + **Login Kit** + domain verification.
- Until audited, every post is forced **private/unaudited**; ~15 posts/day/creator cap.
- We are ALREADY stuck in this review for PeekScout — expect the same multi-week
  wait. AfterShot is a separate app/brand → separate review. File now.
- **Launch does not depend on TikTok.** Lead IG + YouTube; TikTok is upside.

## Status tracker
| Platform | App created | OAuth scopes set | Review submitted | Approved | Live in worker |
|---|---|---|---|---|---|
| YouTube  | ☐ | ☐ | ☐ | ☐ | ☐ |
| Instagram| ☐ | ☐ | ☐ | ☐ | ☐ |
| TikTok   | ☐ | ☐ | ☐ | ☐ | ☐ |
