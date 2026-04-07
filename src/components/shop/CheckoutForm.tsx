import { useState, useEffect } from 'react';
import { loadCart, cartTotal, formatEuro, clearCart, type CartItem } from '../../lib/cart';

export default function CheckoutForm() {
  const [cart, setCart] = useState<{ items: CartItem[] }>({ items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Delivery
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'local' | 'shipping'>('pickup');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [region, setRegion] = useState('3.00');

  // Customer
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  // Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    setCart(loadCart());
  }, []);

  const subtotal = cartTotal(cart);
  const deliveryCost = deliveryMethod === 'local' ? parseFloat(region) : deliveryMethod === 'shipping' ? 6.95 : 0;
  const total = subtotal + deliveryCost;

  // Min delivery date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email, phone, note },
          items: cart.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            size: i.size,
            quantity: i.quantity,
            price: formatEuro(i.price),
          })),
          delivery: {
            method: deliveryMethod,
            date: deliveryMethod === 'local' ? deliveryDate : null,
            address: deliveryMethod !== 'pickup' ? address : null,
            city: deliveryMethod !== 'pickup' ? city : null,
            postalCode: deliveryMethod !== 'pickup' ? postalCode : null,
            region: deliveryMethod === 'local' ? region : null,
            cost: formatEuro(deliveryCost),
          },
          subtotal: formatEuro(subtotal),
          total: formatEuro(total),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Er ging iets mis');
        return;
      }

      // Redirect to Mollie payment
      clearCart();
      window.location.href = data.paymentUrl;
    } catch {
      setError('Kan geen verbinding maken. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h2 className="font-serif text-3xl text-[#2B0000] mb-4">Je winkelwagen is leeg</h2>
        <p className="text-[#2B0000]/50 font-sans mb-8">Voeg eerst producten toe voordat je afrekent.</p>
        <a href="/bestellen" className="inline-block px-8 py-3 bg-[#a06d69] text-white font-sans text-sm tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors">
          Bekijk boeketten
        </a>
      </div>
    );
  }

  const needsAddress = deliveryMethod !== 'pickup';
  const needsDate = deliveryMethod === 'local';

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* Left: Form */}
        <div className="lg:col-span-3 space-y-8">

          {/* Contact */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-xl text-[#2B0000]">Jouw gegevens</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Naam" value={name} onChange={setName} required placeholder="Sophie Jansen" />
              <Input label="E-mail" value={email} onChange={setEmail} required type="email" placeholder="sophie@email.nl" />
            </div>
            <Input label="Telefoon (optioneel)" value={phone} onChange={setPhone} placeholder="+31 6 ..." />
          </div>

          {/* Delivery method */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-xl text-[#2B0000]">Bezorging</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'pickup' as const, label: 'Ophalen', sub: 'Arnemuiden' },
                { val: 'local' as const, label: 'Bezorgen', sub: 'Walcheren' },
                { val: 'shipping' as const, label: 'Verzenden', sub: '€ 6,95' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setDeliveryMethod(opt.val)}
                  className={`rounded-xl py-3 px-2 text-center border transition-all cursor-pointer ${
                    deliveryMethod === opt.val
                      ? 'bg-[#2B0000] text-white border-[#2B0000]'
                      : 'bg-white border-[#E3D4C6] text-[#2B0000] hover:border-[#a06d69]'
                  }`}
                >
                  <span className="block font-sans text-sm font-medium">{opt.label}</span>
                  <span className={`block font-sans text-[10px] mt-0.5 ${deliveryMethod === opt.val ? 'text-white/60' : 'text-[#2B0000]/40'}`}>{opt.sub}</span>
                </button>
              ))}
            </div>

            {deliveryMethod === 'local' && (
              <div className="space-y-3 pt-3 border-t border-[#E3D4C6]">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-[#2B0000]/40 font-semibold mb-1.5">Regio</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg font-sans text-sm text-[#2B0000] focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20 appearance-none"
                  >
                    <option value="3.00">Arnemuiden (+ € 3,00)</option>
                    <option value="5.00">Middelburg (+ € 5,00)</option>
                    <option value="8.00">Walcheren / Z-Beveland (+ € 8,00)</option>
                  </select>
                </div>
                <Input label="Bezorgdatum" value={deliveryDate} onChange={setDeliveryDate} type="date" required min={minDate} />
              </div>
            )}

            {needsAddress && (
              <div className="space-y-3 pt-3 border-t border-[#E3D4C6]">
                <Input label="Straat + huisnummer" value={address} onChange={setAddress} required placeholder="Langstraat 81" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Postcode" value={postalCode} onChange={setPostalCode} required placeholder="4341 EG" />
                  <Input label="Plaats" value={city} onChange={setCity} required placeholder="Arnemuiden" />
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-xl text-[#2B0000] mb-3">Opmerking (optioneel)</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg font-sans text-sm text-[#2B0000] focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20 resize-none"
              placeholder="Bijv. kaartje toevoegen, specifieke levertijd..."
            />
          </div>
        </div>

        {/* Right: Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-28 space-y-5">
            <h3 className="font-serif text-xl text-[#2B0000]">Overzicht</h3>

            <div className="space-y-3">
              {cart.items.map((item) => (
                <div key={`${item.productId}-${item.size}`} className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-sans text-sm text-[#2B0000] truncate">{item.name}{item.size ? ` (${item.size})` : ''}</p>
                    <p className="font-sans text-xs text-[#2B0000]/40">× {item.quantity}</p>
                  </div>
                  <span className="font-sans text-sm font-medium text-[#2B0000] flex-shrink-0">{formatEuro(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#E3D4C6] pt-4 space-y-2">
              <div className="flex justify-between font-sans text-sm text-[#2B0000]/60">
                <span>Subtotaal</span>
                <span>{formatEuro(subtotal)}</span>
              </div>
              {deliveryCost > 0 && (
                <div className="flex justify-between font-sans text-sm text-[#2B0000]/60">
                  <span>Bezorgkosten</span>
                  <span>{formatEuro(deliveryCost)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#E3D4C6]">
                <span className="font-sans text-sm font-semibold text-[#2B0000]">Totaal</span>
                <span className="font-serif text-2xl text-[#2B0000]">{formatEuro(total)}</span>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm font-sans">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#a06d69] text-white font-sans text-sm tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors disabled:opacity-50"
            >
              {loading ? 'Even geduld...' : 'Betalen met iDEAL'}
            </button>

            <p className="text-center text-[10px] text-[#2B0000]/30 font-sans">
              Je wordt doorgestuurd naar Mollie voor veilige betaling
            </p>
          </div>
        </div>
      </div>
    </form>
  );
}

function Input({
  label, value, onChange, required, type = 'text', placeholder, min,
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string; min?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-widest text-[#2B0000]/40 font-semibold mb-1.5 font-sans">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] font-sans text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20"
      />
    </div>
  );
}
