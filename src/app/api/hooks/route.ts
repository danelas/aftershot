import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {aiConfigured, toolCall} from '@/lib/anthropic';

// POST /api/hooks  { t, draft? }
// Three hook lines for the caption field on the uploader. A blank caption box is
// the step people stall on, so this hands them something to tap instead of
// something to write. `draft` sharpens the suggestions toward what they started
// typing rather than replacing it with generic lines.
export const runtime = 'nodejs';

const TRADE_LABEL: Record<string, string> = {
  pressure_washing: 'pressure washing',
  detailing: 'auto detailing',
  landscaping: 'landscaping',
};

// Used when the key is missing and when the model is unreachable — the button
// should never leave someone staring at an error over a nice-to-have.
function fallback(trade: string | null): string[] {
  const noun = trade === 'detailing' ? 'this car' : trade === 'landscaping' ? 'this yard' : 'this one';
  return [
    `Wait for it… ${noun} was rough`,
    'The satisfying part is at the end',
    'Nobody believed this would come clean',
  ];
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = String(body?.t || '').trim();
  const draft = String(body?.draft || '').trim().slice(0, 200);
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});

  const sb = serviceClient();
  const {data: c} = await sb
    .from('customers')
    .select('business_name, city, trade')
    .eq('upload_token', token)
    .maybeSingle();
  if (!c) return NextResponse.json({error: 'not found'}, {status: 404});

  if (!aiConfigured()) return NextResponse.json({hooks: fallback(c.trade)});

  const trade = TRADE_LABEL[c.trade || ''] || 'a home service';
  try {
    const out = await toolCall(
      [
        `Write 3 short hook lines for a before/after social reel by ${c.business_name}, `,
        `a ${trade} business${c.city ? ` in ${c.city}` : ''}.`,
        draft ? `\n\nThey started typing: "${draft}". Stay close to that idea.` : '',
        '\n\nRules: under 8 words each. Spoken plainly, like the owner talking, not ad copy.',
        ' No hashtags, no emoji, no quotation marks. Make the three genuinely different from each other.',
      ].join(''),
      {
        name: 'hooks',
        description: 'Return the three hook lines.',
        input_schema: {
          type: 'object',
          properties: {
            hooks: {type: 'array', items: {type: 'string'}, minItems: 3, maxItems: 3},
          },
          required: ['hooks'],
        },
      },
      300,
    );
    const hooks = (Array.isArray(out?.hooks) ? out.hooks : [])
      .filter((h: unknown): h is string => typeof h === 'string' && h.trim().length > 0)
      .map((h: string) => h.trim().replace(/^["']|["']$/g, '').slice(0, 80))
      .slice(0, 3);
    return NextResponse.json({hooks: hooks.length ? hooks : fallback(c.trade)});
  } catch (e: any) {
    console.error('hook suggest failed', {message: e?.message});
    return NextResponse.json({hooks: fallback(c.trade)});
  }
}
