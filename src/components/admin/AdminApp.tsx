import { useState, useEffect } from 'react';
import type { Bouquet, Product } from '../../lib/types';

// ============================================================
// SVG Icons
// ============================================================
const Icon = {
  flower: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2a4 4 0 0 1 0 8 4 4 0 0 1 0-8z"/><path d="M19.07 4.93a4 4 0 0 1-5.66 5.66 4 4 0 0 1 5.66-5.66z"/><path d="M22 12a4 4 0 0 1-8 0 4 4 0 0 1 8 0z"/><path d="M19.07 19.07a4 4 0 0 1-5.66-5.66 4 4 0 0 1 5.66 5.66z"/><path d="M12 22a4 4 0 0 1 0-8 4 4 0 0 1 0 8z"/><path d="M4.93 19.07a4 4 0 0 1 5.66-5.66 4 4 0 0 1-5.66 5.66z"/><path d="M2 12a4 4 0 0 1 8 0 4 4 0 0 1-8 0z"/><path d="M4.93 4.93a4 4 0 0 1 5.66 5.66 4 4 0 0 1-5.66-5.66z"/></svg>,
  orders: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16v-2"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  repeat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  eye: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  pause: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  upload: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  shop: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
};

type Tab = 'bouquets' | 'products' | 'orders' | 'subscriptions';
const SERIF = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

// ============================================================
// Main App
// ============================================================
export default function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('orders');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/admin/bouquets')
      .then((r) => { if (r.ok) { setAuthed(true); } throw new Error(); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!res.ok) { setError('Onjuist wachtwoord'); return; }
    setAuthed(true);
  };

  if (checking) return <div className="min-h-screen bg-[#F2E5D9] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#a06d69] border-t-transparent rounded-full animate-spin" /></div>;

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#F2E5D9] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/images/logo/logo-transparent.png" alt="Logo" className="w-24 mx-auto mb-4" />
            <h1 style={SERIF} className="text-3xl text-[#2B0000]">Beheer</h1>
            <p className="text-[#2B0000]/50 text-sm mt-1">Log in om je winkel te beheren</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl p-8 shadow-xl space-y-5">
            <div>
              <Label>Wachtwoord</Label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20" placeholder="Voer je wachtwoord in" autoFocus />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>
            <button type="submit" className="w-full py-3.5 bg-[#a06d69] text-white text-sm tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors">Inloggen</button>
          </form>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: 'orders', label: 'Bestellingen', icon: Icon.orders },
    { id: 'bouquets', label: 'Boeketten', icon: Icon.flower },
    { id: 'products', label: 'Webshop', icon: Icon.shop },
    { id: 'subscriptions', label: 'Abonnementen', icon: Icon.repeat },
  ];

  return (
    <div className="min-h-screen bg-[#F2E5D9]">
      <header className="bg-white/90 backdrop-blur-md border-b border-[#E3D4C6] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo/logo-transparent.png" alt="Logo" className="w-10 h-auto" />
            <span style={SERIF} className="text-xl text-[#2B0000] hidden sm:inline">Beheer</span>
          </div>
          <div className="flex items-center gap-1 bg-[#F2E5D9]/60 rounded-xl p-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm transition-all ${
                  tab === t.id ? 'bg-white text-[#2B0000] shadow-sm font-medium' : 'text-[#2B0000]/40 hover:text-[#2B0000]/70'
                }`}
              >
                <span className={tab === t.id ? 'text-[#a06d69]' : ''}>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
          <button onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); setAuthed(false); setPassword(''); }}
            className="flex items-center gap-2 text-[#2B0000]/40 hover:text-[#2B0000] text-sm transition-colors">
            {Icon.logout}
            <span className="hidden sm:inline">Uitloggen</span>
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'bouquets' && <BouquetsTab showToast={showToast} />}
        {tab === 'products' && <ProductsTab showToast={showToast} />}
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

  useEffect(() => { fetch('/api/admin/bouquets').then((r) => r.json()).then(setBouquets).catch(() => {}); }, []);

  const saveBouquet = async (bouquet: Bouquet) => {
    setSaving(true);
    const updated = bouquets.some((b) => b.id === bouquet.id) ? bouquets.map((b) => (b.id === bouquet.id ? bouquet : b)) : [...bouquets, bouquet];
    const res = await fetch('/api/admin/bouquets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) { setBouquets(updated); setEditing(null); showToast('Opgeslagen'); }
    setSaving(false);
  };

  const deleteBouquet = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit boeket wilt verwijderen?')) return;
    await fetch('/api/admin/bouquets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setBouquets(bouquets.filter((b) => b.id !== id));
    showToast('Verwijderd');
  };

  if (editing) {
    return (
      <>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-[#a06d69] text-sm mb-6 hover:underline">{Icon.back} Terug naar overzicht</button>
        <EditForm bouquet={editing} onSave={saveBouquet} saving={saving} isNew={!editing.id} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={SERIF} className="text-3xl text-[#2B0000]">Boeketten</h2>
          <p className="text-[#2B0000]/40 text-sm mt-1">{bouquets.length} item{bouquets.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setEditing({ id: '', name: '', color: '', description: '', image: '/images/bestellen/vrolijk-veld.png', priceSmall: '€ 0,00', priceMid: '€ 0,00', priceLarge: '€ 0,00', available: true, sortOrder: bouquets.length })}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#a06d69] text-white text-xs tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors">
          {Icon.plus} Nieuw boeket
        </button>
      </div>
      {bouquets.length === 0 ? (
        <EmptyState icon={Icon.flower} text="Nog geen boeketten" />
      ) : (
        <div className="space-y-2">
          {bouquets.map((b) => (
            <div key={b.id} className="bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow border border-transparent hover:border-[#E3D4C6]">
              <img src={b.image} alt={b.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 style={SERIF} className="text-lg text-[#2B0000] truncate">{b.name}</h3>
                <p className="text-[#2B0000]/40 text-xs mt-0.5">{b.color} · {b.priceMid}</p>
              </div>
              <button onClick={() => saveBouquet({ ...b, available: !b.available })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${b.available ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-[#F2E5D9] text-[#2B0000]/40 hover:bg-[#E3D4C6]'}`}>
                {b.available ? Icon.eye : Icon.eyeOff}
                {b.available ? 'Zichtbaar' : 'Verborgen'}
              </button>
              <IconBtn onClick={() => setEditing(b)} title="Bewerken" className="text-[#2B0000]/25 hover:text-[#a06d69]">{Icon.edit}</IconBtn>
              <IconBtn onClick={() => deleteBouquet(b.id)} title="Verwijderen" className="text-[#2B0000]/25 hover:text-red-500">{Icon.trash}</IconBtn>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================
