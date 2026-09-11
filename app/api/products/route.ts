import { NextRequest, NextResponse } from 'next/server';

const WC_API = process.env.NEXT_PUBLIC_WC_API_URL!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function authHeader() {
  const token = Buffer.from(`${CK}:${CS}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') ?? '';
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const perPage = req.nextUrl.searchParams.get('per_page') ?? '12';

  const params = new URLSearchParams({ per_page: perPage, status: 'publish' });
  if (slug) params.set('slug', slug);

  // No search query — just fetch products normally
  if (!search) {
    const res = await fetch(`${WC_API}/products?${params}`, {
      headers: authHeader(),
      next: { revalidate: 120 },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  // Search by product name AND by tag in parallel
  const nameParams = new URLSearchParams({ per_page: perPage, status: 'publish', search });
  const tagLookupParams = new URLSearchParams({ per_page: '5', search });

  const [nameRes, tagRes] = await Promise.all([
    fetch(`${WC_API}/products?${nameParams}`, { headers: authHeader(), next: { revalidate: 120 } }),
    fetch(`${WC_API}/products/tags?${tagLookupParams}`, { headers: authHeader(), next: { revalidate: 300 } }),
  ]);

  const [nameProducts, tags] = await Promise.all([nameRes.json(), tagRes.json()]);
  let allProducts: Record<string, unknown>[] = Array.isArray(nameProducts) ? nameProducts : [];

  // Fetch products for each matching tag (up to 3 tags)
  if (Array.isArray(tags) && tags.length > 0) {
    try {
      const tagFetches = tags.slice(0, 3).map((tag: { id: number }) =>
        fetch(
          `${WC_API}/products?${new URLSearchParams({ per_page: perPage, status: 'publish', tag: String(tag.id) })}`,
          { headers: authHeader(), next: { revalidate: 120 } }
        ).then(r => r.json())
      );
      const tagResults = await Promise.all(tagFetches);
      for (const products of tagResults) {
        if (Array.isArray(products)) allProducts = allProducts.concat(products);
      }
    } catch {
      // tag fetch failed — name results still returned
    }
  }

  // Deduplicate by product ID and cap at per_page
  const seen = new Set<number>();
  const unique = allProducts.filter((p) => {
    const id = (p as { id: number }).id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return NextResponse.json(unique.slice(0, parseInt(perPage)));
}
