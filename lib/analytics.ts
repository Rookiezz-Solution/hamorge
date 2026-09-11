'use client';

/**
 * Unified tracking layer: GA4 (gtag) + Meta Pixel (browser) + Meta CAPI (server).
 *
 * Every commerce event fires three ways from one call. The Pixel event and the
 * server event share an `event_id` so Meta deduplicates them into a single
 * conversion — you get browser richness plus server reliability, not double counts.
 *
 * The server relay lives at /api/events (deliberately generic — paths containing
 * "fb", "meta" or "pixel" are pattern-matched by ad blockers).
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const CURRENCY = 'INR';

type Params = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

/* ─── Item shape shared by every event ────────────────── */

export interface TrackedItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  /** Size, colour — anything that distinguishes the purchased variant. */
  variant?: string;
  category?: string;
}

/** Identifiers we already know about the shopper. Never sent raw to Meta —
 *  the /api/events route hashes them before they leave our server. */
export interface TrackedUser {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  externalId?: string | number | null;
}

/* ─── Low-level emitters ──────────────────────────────── */

export function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function gaEvent(name: string, params: Params = {}) {
  if (!GA_ID || typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);
}

export function pixelEvent(name: string, params: Params = {}, eventId?: string) {
  if (!META_PIXEL_ID || typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', name, params, eventId ? { eventID: eventId } : undefined);
}

/** Fires the server-side twin. `keepalive` so it survives the page unloading. */
export function serverEvent(
  name: string,
  opts: { eventId: string; user?: TrackedUser; custom?: Params },
) {
  if (!META_PIXEL_ID || typeof window === 'undefined') return;
  try {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        name,
        eventId: opts.eventId,
        eventSourceUrl: window.location.href,
        user: opts.user ?? {},
        custom: opts.custom ?? {},
      }),
    }).catch(() => {});
  } catch {
    /* analytics must never surface an error to the shopper */
  }
}

/* ─── Shape converters ────────────────────────────────── */

function gaItems(items: TrackedItem[]) {
  return items.map((i) => ({
    item_id: String(i.id),
    item_name: i.name,
    price: i.price,
    quantity: i.quantity,
    ...(i.variant ? { item_variant: i.variant } : {}),
    ...(i.category ? { item_category: i.category } : {}),
  }));
}

function metaContents(items: TrackedItem[]) {
  return items.map((i) => ({
    id: String(i.id),
    quantity: i.quantity,
    item_price: i.price,
  }));
}

function sumValue(items: TrackedItem[]) {
  return Number(items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2));
}

/* ─── High-level commerce events ──────────────────────── */

export function trackPageView(url: string, title?: string) {
  if (GA_ID && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: url,
      page_location: window.location.href,
      page_title: title ?? document.title,
    });
  }
  // Browser-only, deliberately.
  //
  // fbevents.js drops the eventID from every PageView after the first one in a
  // page session (verified against the /tr requests it emits — conversion events
  // keep theirs, PageView does not). A CAPI twin would therefore have nothing to
  // deduplicate against and would inflate the count on every soft navigation.
  // PageView adds nothing to attribution anyway — CAPI earns its keep on the
  // conversion events below, which do keep their ids.
  pixelEvent('PageView', {}, newEventId());
}

export function trackViewContent(item: TrackedItem) {
  const value = item.price;
  gaEvent('view_item', { currency: CURRENCY, value, items: gaItems([item]) });

  const eventId = newEventId();
  const custom = {
    currency: CURRENCY,
    value,
    content_type: 'product',
    content_ids: [String(item.id)],
    content_name: item.name,
    contents: metaContents([{ ...item, quantity: 1 }]),
  };
  pixelEvent('ViewContent', custom, eventId);
  serverEvent('ViewContent', { eventId, custom });
}

export function trackAddToCart(item: TrackedItem) {
  const value = Number((item.price * item.quantity).toFixed(2));
  gaEvent('add_to_cart', { currency: CURRENCY, value, items: gaItems([item]) });

  const eventId = newEventId();
  const custom = {
    currency: CURRENCY,
    value,
    content_type: 'product',
    content_ids: [String(item.id)],
    content_name: item.name,
    contents: metaContents([item]),
  };
  pixelEvent('AddToCart', custom, eventId);
  serverEvent('AddToCart', { eventId, custom });
}

export function trackViewCart(items: TrackedItem[], value?: number) {
  const total = value ?? sumValue(items);
  gaEvent('view_cart', { currency: CURRENCY, value: total, items: gaItems(items) });

  // No standard Pixel equivalent — ViewCart is sent as a custom event.
  const eventId = newEventId();
  const custom = {
    currency: CURRENCY,
    value: total,
    content_type: 'product',
    content_ids: items.map((i) => String(i.id)),
    contents: metaContents(items),
  };
  pixelEvent('ViewCart', custom, eventId);
  serverEvent('ViewCart', { eventId, custom });
}

export function trackInitiateCheckout(items: TrackedItem[], value: number, user?: TrackedUser) {
  gaEvent('begin_checkout', { currency: CURRENCY, value, items: gaItems(items) });

  const eventId = newEventId();
  const custom = {
    currency: CURRENCY,
    value,
    content_type: 'product',
    content_ids: items.map((i) => String(i.id)),
    contents: metaContents(items),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
  };
  pixelEvent('InitiateCheckout', custom, eventId);
  serverEvent('InitiateCheckout', { eventId, custom, user });
}

export function trackAddPaymentInfo(items: TrackedItem[], value: number, user?: TrackedUser) {
  gaEvent('add_payment_info', { currency: CURRENCY, value, items: gaItems(items) });

  const eventId = newEventId();
  const custom = {
    currency: CURRENCY,
    value,
    content_type: 'product',
    content_ids: items.map((i) => String(i.id)),
    contents: metaContents(items),
  };
  pixelEvent('AddPaymentInfo', custom, eventId);
  serverEvent('AddPaymentInfo', { eventId, custom, user });
}

export function trackSearch(query: string) {
  gaEvent('search', { search_term: query });

  const eventId = newEventId();
  const custom = { search_string: query };
  pixelEvent('Search', custom, eventId);
  serverEvent('Search', { eventId, custom });
}

/**
 * Purchase — browser half only.
 *
 * The server half is fired inside the order routes (/api/razorpay/verify and
 * /api/orders) using this same `eventId`, so the conversion lands even if the
 * shopper closes the tab or runs a blocker. Generate the id with `newEventId()`
 * BEFORE placing the order and pass it to both halves.
 */
export function trackPurchase(opts: {
  eventId: string;
  orderId: string | number;
  items: TrackedItem[];
  value: number;
  shipping?: number;
  coupon?: string;
}) {
  gaEvent('purchase', {
    transaction_id: String(opts.orderId),
    currency: CURRENCY,
    value: opts.value,
    ...(opts.shipping ? { shipping: opts.shipping } : {}),
    ...(opts.coupon ? { coupon: opts.coupon } : {}),
    items: gaItems(opts.items),
  });

  pixelEvent(
    'Purchase',
    {
      currency: CURRENCY,
      value: opts.value,
      content_type: 'product',
      content_ids: opts.items.map((i) => String(i.id)),
      contents: metaContents(opts.items),
      num_items: opts.items.reduce((n, i) => n + i.quantity, 0),
      order_id: String(opts.orderId),
    },
    opts.eventId,
  );
  // Deliberately no serverEvent() here — the order route sends the server copy.
}
