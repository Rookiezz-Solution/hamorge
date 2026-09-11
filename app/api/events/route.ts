import { NextRequest, NextResponse } from 'next/server';
import { sendMetaEvent, clientIpFrom, metaCapiEnabled, MetaContent } from '@/lib/meta-capi';

/**
 * First-party relay for browser-originated events → Meta Conversions API.
 *
 * The browser sends the event shape it already built for the Pixel; this route
 * adds what only the server can see (real client IP, the _fbp/_fbc cookies as
 * received, the user agent) and hashes any PII before forwarding.
 *
 * The route is named /api/events rather than anything containing "meta", "fb" or
 * "pixel" so ad blockers' URL heuristics don't strip it.
 *
 * Purchase is NOT accepted here — it is fired directly from the order routes so a
 * closed tab can't lose the conversion. See /api/razorpay/verify and /api/orders.
 */

// PageView is intentionally absent — see trackPageView() in lib/analytics.ts.
const ALLOWED = new Set([
  'ViewContent',
  'AddToCart',
  'ViewCart',
  'InitiateCheckout',
  'AddPaymentInfo',
  'Search',
  'Lead',
  'CompleteRegistration',
]);

interface Body {
  name?: string;
  eventId?: string;
  eventSourceUrl?: string;
  user?: Record<string, string | number | null | undefined>;
  custom?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  if (!metaCapiEnabled) return NextResponse.json({ ok: true, skipped: true });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { name, eventId, eventSourceUrl, user = {}, custom = {} } = body;

  if (!name || !eventId) {
    return NextResponse.json({ error: 'name and eventId are required' }, { status: 400 });
  }
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ error: 'Unsupported event' }, { status: 400 });
  }

  await sendMetaEvent({
    eventName: name,
    eventId,
    eventSourceUrl: eventSourceUrl ?? req.headers.get('referer'),
    user: {
      email: user.email as string | undefined,
      phone: user.phone as string | undefined,
      firstName: user.firstName as string | undefined,
      lastName: user.lastName as string | undefined,
      city: user.city as string | undefined,
      state: user.state as string | undefined,
      zip: user.zip as string | undefined,
      country: user.country as string | undefined,
      externalId: user.externalId,
      fbp: req.cookies.get('_fbp')?.value,
      fbc: req.cookies.get('_fbc')?.value,
      clientIp: clientIpFrom(req.headers),
      userAgent: req.headers.get('user-agent'),
    },
    value: typeof custom.value === 'number' ? custom.value : undefined,
    currency: typeof custom.currency === 'string' ? custom.currency : undefined,
    contents: Array.isArray(custom.contents) ? (custom.contents as MetaContent[]) : undefined,
    contentIds: Array.isArray(custom.content_ids) ? (custom.content_ids as string[]) : undefined,
    contentName: typeof custom.content_name === 'string' ? custom.content_name : undefined,
    contentType: typeof custom.content_type === 'string' ? custom.content_type : undefined,
    contentCategory: typeof custom.content_category === 'string' ? custom.content_category : undefined,
    numItems: typeof custom.num_items === 'number' ? custom.num_items : undefined,
    searchString: typeof custom.search_string === 'string' ? custom.search_string : undefined,
  });

  return NextResponse.json({ ok: true });
}
