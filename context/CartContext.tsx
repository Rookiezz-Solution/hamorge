'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  key: string;
  id: number;
  name: string;
  slug: string;
  quantity: number;
  price: number;
  image: string;
  secondaryImage: string;
  size: string;
}

export interface AddItemPayload {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  secondaryImage: string;
}

export interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  total: number;
  coupon: AppliedCoupon | null;
  discount: number;
  payableTotal: number;
  lastAdded: AddItemPayload | null;
  clearLastAdded: () => void;
  addItem: (product: AddItemPayload, quantity: number, size: string) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<string | null>;
  removeCoupon: () => void;
  applyFirstOrderDiscount: (customerId?: number, email?: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  itemCount: 0,
  total: 0,
  coupon: null,
  discount: 0,
  payableTotal: 0,
  lastAdded: null,
  clearLastAdded: () => {},
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  applyCoupon: async () => null,
  removeCoupon: () => {},
  applyFirstOrderDiscount: async () => {},
});

const STORAGE_KEY = 'hamorge-cart';
const COUPON_STORAGE_KEY = 'hamorge-coupon';

function load(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadCoupon(): AppliedCoupon | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COUPON_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCoupon(coupon: AppliedCoupon | null) {
  if (coupon) localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon));
  else localStorage.removeItem(COUPON_STORAGE_KEY);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastAdded, setLastAdded] = useState<AddItemPayload | null>(null);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  useEffect(() => {
    setItems(load());
    setCoupon(loadCoupon());
  }, []);

  function update(next: CartItem[]) {
    setItems(next);
    save(next);
  }

  // Cart contents changed — the discount amount was computed against the old
  // contents, so drop it rather than risk showing a stale/incorrect discount.
  // The user can re-apply the code, which re-validates against the new cart.
  function clearCouponSilently() {
    setCoupon(null);
    saveCoupon(null);
  }

  function addItem(product: AddItemPayload, quantity: number, size: string) {
    const key = `${product.id}-${size}`;
    setItems(prev => {
      const existing = prev.find(i => i.key === key);
      const next = existing
        ? prev.map(i => i.key === key ? { ...i, quantity: i.quantity + quantity } : i)
        : [...prev, { key, id: product.id, name: product.name, slug: product.slug, quantity, price: product.price, image: product.image, secondaryImage: product.secondaryImage, size }];
      save(next);
      return next;
    });
    setLastAdded(product);
    clearCouponSilently();
  }

  function clearLastAdded() { setLastAdded(null); }

  function removeItem(key: string) {
    setItems(prev => { const next = prev.filter(i => i.key !== key); save(next); return next; });
    clearCouponSilently();
  }

  function updateQuantity(key: string, quantity: number) {
    if (quantity <= 0) { removeItem(key); return; }
    setItems(prev => { const next = prev.map(i => i.key === key ? { ...i, quantity } : i); save(next); return next; });
    clearCouponSilently();
  }

  function clearCart() { update([]); clearCouponSilently(); }

  async function applyCoupon(code: string): Promise<string | null> {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        items: items.map(i => ({ product_id: i.id, quantity: i.quantity, size: i.size })),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.valid) return data.error ?? 'This coupon code is not valid.';
    const applied: AppliedCoupon = { code: data.code, discountAmount: data.discountAmount };
    setCoupon(applied);
    saveCoupon(applied);
    return null;
  }

  function removeCoupon() { clearCouponSilently(); }

  // Silent, best-effort — no error surfaced if the customer isn't eligible or the
  // coupon isn't set up; this only ever runs automatically, never from a user click.
  async function applyFirstOrderDiscount(customerId?: number, email?: string) {
    if (coupon || items.length === 0 || (!customerId && !email)) return;
    try {
      const res = await fetch('/api/coupons/first-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          email,
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity, size: i.size })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.eligible) return;
      const applied: AppliedCoupon = { code: data.code, discountAmount: data.discountAmount };
      setCoupon(applied);
      saveCoupon(applied);
    } catch { /* non-blocking */ }
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discount = coupon?.discountAmount ?? 0;
  const payableTotal = Math.max(0, total - discount);

  return (
    <CartContext.Provider value={{ items, itemCount, total, coupon, discount, payableTotal, lastAdded, clearLastAdded, addItem, removeItem, updateQuantity, clearCart, applyCoupon, removeCoupon, applyFirstOrderDiscount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
