import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { loadCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, formatEuro, type Cart } from '../../lib/cart';

export default function CartWidget() {
  const [cart, setCart] = useState<Cart>({ items: [] });
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCart(loadCart());

    const handler = (e: Event) => {
      const c = (e as CustomEvent).detail as Cart;
      setCart(c);
      if (cartCount(c) > 0) {
        setOpen(true);
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2000);
      }
      toggleWhatsApp(cartCount(c));
    };

    window.addEventListener('cart-updated', handler);
    toggleWhatsApp(cartCount(loadCart()));

    return () => window.removeEventListener('cart-updated', handler);
  }, []);

  const count = cartCount(cart);
  const total = cartTotal(cart);

  return (
    <>
      {/* Cart icon — renders inline in header */}
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-11 h-11 rounded-full hover:bg-current/10 transition-colors"
        aria-label={`Winkelwagen${count > 0 ? `: ${count} items` : ''}`}
      >
        {/* Phosphor: shopping-bag-open (light) */}
        <svg width="22" height="22" viewBox="0 0 256 256" aria-hidden="true">
          <path fill="currentColor" d="M216 42H40a14 14 0 0 0-14 14v144a14 14 0 0 0 14 14h176a14 14 0 0 0 14-14V56a14 14 0 0 0-14-14M40 54h176a2 2 0 0 1 2 2v18H38V56a2 2 0 0 1 2-2m176 148H40a2 2 0 0 1-2-2V86h180v114a2 2 0 0 1-2 2m-42-90a46 46 0 0 1-92 0a6 6 0 0 1 12 0a34 34 0 0 0 68 0a6 6 0 0 1 12 0" />
        </svg>
        {count > 0 && (
          <span className={`absolute top-0.5 right-0 w-[18px] h-[18px] bg-[#b2765b] text-white rounded-full text-[10px] font-medium flex items-center justify-center transition-transform ${justAdded ? 'scale-125' : 'scale-100'}`}>
            {count}
          </span>
        )}
      </button>

      {/* Sidebar — rendered via portal to document.body so it doesn't break header layout */}
      {mounted && open && createPortal(
        <CartSidebar cart={cart} setCart={setCart} total={total} onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  );
}

function CartSidebar({ cart, setCart, total, onClose }: {
  cart: Cart;
  setCart: (c: Cart) => void;
  total: number;
  onClose: () => void;
}) {
  const count = cartCount(cart);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-[201] shadow-2xl flex flex-col cart-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e4d6c8]">
          <div className="flex items-center gap-3">
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl text-[#2b1712]">Winkelwagen</h2>
            {count > 0 && <span className="text-[#2b1712]/40 font-sans text-sm">{count} item{count !== 1 ? 's' : ''}</span>}
          </div>
          <button onClick={onClose} className="text-[#2b1712]/30 hover:text-[#2b1712] transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#2b1712]/5" aria-label="Sluiten">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.items.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 mx-auto bg-[#f0e5da] rounded-full flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b2765b" strokeWidth="1.5"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
              </div>
              <p className="text-[#2b1712]/40 font-sans text-sm">Je winkelwagen is leeg</p>
              <a href="/bestellen" onClick={onClose} className="inline-block text-[#b2765b] font-sans text-sm hover:underline">
                Bekijk de boeketten →
              </a>
            </div>
          ) : cart.items.map((item) => {
            const key = `${item.productId}-${item.size || ''}`;
            return (
              <div key={key} className="flex gap-4 items-center py-2">
                <a href={item.size ? '/bestellen' : '/webshop'} onClick={onClose} className="flex-shrink-0">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-xl object-cover hover:opacity-80 transition-opacity" />
                </a>
                <div className="flex-1 min-w-0">
                  <a href={item.size ? '/bestellen' : '/webshop'} onClick={onClose} className="block">
                    <h3 className="font-sans text-sm font-medium text-[#2b1712] truncate hover:text-[#b2765b] transition-colors">{item.name}</h3>
                  </a>
                  {item.size && <p className="text-[#2b1712]/40 text-xs font-sans capitalize">{item.size}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center border border-[#e4d6c8] rounded-lg overflow-hidden">
                      <button
                        onClick={() => setCart(updateQuantity(item.productId, item.size, item.quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center text-[#2b1712]/50 hover:bg-[#f0e5da] transition-colors text-sm"
                        aria-label="Eén minder"
                      >−</button>
                      <span className="font-sans text-sm w-8 text-center text-[#2b1712]">{item.quantity}</span>
                      <button
                        onClick={() => setCart(updateQuantity(item.productId, item.size, item.quantity + 1))}
                        className="w-8 h-8 flex items-center justify-center text-[#2b1712]/50 hover:bg-[#f0e5da] transition-colors text-sm"
                        aria-label="Eén meer"
                      >+</button>
                    </div>
                    <button
                      onClick={() => { const c = removeFromCart(item.productId, item.size); setCart(c); toggleWhatsApp(cartCount(c)); }}
                      className="text-[#2b1712]/20 hover:text-red-500 transition-colors"
                      aria-label={`${item.name} verwijderen`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    </button>
                  </div>
                </div>
                <span className="font-sans text-sm font-semibold text-[#2b1712] flex-shrink-0">
                  {formatEuro(item.price * item.quantity)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {cart.items.length > 0 && (
          <div className="border-t border-[#e4d6c8] p-5 space-y-4 bg-[#f0e5da]/30">
            <div className="flex justify-between items-center">
              <span className="font-sans text-sm text-[#2b1712]/50">Subtotaal</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-3xl text-[#2b1712]">{formatEuro(total)}</span>
            </div>
            <a
              href="/afrekenen"
              className="block w-full py-4 bg-[#2b1712] text-[#f8f2eb] font-sans text-[0.95rem] font-medium text-center rounded-full hover:bg-[#b2765b] transition-colors"
            >
              Afrekenen
            </a>
            <button
              onClick={() => { clearCart(); setCart({ items: [] }); toggleWhatsApp(0); }}
              className="w-full text-center text-xs text-[#2b1712]/30 hover:text-[#2b1712]/60 font-sans transition-colors"
            >
              Winkelwagen legen
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes cart-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .cart-slide-in { animation: cart-slide-in 0.3s ease-out; }
      `}</style>
    </>
  );
}

function toggleWhatsApp(count: number) {
  const waPopup = document.getElementById('wa-popup');
  if (!waPopup) return;
  waPopup.style.display = count > 0 ? 'none' : '';
}
