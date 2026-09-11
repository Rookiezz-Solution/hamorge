import type { Metadata } from 'next';
import { getProducts, getProductVariations, buildSizeAvailability } from '@/lib/wp';
import ShopContent from './ShopContent';

export const metadata: Metadata = {
  title: 'Shop | HAM ORGE',
  description: 'Shop the full HAM ORGE collection. Premium tees crafted with thoughtful design and honest craftsmanship.',
};

export default async function ShopPage() {
  const products = await getProducts({ per_page: '20', status: 'publish' }).catch(() => []);

  // For variable products, fetch per-size stock so out-of-stock sizes can be disabled in the size picker.
  const withAvailability = await Promise.all(products.map(async (p: { id: number; type: string }) => {
    if (p.type !== 'variable') return p;
    const variations = await getProductVariations(p.id).catch(() => []);
    return { ...p, sizeAvailability: buildSizeAvailability(variations) };
  }));

  return <ShopContent initialProducts={withAvailability} />;
}
