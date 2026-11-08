// Cart types and helpers — shared between components
import { KAARTJE_PRIJS } from './bestelregels';

/** Een boeket dat naar een ander adres gaat dan de rest van de bestelling (Celine, 4 nov 2026). */
export interface Ontvanger {
  naam: string;
  adres: string;      // straat + huisnummer
  postcode: string;
  zoneId: number;     // bezorgplaats uit de bezorgtarieven
  plaats: string;     // naam van die bezorgplaats, ter weergave
  kosten: number;     // bezorgkosten van die plaats, ter weergave (de server rekent zelf)
  datum: string;      // JJJJ-MM-DD
}

export interface CartItem {
  productId: string;
  name: string;
  size?: string;   // 'klein' | 'middel' | 'groot'
  price: number;    // in euros, e.g. 29.95
  priceLabel: string; // "€ 29,95"
  image: string;
  quantity: number;
  ontvanger?: Ontvanger; // alleen bij een boeket dat naar een ander adres gaat
  kaartje?: string;      // tekst op het kaartje bij een boeket
  lineId?: string;       // eigen regel: een boeket met adres of kaartje wordt nooit samengevoegd
}

/** Sleutel van een regel in de winkelwagen. */
export function cartKey(i: CartItem): string {
  return i.lineId ?? `${i.productId}-${i.size || ''}`;
}

/** Bezorgkosten en kaartje van een regel, alleen ter weergave: de server rekent het definitieve bedrag. */
export function regelExtra(i: CartItem): number {
  return (i.ontvanger ? i.ontvanger.kosten : 0) + (i.kaartje ? KAARTJE_PRIJS : 0);
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
  if (item.ontvanger || item.kaartje) {
    cart.items.push({ ...item, quantity, lineId: `${item.productId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` });
    saveCart(cart);
    return cart;
  }
  const key = `${item.productId}-${item.size || ''}`;
  const existing = cart.items.find((i) => cartKey(i) === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ ...item, quantity });
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(key: string, silent = false): Cart {
  const cart = loadCart();
  cart.items = cart.items.filter((i) => cartKey(i) !== key);
  saveCart(cart, silent);
  return cart;
}

export function updateQuantity(key: string, quantity: number, silent = false): Cart {
  const cart = loadCart();
  const item = cart.items.find((i) => cartKey(i) === key);
  if (item) {
    if (quantity <= 0) {
      return removeFromCart(key, silent);
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
  return cart.items.reduce((sum, i) => sum + i.price * i.quantity + regelExtra(i), 0);
}

export function cartCount(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function formatEuro(amount: number): string {
  return `€ ${amount.toFixed(2).replace('.', ',')}`;
}
