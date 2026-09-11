import type { Metadata } from 'next';
import { getProducts, getProductVariations, buildSizeAvailability } from '@/lib/wp';
import ShopContent from './ShopContent';

export const metadata: Metadata = {
  title: 'Shop | HAM ORGE',
  description: 'Shop the full HAM ORGE collection. Premium tees crafted with thoughtful design and honest craftsmanship.',
};

// Cap how many variation requests are in flight at once. Firing one per variable
// product via Promise.all overwhelms budget/shared WordPress hosting (limited
// PHP-FPM workers) — the requests queue up server-side until Vercel's build-time
// page-generation timeout kills the page. Small batches keep the host responsive.
const VARIATION_FETCH_CONCURRENCY = 4;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches getProducts()'s
// untyped `res.json()` return; ShopContent's WCProduct isn't exported to type against.
async function withSizeAvailability(products: any[]) {
  const results: any[] = [];
  for (let i = 0; i < products.length; i += VARIATION_FETCH_CONCURRENCY) {
    const batch = products.slice(i, i + VARIATION_FETCH_CONCURRENCY);
    const withAvailability = await Promise.all(batch.map(async (p) => {
      if (p.type !== 'variable') return p;
      const variations = await getProductVariations(p.id).catch(() => []);
      return { ...p, sizeAvailability: buildSizeAvailability(variations) };
    }));
    results.push(...withAvailability);
  }
  return results;
}

export default async function ShopPage() {
  const products = await getProducts({ per_page: '20', status: 'publish' }).catch(() => []);

  // For variable products, fetch per-size stock so out-of-stock sizes can be disabled in the size picker.
  const withAvailability = await withSizeAvailability(products);

  return <ShopContent initialProducts={withAvailability} />;
}
