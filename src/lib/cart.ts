// Cart types and helpers — shared between components

export interface CartItem {
  productId: string;
  name: string;
  size?: string;   // 'klein' | 'middel' | 'groot'
  price: number;    // in euros, e.g. 29.95
  priceLabel: string; // "€ 29,95"
  image: string;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
}

const STORAGE_KEY = 'celines-cart';

export function loadCart(): Cart {
  if (typeof window === 'undefined') return { items: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    return JSON.parse(raw);
  } catch {
    return { items: [] };
  }
}

export function saveCart(cart: Cart, silent = false): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  if (!silent) window.dispatchEvent(new CustomEvent('cart-updated', { detail: cart }));
}

export function addToCart(item: Omit<CartItem, 'quantity'>, quantity = 1): Cart {
  const cart = loadCart();
  const key = `${item.productId}-${item.size || ''}`;
  const existing = cart.items.find(
    (i) => `${i.productId}-${i.size || ''}` === key
  );
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ ...item, quantity });
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId: string, size?: string, silent = false): Cart {
  const cart = loadCart();
  const key = `${productId}-${size || ''}`;
  cart.items = cart.items.filter(
    (i) => `${i.productId}-${i.size || ''}` !== key
  );
  saveCart(cart, silent);
  return cart;
}

export function updateQuantity(productId: string, size: string | undefined, quantity: number, silent = false): Cart {
  const cart = loadCart();
  const key = `${productId}-${size || ''}`;
  const item = cart.items.find(
    (i) => `${i.productId}-${i.size || ''}` === key
  );
  if (item) {
    if (quantity <= 0) {
      return removeFromCart(productId, size, silent);
    }
    item.quantity = quantity;
  }
  saveCart(cart, silent);
  return cart;
}

export function clearCart(): void {
  saveCart({ items: [] });
}

export function cartTotal(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function formatEuro(amount: number): string {
  return `€ ${amount.toFixed(2).replace('.', ',')}`;
}
