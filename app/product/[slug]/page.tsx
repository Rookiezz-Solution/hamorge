import type { Metadata } from 'next';
import { getProducts, getProductReviews, getProductVariations, buildSizeAvailability } from '@/lib/wp';
import ProductContent from './ProductContent';

/* ─── Pre-render all product pages at build time (ISR) ── */
export async function generateStaticParams() {
  try {
    const products = await getProducts({ per_page: '50', status: 'publish' });
    return (products as { slug: string }[]).map(p => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

/* ─── Per-product SEO metadata ───────────────────────── */
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  try {
    const products = await getProducts({ slug, per_page: '1' });
    const product = (products as Record<string, unknown>[])[0];
    if (product) {
      const name = product.name as string;
      const imageUrl = (product.images as { src: string }[])?.[0]?.src;
      return {
        title: name,
        description: `Buy ${name} – HAM ORGE. Crafted with thoughtful design and honest craftsmanship. ₹899`,
        openGraph: imageUrl ? { images: [{ url: imageUrl }] } : undefined,
      };
    }
  } catch { /* noop */ }
  return { title: 'Product | HAM ORGE' };
}

/* ─── Page ───────────────────────────────────────────── */
export default async function ProductPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Fetch product data and suggestions in parallel on the server —
  // the rendered HTML already contains all content when it reaches the browser.
  const [products, allProducts] = await Promise.all([
    getProducts({ slug, per_page: '1' }).catch(() => [] as Record<string, unknown>[]),
    getProducts({ per_page: '8', status: 'publish' }).catch(() => [] as Record<string, unknown>[]),
  ]);

  const wcProduct = (products as Record<string, unknown>[])[0] ?? null;
  const suggested = (allProducts as Record<string, unknown>[])
    .filter(p => p.slug !== slug)
    .slice(0, 6);

  // Fetch the product's real, approved reviews from WooCommerce.
  const productId = wcProduct?.id as number | undefined;
  const wcReviews = productId
    ? await getProductReviews(productId).catch(() => [] as Record<string, unknown>[])
    : [];

  // For variable products, fetch per-size stock so out-of-stock sizes can be disabled.
  const sizeAvailability = productId && wcProduct?.type === 'variable'
    ? buildSizeAvailability(await getProductVariations(productId).catch(() => []))
    : null;

  return <ProductContent slug={slug} wcProduct={wcProduct} suggested={suggested} wcReviews={wcReviews} sizeAvailability={sizeAvailability} />;
}
