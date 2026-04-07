import { useState } from 'react';
import { createPortal } from 'react-dom';

interface Plan {
  type: 'fresh' | 'artificial';
  size: string;
  frequency: string;
  price: string;
  label: string;
}

export default function SubscriptionForm() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [colorPref, setColorPref] = useState('');
  const [note, setNote] = useState('');

  if (typeof window !== 'undefined') {
    (window as any).__openSubscription = (p: Plan) => {
      setPlan(p);
      setError('');
    };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, email, phone, note },
          plan: {
            type: plan.type,
            size: plan.size,
            frequency: plan.frequency,
            price: plan.price,
            colorPreference: colorPref,
          },
          delivery: { address, city, postalCode },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || 'Er ging iets mis');
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      setError('Kan geen verbinding maken. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  const freqLabels: Record<string, string> = {
    weekly: 'Wekelijks', biweekly: 'Tweewekelijks', monthly: 'Maandelijks',
    quarterly: 'Per kwartaal', biannual: 'Per halfjaar', yearly: 'Per jaar',
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]" onClick={() => setPlan(null)} />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl pointer-events-auto overflow-y-auto max-h-[95vh] sub-slide-in">

          <div className="flex items-start justify-between p-5 pb-0">
            <div>
              <span className="font-sans text-[10px] tracking-[0.2em] uppercase text-[#a06d69] font-bold">Abonnement</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl text-[#2B0000] leading-tight mt-1">{plan.label}</h2>
            </div>
            <button onClick={() => setPlan(null)} className="text-[#2B0000]/30 hover:text-[#2B0000] transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#2B0000]/5" aria-label="Sluiten">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="mx-5 mt-4 p-4 bg-[#F2E5D9] rounded-xl flex items-center justify-between">
            <div>
              <span className="font-sans text-sm text-[#2B0000]">{plan.type === 'fresh' ? 'Verse bloemen' : 'Kunstbloemen'} — {plan.size}</span>
              <span className="block font-sans text-xs text-[#2B0000]/50 mt-0.5">{freqLabels[plan.frequency]}</span>
            </div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl text-[#2B0000]">{plan.price}</span>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input label="Naam" value={name} onChange={setName} required placeholder="Sophie Jansen" />
              <Input label="E-mail" value={email} onChange={setEmail} required type="email" placeholder="sophie@email.nl" />
            </div>
            <Input label="Telefoon" value={phone} onChange={setPhone} placeholder="+31 6 ..." />

            <div className="pt-3 border-t border-[#E3D4C6] space-y-3">
              <h3 className="font-sans text-[11px] tracking-widest uppercase text-[#2B0000]/40 font-semibold">Bezorgadres</h3>
              <Input label="Straat + huisnummer" value={address} onChange={setAddress} required placeholder="Langstraat 81" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Postcode" value={postalCode} onChange={setPostalCode} required placeholder="4341 EG" />
                <Input label="Plaats" value={city} onChange={setCity} required placeholder="Arnemuiden" />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3D4C6] space-y-3">
              <Input label="Kleurvoorkeur (optioneel)" value={colorPref} onChange={setColorPref} placeholder="Bijv. warme tinten, pastel, geen voorkeur..." />
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-[#2B0000]/40 font-semibold mb-1.5 font-sans">Opmerking (optioneel)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                  className="w-full px-4 py-2.5 border border-[#E3D4C6] rounded-lg text-[#2B0000] font-sans text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20 resize-none"
                  placeholder="Bijv. allergieën, voorkeur voor bepaalde bloemen..." />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm font-sans">{error}</p>}

            <div className="pt-4 border-t border-[#E3D4C6] flex items-center gap-4">
              <div className="flex-shrink-0">
                <span className="block font-sans text-[10px] text-[#2B0000]/35 uppercase tracking-widest font-semibold">Eerste betaling</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl text-[#2B0000] leading-tight">{plan.price}</span>
              </div>
              <button type="submit" disabled={loading}
                className="flex-1 py-4 bg-[#a06d69] text-white font-sans tracking-widest uppercase text-xs rounded-xl hover:bg-[#885c59] transition-colors disabled:opacity-50 shadow-lg">
                {loading ? 'Even geduld...' : 'Betalen met iDEAL'}
              </button>
            </div>

            <p className="text-center text-[10px] text-[#2B0000]/30 font-sans leading-relaxed">
              Na de eerste betaling wordt automatisch een incassomandaat aangemaakt. Je kunt op elk moment pauzeren of stoppen.
            </p>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes sub-slide-in { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .sub-slide-in { animation: sub-slide-in 0.3s ease-out; }
      `}</style>
    </>,
    document.body
  );
}

function Input({ label, value, onChange, required, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-widest text-[#2B0000]/40 font-semibold mb-1.5 font-sans">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-[#E3D4C6] rounded-lg text-[#2B0000] font-sans text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20" />
    </div>
  );
}