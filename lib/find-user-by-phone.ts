const WP_URL = process.env.NEXT_PUBLIC_WP_URL!;

export interface WpUserByPhone {
  id: number;
  email: string;
}

/**
 * Looks up the WordPress account registered under a phone number, via the
 * custom REST route in docs/wordpress-find-by-phone-snippet.php. WooCommerce's
 * own customer search doesn't reliably match on billing phone, so this reads
 * wp_usermeta directly instead of guessing at WC's search behavior.
 */
export async function findUserByPhone(phone: string): Promise<WpUserByPhone | null> {
  const res = await fetch(`${WP_URL}/wp-json/hamorge/v1/find-by-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data?.id || !data?.email) return null;
  return { id: data.id, email: data.email };
}
