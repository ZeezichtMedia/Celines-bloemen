import { useState, useEffect, useCallback } from 'react';
import type { Bouquet } from '../../lib/types';

// ============================================================
// Admin Panel — Celine's Bloemen
// ============================================================

type Tab = 'bouquets' | 'orders' | 'subscriptions';

export default function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('bouquets');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/admin/bouquets')
      .then((r) => { if (r.ok) { setAuthed(true); } throw new Error(); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { setError('Onjuist wachtwoord'); return; }
    setAuthed(true);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setPassword('');
  };

  if (checking) {
    return <div className="min-h-screen bg-[#F2E5D9] flex items-center justify-center"><p className="text-[#2B0000]/50 font-sans">Laden...</p></div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#F2E5D9] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/images/logo/logo-transparent.png" alt="Logo" className="w-24 mx-auto mb-4" />
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-3xl text-[#2B0000]">Beheer</h1>
            <p className="text-[#2B0000]/50 text-sm mt-1 font-sans">Log in om je winkel te beheren</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 shadow-xl space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#2B0000]/40 font-semibold mb-2 font-sans">Wachtwoord</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] font-sans focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20"
                placeholder="Voer je wachtwoord in" autoFocus />
              {error && <p className="text-red-500 text-sm mt-2 font-sans">{error}</p>}
            </div>
            <button type="submit" className="w-full py-3.5 bg-[#a06d69] text-white font-sans text-sm tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors">Inloggen</button>
          </form>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'bouquets', label: 'Boeketten', icon: '🌸' },
    { id: 'orders', label: 'Bestellingen', icon: '📦' },
    { id: 'subscriptions', label: 'Abonnementen', icon: '🔄' },
  ];

  return (
    <div className="min-h-screen bg-[#F2E5D9]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[#E3D4C6] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo/logo-transparent.png" alt="Logo" className="w-10 h-auto" />
            <span style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-xl text-[#2B0000]">Beheer</span>
          </div>
          <button onClick={handleLogout} className="text-[#2B0000]/40 hover:text-[#2B0000] font-sans text-sm transition-colors">Uitloggen</button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-[#E3D4C6]">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 font-sans text-sm transition-colors border-b-2 ${
                tab === t.id ? 'border-[#a06d69] text-[#2B0000] font-medium' : 'border-transparent text-[#2B0000]/40 hover:text-[#2B0000]/70'
              }`}
            >{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {tab === 'bouquets' && <BouquetsTab showToast={showToast} />}
        {tab === 'orders' && <OrdersTab showToast={showToast} />}
        {tab === 'subscriptions' && <SubscriptionsTab showToast={showToast} />}
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
}

// ============================================================
// Bouquets Tab
// ============================================================
function BouquetsTab({ showToast }: { showToast: (m: string) => void }) {
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [editing, setEditing] = useState<Bouquet | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/bouquets').then((r) => r.json()).then(setBouquets).catch(() => {});
  }, []);

  const saveBouquet = async (bouquet: Bouquet) => {
    setSaving(true);
    const updated = bouquets.some((b) => b.id === bouquet.id)
      ? bouquets.map((b) => (b.id === bouquet.id ? bouquet : b))
      : [...bouquets, bouquet];
    const res = await fetch('/api/admin/bouquets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) { setBouquets(updated); setEditing(null); showToast('Opgeslagen!'); }
    setSaving(false);
  };

  const deleteBouquet = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit boeket wilt verwijderen?')) return;
    const res = await fetch('/api/admin/bouquets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) { setBouquets(bouquets.filter((b) => b.id !== id)); showToast('Verwijderd'); }
  };

  const toggleAvailable = async (b: Bouquet) => saveBouquet({ ...b, available: !b.available });

  if (editing) {
    return (
      <>
        <button onClick={() => setEditing(null)} className="text-[#a06d69] font-sans text-sm mb-6 hover:underline flex items-center gap-1">
          ← Terug
        </button>
        <EditForm bouquet={editing} onSave={saveBouquet} saving={saving} isNew={!editing.id} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-3xl text-[#2B0000]">Boeketten</h2>
          <p className="text-[#2B0000]/50 text-sm font-sans mt-1">{bouquets.length} items</p>
        </div>
        <button onClick={() => setEditing({ id: '', name: '', color: '', description: '', image: '/images/bestellen/vrolijk-veld.png', priceSmall: '€ 0,00', priceMid: '€ 0,00', priceLarge: '€ 0,00', available: true, sortOrder: bouquets.length })}
          className="px-5 py-2.5 bg-[#a06d69] text-white font-sans text-xs tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors">
          + Nieuw boeket
        </button>
      </div>
      <div className="space-y-3">
        {bouquets.map((b) => (
          <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <img src={b.image} alt={b.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-lg text-[#2B0000] truncate">{b.name}</h3>
              <p className="text-[#2B0000]/40 text-xs font-sans">{b.color} · {b.priceMid}</p>
            </div>
            <button onClick={() => toggleAvailable(b)}
              className={`px-3 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors flex-shrink-0 ${b.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {b.available ? 'Zichtbaar' : 'Verborgen'}
            </button>
            <button onClick={() => setEditing(b)} className="p-2 text-[#2B0000]/30 hover:text-[#a06d69] transition-colors" title="Bewerken">✏️</button>
            <button onClick={() => deleteBouquet(b.id)} className="p-2 text-[#2B0000]/30 hover:text-red-500 transition-colors" title="Verwijderen">🗑</button>
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================
// Orders Tab
// ============================================================
function OrdersTab({ showToast }: { showToast: (m: string) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/orders').then((r) => r.json()).then(setOrders).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: number, status: string) => {
    await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    setOrders(orders.map((o) => o.id === id ? { ...o, status } : o));
    showToast('Status bijgewerkt');
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700',
    paid: 'bg-blue-50 text-blue-700',
    preparing: 'bg-purple-50 text-purple-700',
    shipped: 'bg-indigo-50 text-indigo-700',
    delivered: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-600',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Wacht op betaling',
    paid: 'Betaald',
    preparing: 'In voorbereiding',
    shipped: 'Verzonden',
    delivered: 'Bezorgd',
    cancelled: 'Geannuleerd',
  };

  if (loading) return <p className="text-[#2B0000]/50 font-sans">Laden...</p>;

  return (
    <>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-3xl text-[#2B0000] mb-6">Bestellingen</h2>
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <p className="text-[#2B0000]/40 font-sans">Nog geen bestellingen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-sans text-sm font-semibold text-[#2B0000]">#{o.orderNumber}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[o.status] || o.status}
                    </span>
                  </div>
                  <p className="font-sans text-sm text-[#2B0000]/60 mt-1">{o.customerName} · {o.customerEmail}</p>
                </div>
                <span style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl text-[#2B0000] flex-shrink-0">€ {Number(o.total).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sans text-xs text-[#2B0000]/40">Status wijzigen:</span>
                {['paid', 'preparing', 'shipped', 'delivered'].map((s) => (
                  <button key={s} onClick={() => updateStatus(o.id, s)}
                    className={`px-3 py-1 rounded-full text-xs font-sans transition-colors ${o.status === s ? 'bg-[#2B0000] text-white' : 'bg-[#F2E5D9] text-[#2B0000]/60 hover:bg-[#E3D4C6]'}`}>
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================
// Subscriptions Tab
// ============================================================
function SubscriptionsTab({ showToast }: { showToast: (m: string) => void }) {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/subscriptions').then((r) => r.json()).then(setSubs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleAction = async (id: number, action: string) => {
    if (action === 'cancel' && !confirm('Weet je zeker dat je dit abonnement wilt stoppen?')) return;
    await fetch('/api/admin/subscriptions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    setSubs(subs.map((s) => s.id === id ? { ...s, status: action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'cancelled' } : s));
    showToast(action === 'cancel' ? 'Abonnement gestopt' : 'Status bijgewerkt');
  };

  const freqLabels: Record<string, string> = {
    weekly: 'Wekelijks', biweekly: 'Tweewekelijks', monthly: 'Maandelijks',
    quarterly: 'Per kwartaal', biannual: 'Per halfjaar', yearly: 'Per jaar',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    paused: 'bg-yellow-50 text-yellow-700',
    pending: 'bg-blue-50 text-blue-700',
    cancelled: 'bg-red-50 text-red-600',
  };

  if (loading) return <p className="text-[#2B0000]/50 font-sans">Laden...</p>;

  return (
    <>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-3xl text-[#2B0000] mb-6">Abonnementen</h2>
      {subs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <p className="text-[#2B0000]/40 font-sans">Nog geen abonnementen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <div key={s.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-sans text-sm font-semibold text-[#2B0000]">{s.customerName}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[s.status] || 'bg-gray-100'}`}>
                      {s.status === 'active' ? 'Actief' : s.status === 'paused' ? 'Gepauzeerd' : s.status === 'pending' ? 'In afwachting' : 'Gestopt'}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[#2B0000]/40 mt-1">{s.customerEmail}</p>
                </div>
                <span style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-xl text-[#2B0000] flex-shrink-0">€ {Number(s.pricePerDelivery).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-sans text-[#2B0000]/50">
                <span>{s.planType === 'fresh' ? 'Vers' : 'Kunst'} · {s.planSize}</span>
                <span>{freqLabels[s.frequency] || s.frequency}</span>
                {s.nextDeliveryDate && <span>Volgende: {s.nextDeliveryDate}</span>}
              </div>
              {s.status !== 'cancelled' && (
                <div className="flex gap-2 mt-3">
                  {s.status === 'active' && (
                    <button onClick={() => handleAction(s.id, 'pause')} className="px-3 py-1 rounded-full text-xs font-sans bg-[#F2E5D9] text-[#2B0000]/60 hover:bg-[#E3D4C6] transition-colors">Pauzeren</button>
                  )}
                  {s.status === 'paused' && (
                    <button onClick={() => handleAction(s.id, 'resume')} className="px-3 py-1 rounded-full text-xs font-sans bg-green-50 text-green-700 hover:bg-green-100 transition-colors">Hervatten</button>
                  )}
                  <button onClick={() => handleAction(s.id, 'cancel')} className="px-3 py-1 rounded-full text-xs font-sans bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Stoppen</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================
// Shared components
// ============================================================

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2B0000] text-white px-6 py-3 rounded-xl shadow-xl font-sans text-sm z-50">
      {message}
    </div>
  );
}

function EditForm({ bouquet, onSave, saving, isNew }: { bouquet: Bouquet; onSave: (b: Bouquet) => void; saving: boolean; isNew: boolean }) {
  const [form, setForm] = useState<Bouquet>(bouquet);
  const [uploading, setUploading] = useState(false);
  const set = (key: keyof Bouquet, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    if (res.ok) { const { url } = await res.json(); set('image', url); }
    setUploading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) form.id = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif" }} className="text-2xl text-[#2B0000]">{isNew ? 'Nieuw boeket' : `${form.name} bewerken`}</h2>
      <div className="flex items-start gap-6">
        <div className="w-28 h-28 rounded-xl overflow-hidden bg-[#F2E5D9] flex-shrink-0">
          <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
        </div>
        <div>
          <Label>Foto</Label>
          <label className="block cursor-pointer mt-1">
            <span className="inline-block px-4 py-2 bg-[#F2E5D9] text-[#2B0000] font-sans text-xs tracking-wider uppercase rounded-lg hover:bg-[#E3D4C6] transition-colors">
              {uploading ? 'Uploaden...' : 'Foto kiezen'}
            </span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Naam" value={form.name} onChange={(v) => set('name', v)} required />
        <Field label="Kleurenpalet" value={form.color} onChange={(v) => set('color', v)} placeholder="Geel / Blauw / Oranje" required />
      </div>
      <div>
        <Label>Beschrijving</Label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} required
          className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] font-sans text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20 resize-none" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Prijs Klein" value={form.priceSmall} onChange={(v) => set('priceSmall', v)} placeholder="€ 22,50" required />
        <Field label="Prijs Middel" value={form.priceMid} onChange={(v) => set('priceMid', v)} placeholder="€ 29,95" required />
        <Field label="Prijs Groot" value={form.priceLarge} onChange={(v) => set('priceLarge', v)} placeholder="€ 39,95" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Volgorde</Label>
          <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] font-sans text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-12 h-7 rounded-full relative transition-colors ${form.available ? 'bg-[#a06d69]' : 'bg-[#E3D4C6]'}`} onClick={() => set('available', !form.available)}>
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${form.available ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="font-sans text-sm text-[#2B0000]">{form.available ? 'Zichtbaar' : 'Verborgen'}</span>
          </label>
        </div>
      </div>
      <div className="pt-4 border-t border-[#E3D4C6] flex justify-end">
        <button type="submit" disabled={saving}
          className="px-8 py-3 bg-[#a06d69] text-white font-sans text-sm tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors disabled:opacity-50">
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] uppercase tracking-widest text-[#2B0000]/40 font-semibold mb-1.5 font-sans">{children}</label>;
}

function Field({ label, value, onChange, placeholder, required, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] font-sans text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20" />
    </div>
  );
}
