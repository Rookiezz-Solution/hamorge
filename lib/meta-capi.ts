import crypto from 'crypto';

/**
 * Meta Conversions API (server-side events).
 *
 * Every event sent from here is expected to have a browser-side twin fired by the
 * Pixel with the SAME `event_id`. Meta deduplicates on (event_name, event_id), so
 * the pair counts once — the server copy is what survives ad blockers and ITP.
 *
 * Nothing in this module ever throws: analytics must never break an order.
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE;
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';

export const metaCapiEnabled = Boolean(PIXEL_ID && ACCESS_TOKEN);

/* ─── Normalisation + hashing ─────────────────────────────
   Meta requires customer identifiers to be SHA-256 of the normalised,
   lowercased value. Raw PII must never leave this server unhashed.      */

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashPlain(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  return normalised ? sha256(normalised) : undefined;
}

/** City/state/country: lowercase, strip spaces and punctuation. */
function hashToken(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase().replace(/[^a-z]/g, '');
  return normalised ? sha256(normalised) : undefined;
}

/** Phone: digits only, E.164 without '+'. Bare 10-digit numbers are assumed Indian. */
function hashPhone(value?: string | null): string | undefined {
  if (!value) return undefined;
  let digits = value.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.length === 10) digits = `91${digits}`;
  return sha256(digits);
}

function hashZip(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase().replace(/\s/g, '');
  return normalised ? sha256(normalised) : undefined;
}

/* ─── Types ───────────────────────────────────────────── */

export interface MetaUserInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  /** WooCommerce customer id — stable cross-device identifier. */
  externalId?: string | number | null;
  /** Meta browser id cookie (_fbp). */
  fbp?: string | null;
  /** Meta click id cookie (_fbc). */
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

export interface MetaContent {
  id: string;
  quantity: number;
  item_price: number;
}

export interface MetaEventInput {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string | null;
  eventTime?: number;
  user: MetaUserInput;
  value?: number;
  currency?: string;
  contents?: MetaContent[];
  contentIds?: string[];
  contentName?: string;
  contentType?: string;
  contentCategory?: string;
  numItems?: number;
  orderId?: string | number;
  searchString?: string;
}

/* ─── Payload builders ────────────────────────────────── */

function buildUserData(user: MetaUserInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    em: hashPlain(user.email),
    ph: hashPhone(user.phone),
    fn: hashPlain(user.firstName),
    ln: hashPlain(user.lastName),
    ct: hashToken(user.city),
    st: hashToken(user.state),
    zp: hashZip(user.zip),
    country: hashToken(user.country),
    external_id: user.externalId != null ? hashPlain(String(user.externalId)) : undefined,
    // fbp/fbc/IP/user-agent are sent raw — Meta expects these unhashed.
    fbp: user.fbp || undefined,
    fbc: user.fbc || undefined,
    client_ip_address: user.clientIp || undefined,
    client_user_agent: user.userAgent || undefined,
  };
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }
  return data;
}

function buildCustomData(event: MetaEventInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    currency: event.currency,
    value: event.value,
    contents: event.contents,
    content_ids: event.contentIds,
    content_name: event.contentName,
    content_type: event.contentType,
    content_category: event.contentCategory,
    num_items: event.numItems,
    order_id: event.orderId != null ? String(event.orderId) : undefined,
    search_string: event.searchString,
  };
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }
  return data;
}

/* ─── Sender ──────────────────────────────────────────── */

export async function sendMetaEvent(event: MetaEventInput): Promise<void> {
  if (!metaCapiEnabled) return;

  const payload = {
    data: [
      {
        event_name: event.eventName,
        event_id: event.eventId,
        event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
        event_source_url: event.eventSourceUrl || undefined,
        action_source: 'website',
        user_data: buildUserData(event.user),
        custom_data: buildCustomData(event),
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN!)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok && process.env.NODE_ENV !== 'production') {
      console.warn('[meta-capi] rejected:', res.status, await res.text());
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn('[meta-capi] failed:', err);
  }
}

/* ─── Request helpers ─────────────────────────────────── */

/** Real client IP behind Vercel/Hostinger/Cloudflare proxies. */
export function clientIpFrom(headers: Headers): string | undefined {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('cf-connecting-ip') || headers.get('x-real-ip') || undefined;
}

/* ─── Purchase helper ─────────────────────────────────── */

interface WooOrderish {
  id?: number | string;
  total?: string | number;
  currency?: string;
  customer_id?: number;
  billing?: {
    email?: string; phone?: string; first_name?: string; last_name?: string;
    city?: string; state?: string; postcode?: string; country?: string;
  };
  line_items?: { product_id?: number; quantity?: number; total?: string; price?: number; name?: string }[];
}

/**
 * Server-side Purchase, sent straight from the route that created the order.
 *
 * This is the authoritative conversion: it fires from a WooCommerce order that
 * actually exists, so it survives ad blockers, ITP and a shopper who closes the
 * tab on the confirmation redirect. The browser fires a twin with the same
 * `eventId`, which Meta deduplicates away.
 */
export async function sendPurchaseEvent(
  order: WooOrderish,
  eventId: string,
  req: { headers: Headers; cookies: { get(name: string): { value: string } | undefined } },
): Promise<void> {
  if (!metaCapiEnabled || !eventId || !order?.id) return;

  const lineItems = order.line_items ?? [];
  const contents: MetaContent[] = lineItems.map((li) => {
    const quantity = li.quantity ?? 1;
    const lineTotal = parseFloat(String(li.total ?? 0));
    return {
      id: String(li.product_id ?? ''),
      quantity,
      item_price: quantity > 0 ? Number((lineTotal / quantity).toFixed(2)) : lineTotal,
    };
  });

  const b = order.billing ?? {};

  await sendMetaEvent({
    eventName: 'Purchase',
    eventId,
    eventSourceUrl: req.headers.get('referer'),
    user: {
      email: b.email,
      phone: b.phone,
      firstName: b.first_name,
      lastName: b.last_name,
      city: b.city,
      state: b.state,
      zip: b.postcode,
      country: b.country || 'IN',
      externalId: order.customer_id || undefined,
      fbp: req.cookies.get('_fbp')?.value,
      fbc: req.cookies.get('_fbc')?.value,
      clientIp: clientIpFrom(req.headers),
      userAgent: req.headers.get('user-agent'),
    },
    value: parseFloat(String(order.total ?? 0)) || 0,
    currency: order.currency || 'INR',
    contents,
    contentIds: contents.map((c) => c.id),
    contentType: 'product',
    numItems: contents.reduce((n, c) => n + c.quantity, 0),
    orderId: order.id,
  });
}