// Products Tab (Webshop)
// ============================================================
function ProductsTab({ showToast }: { showToast: (m: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch('/api/admin/products').then((r) => r.json()).then(setProducts).catch(() => {}); }, []);

  const saveProduct = async (product: Product) => {
    setSaving(true);
    const updated = products.some((p) => p.id === product.id) ? products.map((p) => (p.id === product.id ? product : p)) : [...products, product];
    const res = await fetch('/api/admin/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) { setProducts(updated); setEditing(null); showToast('Opgeslagen'); }
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit product wilt verwijderen?')) return;
    await fetch('/api/admin/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setProducts(products.filter((p) => p.id !== id));
    showToast('Verwijderd');
  };

  if (editing) {
    return (
      <>
        <button onClick={() => setEditing(null)} className="flex items-center gap-1.5 text-[#a06d69] text-sm mb-6 hover:underline">{Icon.back} Terug naar overzicht</button>
        <ProductEditForm product={editing} onSave={saveProduct} saving={saving} isNew={!editing.id} />
      </>
    );
  }

  const newProduct = (): Product => ({ id: '', name: '', description: '', price: 0, priceLabel: '€ 0,00', image: '/images/verhuur/vaas-verhuur.jpeg', category: 'decoratie', available: true, sortOrder: products.length });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={SERIF} className="text-3xl text-[#2B0000]">Webshop Producten</h2>
          <p className="text-[#2B0000]/40 text-sm mt-1">{products.length} product{products.length !== 1 ? 'en' : ''}</p>
        </div>
        <button onClick={() => setEditing(newProduct())}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#a06d69] text-white text-xs tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors">
          {Icon.plus} Nieuw product
        </button>
      </div>
      {products.length === 0 ? (
        <EmptyState icon={Icon.shop} text="Nog geen producten" />
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-shadow border border-transparent hover:border-[#E3D4C6]">
              <img src={p.image} alt={p.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 style={SERIF} className="text-lg text-[#2B0000] truncate">{p.name}</h3>
                <p className="text-[#2B0000]/40 text-xs mt-0.5">{p.category} · {p.priceLabel}</p>
              </div>
              <button onClick={() => saveProduct({ ...p, available: !p.available })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${p.available ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-[#F2E5D9] text-[#2B0000]/40 hover:bg-[#E3D4C6]'}`}>
                {p.available ? Icon.eye : Icon.eyeOff}
                {p.available ? 'Zichtbaar' : 'Verborgen'}
              </button>
              <IconBtn onClick={() => setEditing(p)} title="Bewerken" className="text-[#2B0000]/25 hover:text-[#a06d69]">{Icon.edit}</IconBtn>
              <IconBtn onClick={() => deleteProduct(p.id)} title="Verwijderen" className="text-[#2B0000]/25 hover:text-red-500">{Icon.trash}</IconBtn>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ProductEditForm({ product, onSave, saving, isNew }: { product: Product; onSave: (p: Product) => void; saving: boolean; isNew: boolean }) {
  const [form, setForm] = useState<Product>(product);
  const [uploading, setUploading] = useState(false);
  const set = (key: keyof Product, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

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

  const updatePrice = (val: string) => {
    const num = parseFloat(val) || 0;
    set('price', num);
    set('priceLabel', `€ ${num.toFixed(2).replace('.', ',')}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) form.id = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E3D4C6]/50 space-y-6">
      <h2 style={SERIF} className="text-2xl text-[#2B0000]">{isNew ? 'Nieuw product' : `${form.name} bewerken`}</h2>

      <div className="flex items-start gap-6">
        <div className="w-28 h-28 rounded-xl overflow-hidden bg-[#F2E5D9] flex-shrink-0 border border-[#E3D4C6]">
          <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
        </div>
        <div className="pt-1">
          <Label>Foto</Label>
          <label className="flex items-center gap-2 cursor-pointer mt-1.5 px-4 py-2.5 bg-[#F2E5D9] text-[#2B0000] text-xs tracking-wider uppercase rounded-lg hover:bg-[#E3D4C6] transition-colors w-fit">
            {Icon.upload}
            {uploading ? 'Uploaden...' : 'Foto kiezen'}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Naam" value={form.name} onChange={(v) => set('name', v)} required />
        <div>
          <Label>Categorie</Label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}
            className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20">
            <option value="vazen">Vazen</option>
            <option value="decoratie">Decoratie</option>
            <option value="kunstbloemen">Kunstbloemen</option>
            <option value="cadeaus">Cadeaus</option>
          </select>
        </div>
      </div>

      <div>
        <Label>Beschrijving</Label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} required
          className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20 resize-none" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prijs (in euro)</Label>
          <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => updatePrice(e.target.value)}
            className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20" required />
        </div>
        <Field label="Volgorde" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', parseInt(v) || 0)} type="number" />
      </div>

      <div className="flex items-center">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div className={`w-11 h-6 rounded-full relative transition-colors ${form.available ? 'bg-[#a06d69]' : 'bg-[#E3D4C6]'}`} onClick={() => set('available', !form.available)}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.available ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-[#2B0000]">{form.available ? 'Zichtbaar in webshop' : 'Verborgen'}</span>
        </label>
      </div>

      <div className="pt-4 border-t border-[#E3D4C6] flex items-center justify-between">
        <p className="text-xs text-[#2B0000]/30">Wijzigingen worden direct zichtbaar op de website</p>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#a06d69] text-white text-sm tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors disabled:opacity-50">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : Icon.check}
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// Orders Tab
// ============================================================
function OrdersTab({ showToast }: { showToast: (m: string) => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const reload = () => fetch('/api/admin/orders').then((r) => r.json()).then(setOrders).catch(() => {});
  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  const updateStatus = async (id: number, status: string) => {
    await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    setOrders(orders.map((o) => o.id === id ? { ...o, status } : o));
    showToast('Status bijgewerkt');
  };

  const syncAll = async () => {
    setSyncing(true);
    const res = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sync-all' }) });
    const data = await res.json();
    await reload();
    setSyncing(false);
    showToast(data.synced > 0 ? `${data.synced} bestelling(en) bijgewerkt` : 'Alles is up-to-date');
  };

  const deletableStatuses = ['delivered', 'cancelled', 'pending'];

  const canDelete = (status: string) => deletableStatuses.includes(status);

  const deleteOrder = async (id: number, status: string) => {
    if (!canDelete(status)) return;
    const labels: Record<string, string> = { delivered: 'bezorgde', cancelled: 'geannuleerde', pending: 'onbetaalde' };
    if (!confirm(`Weet je zeker dat je deze ${labels[status] || ''} bestelling wilt verwijderen? Dit kan niet ongedaan worden.`)) return;
    await fetch('/api/admin/orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setOrders(orders.filter((o) => o.id !== id));
    showToast('Bestelling verwijderd');
  };

  const deleteOldOrders = async () => {
    const old = orders.filter((o) => canDelete(o.status));
    if (old.length === 0) { showToast('Geen oude bestellingen om te verwijderen'); return; }
    if (!confirm(`${old.length} oude bestelling${old.length !== 1 ? 'en' : ''} verwijderen?\n\nAlleen bezorgde, geannuleerde en onbetaalde bestellingen worden verwijderd. Actieve bestellingen blijven staan.`)) return;
    for (const o of old) {
      await fetch('/api/admin/orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id }) });
    }
    setOrders(orders.filter((o) => !canDelete(o.status)));
    showToast(`${old.length} bestelling${old.length !== 1 ? 'en' : ''} verwijderd`);
  };

  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    pending:    { label: 'Wacht op betaling', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
    paid:       { label: 'Betaald',           color: 'bg-blue-50 text-blue-700',   dot: 'bg-blue-400' },
    preparing:  { label: 'In voorbereiding',  color: 'bg-violet-50 text-violet-700', dot: 'bg-violet-400' },
    shipped:    { label: 'Verzonden',         color: 'bg-sky-50 text-sky-700',     dot: 'bg-sky-400' },
    delivered:  { label: 'Bezorgd',           color: 'bg-green-50 text-green-700', dot: 'bg-green-400' },
    cancelled:  { label: 'Geannuleerd',       color: 'bg-red-50 text-red-600',     dot: 'bg-red-400' },
  };

  if (loading) return <Spinner />;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={SERIF} className="text-3xl text-[#2B0000]">Bestellingen</h2>
          <p className="text-[#2B0000]/40 text-sm mt-1">{orders.length} bestelling{orders.length !== 1 ? 'en' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {orders.some((o) => canDelete(o.status)) && (
            <button onClick={deleteOldOrders}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-500 text-xs tracking-wider uppercase rounded-xl hover:bg-red-50 transition-colors">
              {Icon.trash} Opschonen
            </button>
          )}
          <button onClick={syncAll} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E3D4C6] text-[#2B0000]/70 text-xs tracking-wider uppercase rounded-xl hover:bg-[#F2E5D9] transition-colors disabled:opacity-50">
            {syncing ? <span className="w-4 h-4 border-2 border-[#a06d69] border-t-transparent rounded-full animate-spin" /> : Icon.repeat}
            {syncing ? 'Synchroniseren...' : 'Sync met Mollie'}
          </button>
        </div>
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={Icon.orders} text="Nog geen bestellingen" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const s = statusConfig[o.status] || statusConfig.pending;
            const isOpen = expanded === o.id;
            const items = parseItems(o.items);
            const deliveryLabels: Record<string, string> = { pickup: 'Ophalen in winkel', local: 'Lokale bezorging', shipping: 'Verzending' };
            const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div key={o.id} className="bg-white rounded-xl border border-transparent hover:border-[#E3D4C6] transition-colors overflow-hidden">
                {/* Summary row — clickable */}
                <button type="button" onClick={() => setExpanded(isOpen ? null : o.id)} className="w-full p-5 flex items-start justify-between gap-4 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-[#2B0000]">{o.orderNumber}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                      <span className="text-xs text-[#2B0000]/25">{dateStr}</span>
                    </div>
                    <p className="text-sm text-[#2B0000]/50 mt-1">{o.customerName} · {o.customerEmail}{o.customerPhone ? ` · ${o.customerPhone}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span style={SERIF} className="text-2xl text-[#2B0000]">{formatPrice(o.total)}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[#2B0000]/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </button>

                {/* Expandable detail */}
                {isOpen && (
                  <div className="px-5 pb-5 space-y-4 border-t border-[#F2E5D9]">

                    {/* Products */}
                    <div className="pt-4">
                      <h4 className="text-[10px] uppercase tracking-widest text-[#2B0000]/30 font-semibold mb-2">Producten</h4>
                      <div className="space-y-2">
                        {items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-sm">
                            <span className="text-[#2B0000]">{item.name}{item.size ? ` (${item.size})` : ''} <span className="text-[#2B0000]/40">x{item.quantity}</span></span>
                            <span className="text-[#2B0000]/70 font-medium">{item.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-[#F2E5D9] text-sm">
                        <span className="text-[#2B0000]/50">Subtotaal</span>
                        <span className="text-[#2B0000]">{formatPrice(o.subtotal)}</span>
                      </div>
                      {Number(o.deliveryCost) > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#2B0000]/50">Bezorgkosten</span>
                          <span className="text-[#2B0000]">{formatPrice(o.deliveryCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-[#2B0000]">Totaal</span>
                        <span className="text-[#2B0000]">{formatPrice(o.total)}</span>
                      </div>
                    </div>

                    {/* Delivery info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-[#2B0000]/30 font-semibold mb-1">Bezorging</h4>
                        <p className="text-sm text-[#2B0000]">{deliveryLabels[o.deliveryMethod] || o.deliveryMethod}</p>
                        {o.deliveryDate && <p className="text-sm text-[#2B0000]/60">Datum: {o.deliveryDate}</p>}
                        {o.deliveryAddress && <p className="text-sm text-[#2B0000]/60">{o.deliveryAddress}</p>}
                        {(o.deliveryPostalCode || o.deliveryCity) && <p className="text-sm text-[#2B0000]/60">{o.deliveryPostalCode} {o.deliveryCity}</p>}
                        {o.deliveryRegion && <p className="text-xs text-[#2B0000]/40">Regio: {o.deliveryRegion}</p>}
                      </div>
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-[#2B0000]/30 font-semibold mb-1">Klant</h4>
                        <p className="text-sm text-[#2B0000]">{o.customerName}</p>
                        <p className="text-sm text-[#2B0000]/60">{o.customerEmail}</p>
                        {o.customerPhone && <p className="text-sm text-[#2B0000]/60">{o.customerPhone}</p>}
                      </div>
                    </div>

                    {/* Notes */}
                    {o.customerNote && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-[#2B0000]/30 font-semibold mb-1">Opmerking klant</h4>
                        <p className="text-sm text-[#2B0000]/70 bg-[#F2E5D9] rounded-lg p-3 italic">{o.customerNote}</p>
                      </div>
                    )}

                    {/* Status + actions */}
                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#F2E5D9] flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase tracking-widest text-[#2B0000]/30 font-semibold mr-1">Status:</span>
                        {['paid', 'preparing', 'shipped', 'delivered'].map((st) => (
                          <button key={st} onClick={() => updateStatus(o.id, st)}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${o.status === st ? 'bg-[#2B0000] text-white' : 'bg-[#F2E5D9] text-[#2B0000]/50 hover:bg-[#E3D4C6] hover:text-[#2B0000]/70'}`}>
                            {statusConfig[st].label}
                          </button>
                        ))}
                      </div>
                      {canDelete(o.status) ? (
                        <IconBtn onClick={() => deleteOrder(o.id, o.status)} title="Verwijderen" className="text-[#2B0000]/20 hover:text-red-500">{Icon.trash}</IconBtn>
                      ) : (
                        <span className="p-2 text-[#2B0000]/10 cursor-not-allowed" title="Actieve bestellingen kunnen niet verwijderd worden">{Icon.trash}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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

  useEffect(() => { fetch('/api/admin/subscriptions').then((r) => r.json()).then(setSubs).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleAction = async (id: number, action: string) => {
    if (action === 'cancel' && !confirm('Weet je zeker dat je dit abonnement wilt stoppen?')) return;
    await fetch('/api/admin/subscriptions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    setSubs(subs.map((s) => s.id === id ? { ...s, status: action === 'pause' ? 'paused' : action === 'resume' ? 'active' : 'cancelled' } : s));
    showToast(action === 'cancel' ? 'Abonnement gestopt' : 'Status bijgewerkt');
  };

  const deleteSub = async (id: number) => {
    if (!confirm('Weet je zeker dat je dit abonnement wilt verwijderen?')) return;
    await fetch('/api/admin/subscriptions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setSubs(subs.filter((s) => s.id !== id));
    showToast('Abonnement verwijderd');
  };

  const freqLabels: Record<string, string> = { weekly: 'Wekelijks', biweekly: '2-wekelijks', monthly: 'Maandelijks', quarterly: 'Per kwartaal', biannual: 'Per halfjaar', yearly: 'Per jaar' };
  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    active:    { label: 'Actief',        color: 'bg-green-50 text-green-700',  dot: 'bg-green-400' },
    paused:    { label: 'Gepauzeerd',    color: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-400' },
    pending:   { label: 'In afwachting', color: 'bg-blue-50 text-blue-700',    dot: 'bg-blue-400' },
    cancelled: { label: 'Gestopt',       color: 'bg-red-50 text-red-600',      dot: 'bg-red-400' },
  };

  if (loading) return <Spinner />;

  return (
    <>
      <h2 style={SERIF} className="text-3xl text-[#2B0000] mb-6">Abonnementen</h2>
      {subs.length === 0 ? (
        <EmptyState icon={Icon.repeat} text="Nog geen abonnementen" />
      ) : (
        <div className="space-y-3">
          {subs.map((s) => {
            const st = statusConfig[s.status] || statusConfig.pending;
            return (
              <div key={s.id} className="bg-white rounded-xl p-5 border border-transparent hover:border-[#E3D4C6] transition-colors">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-[#2B0000]">{s.customerName}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#2B0000]/40 mt-1">{s.customerEmail}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <span style={SERIF} className="text-xl text-[#2B0000]">{formatPrice(s.pricePerDelivery)}</span>
                      <span className="block text-[10px] text-[#2B0000]/30 uppercase tracking-wider">per levering</span>
                    </div>
                    <IconBtn onClick={() => deleteSub(s.id)} title="Verwijderen" className="text-[#2B0000]/20 hover:text-red-500">{Icon.trash}</IconBtn>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#2B0000]/40 mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F2E5D9] rounded">{s.planType === 'fresh' ? 'Vers' : 'Kunst'}</span>
                  <span>{s.planSize}</span>
                  <span className="text-[#2B0000]/20">|</span>
                  <span>{freqLabels[s.frequency] || s.frequency}</span>
                  {s.nextDeliveryDate && <><span className="text-[#2B0000]/20">|</span><span>Volgende: {s.nextDeliveryDate}</span></>}
                </div>
                {s.status !== 'cancelled' && (
                  <div className="flex gap-2 pt-3 border-t border-[#F2E5D9]">
                    {s.status === 'active' && (
                      <button onClick={() => handleAction(s.id, 'pause')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#F2E5D9] text-[#2B0000]/60 hover:bg-[#E3D4C6] transition-colors">
                        {Icon.pause} Pauzeren
                      </button>
                    )}
                    {s.status === 'paused' && (
                      <button onClick={() => handleAction(s.id, 'resume')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                        {Icon.play} Hervatten
                      </button>
                    )}
                    <button onClick={() => handleAction(s.id, 'cancel')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                      {Icon.x} Stoppen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ============================================================
// Edit Form
// ============================================================
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
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#E3D4C6]/50 space-y-6">
      <h2 style={SERIF} className="text-2xl text-[#2B0000]">{isNew ? 'Nieuw boeket' : `${form.name} bewerken`}</h2>

      <div className="flex items-start gap-6">
        <div className="w-28 h-28 rounded-xl overflow-hidden bg-[#F2E5D9] flex-shrink-0 border border-[#E3D4C6]">
          <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
        </div>
        <div className="pt-1">
          <Label>Foto</Label>
          <label className="flex items-center gap-2 cursor-pointer mt-1.5 px-4 py-2.5 bg-[#F2E5D9] text-[#2B0000] text-xs tracking-wider uppercase rounded-lg hover:bg-[#E3D4C6] transition-colors w-fit">
            {Icon.upload}
            {uploading ? 'Uploaden...' : 'Foto kiezen'}
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
          className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20 resize-none" />
      </div>

      <div>
        <Label>Prijzen</Label>
        <div className="grid grid-cols-3 gap-3 mt-1.5">
          <Field label="" value={form.priceSmall} onChange={(v) => set('priceSmall', v)} placeholder="€ 22,50" required prefix="Klein" />
          <Field label="" value={form.priceMid} onChange={(v) => set('priceMid', v)} placeholder="€ 29,95" required prefix="Middel" />
          <Field label="" value={form.priceLarge} onChange={(v) => set('priceLarge', v)} placeholder="€ 39,95" required prefix="Groot" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Volgorde" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', parseInt(v) || 0)} type="number" />
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className={`w-11 h-6 rounded-full relative transition-colors ${form.available ? 'bg-[#a06d69]' : 'bg-[#E3D4C6]'}`} onClick={() => set('available', !form.available)}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.available ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-[#2B0000]">{form.available ? 'Zichtbaar' : 'Verborgen'}</span>
          </label>
        </div>
      </div>

      <div className="pt-4 border-t border-[#E3D4C6] flex items-center justify-between">
        <p className="text-xs text-[#2B0000]/30">Wijzigingen worden direct zichtbaar op de website</p>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#a06d69] text-white text-sm tracking-widest uppercase rounded-xl hover:bg-[#885c59] transition-colors disabled:opacity-50">
          {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : Icon.check}
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// Shared
// ============================================================
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] uppercase tracking-widest text-[#2B0000]/40 font-semibold mb-1.5">{children}</label>;
}

function Field({ label, value, onChange, placeholder, required, type = 'text', prefix }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string; prefix?: string;
}) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      {prefix && <span className="block text-[10px] uppercase tracking-widest text-[#2B0000]/30 font-semibold mb-1">{prefix}</span>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-4 py-3 border border-[#E3D4C6] rounded-lg text-[#2B0000] text-sm focus:outline-none focus:border-[#a06d69] focus:ring-2 focus:ring-[#a06d69]/20" />
    </div>
  );
}

function IconBtn({ onClick, title, className, children }: { onClick: () => void; title: string; className: string; children: React.ReactNode }) {
  return <button onClick={onClick} title={title} className={`p-2 rounded-lg hover:bg-[#F2E5D9] transition-colors ${className}`}>{children}</button>;
}

function EmptyState({ icon, text }: { icon: JSX.Element; text: string }) {
  return (
    <div className="bg-white rounded-2xl p-16 text-center border border-[#E3D4C6]/50">
      <div className="w-14 h-14 mx-auto bg-[#F2E5D9] rounded-full flex items-center justify-center text-[#a06d69] mb-4">{icon}</div>
      <p className="text-[#2B0000]/40 text-sm">{text}</p>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#a06d69] border-t-transparent rounded-full animate-spin" /></div>;
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2B0000] text-white px-5 py-3 rounded-xl shadow-xl text-sm z-50 flex items-center gap-2">
      {Icon.check} {message}
    </div>
  );
}

function formatPrice(val: any): string {
  const n = Number(val);
  if (isNaN(n)) return '€ 0,00';
  return `€ ${n.toFixed(2).replace('.', ',')}`;
}

function parseItems(items: any): any[] {
  if (!items) return [];
  if (typeof items === 'string') {
    try { return JSON.parse(items); } catch { return []; }
  }
  if (Array.isArray(items)) return items;
  return [];
}
