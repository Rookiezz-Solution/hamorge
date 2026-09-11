import { getProducts } from '@/lib/wp';
import CartContent from './CartContent';

export default async function CartPage() {
  const suggested = await getProducts({ per_page: '6', status: 'publish' }).catch(() => []);
  return <CartContent suggested={suggested} />;
}
