import {NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {aiConfigured, toolCall} from '@/lib/anthropic';
import {newId, categoryEmojis, type AnimKind, type CaptionStyle, type Overlay, type StickerKind} from '@/lib/studio';
import {STUDIO_TRACKS} from '@/lib/studioMusic';
import type {CaptionSegment} from '@/lib/captions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// AI Auto-Director ("Magic edit"), ported from PeekScout: reads the customer's
// real rating/price/phone and returns a full scroll-stopping overlay layout.
// The model only picks the *creative direction* (hook, which stickers, an
// emoji, a track); the server compiles that into valid Overlay[] using the
// same studio constants the editor and export share — so the result is always
// on-brand and never mis-positioned. Included with every plan — no credits.

type Ctx = {
  name: string;
  category: string;
  city: string;
  phone: string | null;
  rating: number;
  reviewCount: number;
  priceMin: number | null;
};

// Which pro-stickers are backed by real data (others would render blank).
function availableStickers(c: Ctx): StickerKind[] {
  const out: StickerKind[] = [];
  if (c.rating > 0 && c.reviewCount > 0) out.push('rating');
  if (c.priceMin) out.push('price');
  if (c.phone) out.push('book');
  out.push('promo', 'urgency', 'cta', 'beforeafter');
  return out;
}

function stickerText(kind: StickerKind, c: Ctx, promoText: string): string {
  switch (kind) {
    case 'rating': return `★ ${c.rating.toFixed(1)} · ${c.reviewCount} reviews`;
    case 'price': return `From $${c.priceMin}`;
    case 'book': return `📞 Call/Text ${c.phone}`;
    case 'offer': return promoText || '🎁 New-client offer';
    case 'promo': return promoText || '20% OFF THIS WEEK';
    case 'urgency': return promoText || '🔥 2 SPOTS LEFT THIS WEEK';
    case 'cta': return '👇 Call below';
    case 'refer': return '';
    case 'beforeafter': return 'BEFORE ➜ AFTER';
  }
}

// Where each sticker sits + how it animates (mirrors the manual studio defaults).
const STICKER_LAYOUT: Record<StickerKind, {y: number; anim: AnimKind}> = {
  beforeafter: {y: 0.24, anim: 'none'},
  rating: {y: 0.34, anim: 'pop'},
  price: {y: 0.44, anim: 'none'},
  offer: {y: 0.54, anim: 'pulse'},
  promo: {y: 0.6, anim: 'pulse'},
  urgency: {y: 0.6, anim: 'flash'},
  cta: {y: 0.74, anim: 'bounce'},
  book: {y: 0.82, anim: 'none'},
  refer: {y: 0.9, anim: 'none'},
};

const HOOK_ANIMS: AnimKind[] = ['pop', 'bounce', 'pulse', 'float', 'wiggle', 'none'];
const CAP_STYLES: CaptionStyle[] = ['clean', 'karaoke', 'wordpop'];
const MUSIC_IDS = STUDIO_TRACKS.map((t) => t.id);

export async function POST(req: Request) {
  if (!aiConfigured()) {
    return NextResponse.json({ok: false, reason: 'not_configured'}, {status: 503});
  }

  let body: {
    token?: string;
    captions?: CaptionSegment[] | null;
    hasWords?: boolean;
    context?: Partial<Ctx>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ok: false, error: 'Invalid JSON'}, {status: 400});
  }

  const token = String(body.token || '').trim();
  if (!token) return NextResponse.json({ok: false, error: 'Missing token'}, {status: 400});
  const sb = serviceClient();
  const {data: customer} = await sb
    .from('customers')
    .select('business_name, trade, service_area, phone, rating, review_count, price_from')
    .eq('upload_token', token)
    .maybeSingle();
  if (!customer) return NextResponse.json({ok: false, error: 'Not authorized'}, {status: 401});

  const ctx: Ctx = {
    name: customer.business_name,
    category: String(body.context?.category || customer.trade || '').trim(),
    city: String(body.context?.city || customer.service_area || '').trim(),
    phone: customer.phone,
    rating: customer.rating != null ? Number(customer.rating) : 0,
    reviewCount: customer.review_count ?? 0,
    priceMin: customer.price_from ? Number(String(customer.price_from).replace(/[^0-9.]/g, '')) || null : null,
  };

  const transcript = (body.captions || [])
    .map((s) => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
  const hasWords = !!body.hasWords;
  const stickers = availableStickers(ctx);

  const prompt = `You are a short-form video editor directing ONE TikTok/Reels edit for a local service business's before/after clip. Make it stop the scroll and drive calls. Be tasteful — pick only what earns its place.

Business: ${ctx.name}
Trade: ${ctx.category}${ctx.city ? `\nService area: ${ctx.city}` : ''}
${ctx.rating > 0 ? `Google rating: ${ctx.rating.toFixed(1)} (${ctx.reviewCount} reviews)` : 'No rating yet'}
${ctx.priceMin ? `Starting price: $${ctx.priceMin}` : ''}
${ctx.phone ? `Phone (call/text CTA available)` : ''}
Clip transcript: ${transcript ? `"${transcript}"` : '(none — before/after reel with music only)'}

Call direct_edit with:
- hook: a punchy 2-6 word on-screen opener that fits THIS clip (use the trade). No hashtags, no quotes, at most 1 emoji.
- hookAnim: an entrance/idle animation for the hook.
- stickers: 1-3 of the available pro-stickers, most persuasive first. Only pick from this list: ${stickers.join(', ')}. Prefer a proof sticker (rating/price) plus one call-to-action (book or cta). Never pick both promo and urgency.
- promoText: SHORT all-caps promo/urgency text, only if you chose "promo" or "urgency" (else "").
- captionStyle: ${transcript && hasWords ? 'karaoke or wordpop are great here.' : 'use clean (no speech in this clip).'}
- emoji: one single trade-appropriate emoji to sprinkle in.
- music: pick ONE soundtrack whose mood fits this clip and trade — it loops under the video. Options: ${STUDIO_TRACKS.map((t) => `${t.id} (${t.mood})`).join('; ')}.
- rationale: one short sentence on why this edit works.`;

  try {
    const d = (await toolCall(prompt, {
      name: 'direct_edit',
      description: 'Direct one scroll-stopping edit for the clip.',
      input_schema: {
        type: 'object',
        properties: {
          hook: {type: 'string'},
          hookAnim: {type: 'string', enum: HOOK_ANIMS},
          stickers: {type: 'array', items: {type: 'string', enum: stickers}, maxItems: 3},
          promoText: {type: 'string'},
          captionStyle: {type: 'string', enum: CAP_STYLES},
          emoji: {type: 'string'},
          music: {type: 'string', enum: MUSIC_IDS},
          rationale: {type: 'string'},
        },
        required: ['hook', 'hookAnim', 'stickers', 'captionStyle', 'emoji', 'music', 'rationale'],
      },
    })) as {
      hook: string;
      hookAnim: AnimKind;
      stickers: StickerKind[];
      promoText?: string;
      captionStyle: CaptionStyle;
      emoji: string;
      music?: string;
      rationale: string;
    };

    // ---- compile the direction into valid overlays (server is the authority) ----
    const overlays: Overlay[] = [];
    const hookAnim: AnimKind = HOOK_ANIMS.includes(d.hookAnim) ? d.hookAnim : 'pop';
    const hook = String(d.hook || '').trim().slice(0, 60);
    if (hook) {
      overlays.push({
        id: newId(), kind: 'text', text: hook, font: 'sans', color: '#ffffff',
        style: 'pill', x: 0.5, y: 0.16, scale: 1, rotation: 0, timing: 'all', anim: hookAnim,
      });
    }

    const promoText = String(d.promoText || '').trim().slice(0, 40);
    const chosen = (Array.isArray(d.stickers) ? d.stickers : [])
      .filter((k, i, a) => stickers.includes(k) && a.indexOf(k) === i)
      .slice(0, 3);
    for (const kind of chosen) {
      const layout = STICKER_LAYOUT[kind];
      overlays.push({
        id: newId(), kind: 'sticker', sticker: kind, text: stickerText(kind, ctx, promoText),
        font: 'sans', color: '#ffffff', style: 'pill',
        x: 0.5, y: layout.y, scale: 1, rotation: 0, timing: 'all', anim: layout.anim,
      });
    }

    // One trade emoji, top-right, gently pulsing.
    const emoji = (String(d.emoji || '').trim() || categoryEmojis(ctx.category)[0] || '✨').slice(0, 4);
    overlays.push({
      id: newId(), kind: 'emoji', text: emoji, font: 'sans', color: '#ffffff',
      style: 'plain', x: 0.82, y: 0.26, scale: 1, rotation: 0, timing: 'all', anim: 'pulse',
    });

    // karaoke/wordpop only make sense when the clip actually has word timing.
    let captionStyle: CaptionStyle = CAP_STYLES.includes(d.captionStyle) ? d.captionStyle : 'clean';
    if (captionStyle !== 'clean' && !hasWords) captionStyle = 'clean';

    // Soundtrack the director chose (validated against the library).
    const music = MUSIC_IDS.includes(String(d.music)) ? String(d.music) : null;

    return NextResponse.json({
      ok: true,
      overlays,
      captionStyle,
      music,
      hook,
      rationale: String(d.rationale || '').trim().slice(0, 200),
      // Included with the subscription — no credit system.
      balance: {freeRemaining: 999, credits: 0},
    });
  } catch (err) {
    console.error('studio/direct error:', err);
    return NextResponse.json({ok: false, error: "Couldn't direct this clip — try again."}, {status: 502});
  }
}
