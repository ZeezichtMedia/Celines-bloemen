import { useState, useEffect, type ReactNode } from 'react';
import type { Bouquet, Product } from '../../lib/types';
import { Ph } from './icons';

// ============================================================
// Bouwstenen: één plek voor knoppen, velden en kaarten, zodat elk
// scherm er hetzelfde uitziet. Kleuren komen uit global.css (@theme).
// ============================================================
const cls = {
  primary: 'inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.9rem] font-medium text-base transition hover:bg-accent-500 disabled:opacity-50',
  secondary: 'inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-[0.9rem] text-ink transition hover:border-ink/40 disabled:opacity-50',
  danger: 'inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-[0.9rem] text-red-600 transition hover:bg-red-50',
  iconBtn: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-faint transition hover:bg-base-2 hover:text-ink',
  input: 'w-full rounded-xl border border-line bg-white px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-faint transition focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/10',
  card: 'rounded-2xl border border-line bg-white',
  label: 'mb-1.5 block text-[0.8rem] font-medium text-ink-muted',
  hint: 'mt-1.5 text-[0.78rem] leading-snug text-ink-faint',
};

type Tab = 'orders' | 'bouquets' | 'products' | 'subscriptions' | 'settings';
const TABS: { id: Tab; label: string; short: string; icon: string }[] = [
  { id: 'orders', label: 'Bestellingen', short: 'Bestellingen', icon: 'orders' },
  { id: 'bouquets', label: 'Boeketten', short: 'Boeketten', icon: 'flower' },
  { id: 'products', label: 'Webshop', short: 'Webshop', icon: 'shop' },
  { id: 'subscriptions', label: 'Abonnementen', short: 'Abonnem.', icon: 'repeat' },
  { id: 'settings', label: 'Instellingen', short: 'Instellingen', icon: 'settings' },
];
const readTabFromHash = (): Tab => {
  if (typeof window === 'undefined') return 'orders';
  const h = window.location.hash.replace('#', '') as Tab;
  return TABS.some((t) => t.id === h) ? h : 'orders';
};

// ============================================================
// App
// ============================================================
export default function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTabState] = useState<Tab>(readTabFromHash);
  const [toast, setToast] = useState('');

  const setTab = (next: Tab) => {
    setTabState(next);
    if (typeof window !== 'undefined' && window.location.hash.replace('#', '') !== next) {
      window.history.replaceState(null, '', `#${next}`);
    }
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    fetch('/api/admin/bouquets')
      .then((r) => { if (r.ok) { setAuthed(true); } throw new Error(); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const onHashChange = () => setTabState(readTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(res.status === 429 ? data.error || 'Te veel pogingen, probeer het later opnieuw' : 'Onjuist wachtwoord');
      return;
    }
    setAuthed(true);
  };

  const logout = async () => { await fetch('/api/admin/logout', { method: 'POST' }); setAuthed(false); setPassword(''); };

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-base"><Spinner /></div>;

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-2 px-5">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <img src="/images/logo/celinesbloemenlogo-400.webp" alt="Celine's Bloemen" width="112" height="112" className="mx-auto mb-5 h-28 w-auto" />
            <h1 className="font-display text-[2.4rem] leading-none text-ink">Beheer</h1>
            <p className="mt-2 text-sm text-ink-muted">Log in om je winkel te beheren</p>
          </div>
          <form onSubmit={handleLogin} className={`${cls.card} space-y-5 p-7 shadow-[0_30px_60px_-40px_rgb(43_23_18/0.5)]`}>
            <div>
              <label htmlFor="pw" className={cls.label}>Wachtwoord</label>
              <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={cls.input} placeholder="Je wachtwoord" autoFocus />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <button type="submit" className={`${cls.primary} w-full py-3`}>Inloggen</button>
          </form>
          <a href="/" className="mt-6 flex items-center justify-center gap-2 text-sm text-ink-muted hover:text-ink"><Ph name="back" size={16} /> Terug naar de website</a>
        </div>
      </div>
    );
  }

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen bg-base lg:pl-64">
      {/* Zijbalk op desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-base-2/70 lg:flex">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-6 pb-6 pt-7" title="Website openen">
          <img src="/images/logo/celinesbloemenlogo-400.webp" alt="" width="48" height="48" className="h-12 w-auto" />
          <span className="font-display text-[1.6rem] leading-none text-ink">Beheer</span>
        </a>
        <nav className="flex-1 space-y-1 px-3" aria-label="Beheer">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[0.95rem] transition ${tab === t.id ? 'bg-white text-ink shadow-[0_1px_2px_rgb(43_23_18/0.06)]' : 'text-ink-muted hover:bg-white/60 hover:text-ink'}`}>
              <Ph name={t.icon} size={20} className={tab === t.id ? 'text-accent-500' : ''} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] text-ink-muted transition hover:bg-white/60 hover:text-ink">
            <Ph name="external" size={20} /> Website bekijken
          </a>
          <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[0.95rem] text-ink-muted transition hover:bg-white/60 hover:text-ink">
            <Ph name="logout" size={20} /> Uitloggen
          </button>
        </div>
      </aside>

      {/* Bovenbalk op telefoon en tablet */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-base/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <img src="/images/logo/celinesbloemenlogo-400.webp" alt="Celine's Bloemen" width="36" height="36" className="h-9 w-auto shrink-0" />
          <span className="truncate font-display text-[1.35rem] leading-none text-ink">{current.label}</span>
        </div>
        <div className="flex items-center">
          <a href="/" target="_blank" rel="noopener noreferrer" className={cls.iconBtn} title="Website bekijken" aria-label="Website bekijken"><Ph name="external" /></a>
          <button type="button" onClick={logout} className={cls.iconBtn} title="Uitloggen" aria-label="Uitloggen"><Ph name="logout" /></button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-32 pt-6 sm:px-8 lg:pb-16 lg:pt-12">
        {tab === 'orders' && <OrdersTab showToast={showToast} />}
        {tab === 'bouquets' && <BouquetsTab showToast={showToast} />}
        {tab === 'products' && <ProductsTab showToast={showToast} />}
        {tab === 'subscriptions' && <SubscriptionsTab showToast={showToast} />}
        {tab === 'settings' && <SettingsTab showToast={showToast} />}
      </main>

      {/* Tabbalk onderin op telefoon en tablet */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Beheer">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[0.68rem] transition ${tab === t.id ? 'text-ink' : 'text-ink-faint'}`}>
              <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${tab === t.id ? 'bg-accent-100 text-accent-600' : ''}`}>
                <Ph name={t.icon} size={22} />
              </span>
              <span className="w-full truncate text-center">{t.short}</span>
            </button>
          ))}
        </div>
      </nav>

      {toast && <Toast message={toast} />}
    </div>
  );
}

// ============================================================
// Gedeelde onderdelen
// ============================================================
function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="hidden font-display text-[2.6rem] leading-none text-ink lg:block">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted lg:mt-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: () => void; label: string; sub?: string }) {
  return (
    <button type="button" onClick={onChange} role="switch" aria-checked={on} className="flex items-start gap-3 text-left">
      <span className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-accent-500' : 'bg-line'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
      <span className="text-[0.95rem] text-ink">
        {label}
        {sub && <span className="mt-0.5 block text-[0.8rem] text-ink-faint">{sub}</span>}
      </span>
    </button>
  );
}

function VisibilityPill({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={on ? 'Klik om te verbergen' : 'Klik om te tonen'}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] transition ${on ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-base-2 text-ink-muted hover:bg-line'}`}>
      <Ph name={on ? 'eye' : 'eyeOff'} size={15} />
      {on ? 'Zichtbaar' : 'Verborgen'}
    </button>
  );
}

function StatusPill({ label, color, dot }: { label: string; color: string; dot: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function Field({ label, value, onChange, placeholder, required, type = 'text', hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string; hint?: string;
}) {
  return (
    <div>
      {label && <label className={cls.label}>{label}</label>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={cls.input} />
      {hint && <p className={cls.hint}>{hint}</p>}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className={`${cls.card} px-6 py-16 text-center`}>
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-base-2 text-accent-500"><Ph name={icon} size={26} /></span>
      <p className="text-sm text-ink-muted">{text}</p>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" /></div>;
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-5 py-3 text-sm text-base shadow-[0_20px_40px_-20px_rgb(0_0_0/0.5)] lg:bottom-8">
      <Ph name="check" size={18} className="text-accent-300" /> {message}
    </div>
  );
}

function formatPrice(val: any): string {
  const n = Number(val);
  if (isNaN(n)) return '€ 0,00';
  return `€ ${n.toFixed(2).replace('.', ',')}`;
}

/** "2026-10-23" wordt "do 23 okt" */
function formatDay(d?: string | null): string {
  if (!d) return '';
  const date = new Date(`${d}T12:00:00`);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function parseItems(items: any): any[] {
  if (!items) return [];
  if (typeof items === 'string') {
    try { return JSON.parse(items); } catch { return []; }
  }
  if (Array.isArray(items)) return items;
  return [];
}

/** Regel in de lijst van boeketten en producten. Op de telefoon schuiven de knoppen onder de tekst. */
function ItemRow({ image, title, meta, available, onToggle, onEdit, onDelete }: {
  image: string; title: string; meta: ReactNode; available: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className={`${cls.card} flex items-center gap-4 p-3 sm:p-4`}>
      <button type="button" onClick={onEdit} className="shrink-0" aria-label={`${title} bewerken`}>
        <img src={image} alt="" className="h-16 w-16 rounded-xl object-cover sm:h-20 sm:w-20" />
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onEdit} className="block max-w-full text-left">
          <h3 className="break-words font-display text-[1.35rem] leading-tight text-ink">{title}</h3>
        </button>
        <p className="mt-1 text-[0.85rem] text-ink-muted">{meta}</p>
        <div className="mt-2 sm:hidden"><VisibilityPill on={available} onClick={onToggle} /></div>
      </div>
      <div className="hidden sm:block"><VisibilityPill on={available} onClick={onToggle} /></div>
      <div className="flex flex-col sm:flex-row">
        <button type="button" onClick={onEdit} className={cls.iconBtn} title="Bewerken" aria-label="Bewerken"><Ph name="edit" /></button>
        <button type="button" onClick={onDelete} className={`${cls.iconBtn} hover:!text-red-600`} title="Verwijderen" aria-label="Verwijderen"><Ph name="trash" /></button>
      </div>
    </div>
  );
}

async function uploadPhoto(file: File): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: `Upload mislukt (${res.status})` }));
      alert(`Foto uploaden mislukt: ${error ?? res.statusText}`);
      return null;
    }
    const { url } = await res.json();
    return url;
  } catch (err) {
    alert(`Foto uploaden mislukt: ${err instanceof Error ? err.message : 'onbekende fout'}`);
    return null;
  }
}

function PhotoPicker({ image, onChange }: { image: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="flex items-center gap-5">
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-line bg-base-2">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-ink-faint"><Ph name="image" size={28} /></span>}
      </div>
      <div>
        <p className={cls.label}>Foto</p>
        <label className={`${cls.secondary} cursor-pointer`}>
          <Ph name="upload" size={18} />
          {uploading ? 'Uploaden...' : 'Foto kiezen'}
          <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            const url = await uploadPhoto(file);
            if (url) onChange(url);
            setUploading(false);
            e.target.value = '';
          }} />
        </label>
      </div>
    </div>
  );
}

function FormShell({ title, onBack, onSubmit, saving, children }: { title: string; onBack: () => void; onSubmit: (e: React.FormEvent) => void; saving: boolean; children: ReactNode }) {
  return (
    <>
      <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-ink-muted transition hover:text-ink">
        <Ph name="back" size={18} /> Terug naar het overzicht
      </button>
      <form onSubmit={onSubmit} className={`${cls.card} space-y-7 p-5 sm:p-8`}>
        <h2 className="font-display text-[2rem] leading-tight text-ink">{title}</h2>
        {children}
        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.8rem] text-ink-faint">Wat je opslaat, staat direct op de website.</p>
          <button type="submit" disabled={saving} className={`${cls.primary} w-full sm:w-auto`}>
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-base border-t-transparent" /> : <Ph name="check" size={18} />}
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </form>
    </>
  );
}

// ============================================================
// Boeketten
// ============================================================
function BouquetsTab({ showToast }: { showToast: (m: string) => void }) {
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [editing, setEditing] = useState<Bouquet | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch('/api/admin/bouquets').then((r) => r.json()).then(setBouquets).catch(() => {}); }, []);

  const saveBouquet = async (bouquet: Bouquet) => {
    setSaving(true);
    // Alleen dit boeket opslaan; de server geeft het terug (met id als het nieuw is)
    const res = await fetch('/api/admin/bouquets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bouquet) });
    if (res.ok) {
      const saved: Bouquet = await res.json();
      setBouquets((prev) => (prev.some((b) => b.id === saved.id) ? prev.map((b) => (b.id === saved.id ? saved : b)) : [...prev, saved]).sort((a, b) => a.sortOrder - b.sortOrder));
      setEditing(null); showToast('Opgeslagen');
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Opslaan mislukt' }));
      alert(error || 'Opslaan mislukt');
    }
    setSaving(false);
  };

  const deleteBouquet = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit boeket wilt verwijderen?')) return;
    await fetch('/api/admin/bouquets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setBouquets(bouquets.filter((b) => b.id !== id));
    showToast('Verwijderd');
  };

  if (editing) {
    return <EditForm bouquet={editing} onSave={saveBouquet} onBack={() => setEditing(null)} saving={saving} isNew={!editing.id} />;
  }

  return (
    <>
      <PageHeader
        title="Boeketten"
        subtitle={`${bouquets.length} boeket${bouquets.length !== 1 ? 'ten' : ''} op de bestelpagina`}
        actions={
          <button type="button" className={cls.primary} onClick={() => setEditing({ id: '', name: '', color: '', description: '', image: '', priceSmall: '€ 0,00', priceMid: '€ 0,00', priceLarge: '€ 0,00', available: true, sortOrder: bouquets.length })}>
            <Ph name="plus" size={18} /> Nieuw boeket
          </button>
        }
      />
      {bouquets.length === 0 ? (
        <EmptyState icon="flower" text="Nog geen boeketten" />
      ) : (
        <div className="space-y-3">
          {bouquets.map((b) => (
            <ItemRow key={b.id} image={b.image} title={b.name}
              meta={<>{b.color} <span className="text-ink-faint">·</span> <span className="whitespace-nowrap">{b.priceSmall}</span> tot <span className="whitespace-nowrap">{b.priceLarge}</span></>}
              available={b.available}
              onToggle={() => saveBouquet({ ...b, available: !b.available })}
              onEdit={() => setEditing(b)}
              onDelete={() => deleteBouquet(b.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function EditForm({ bouquet, onSave, onBack, saving, isNew }: { bouquet: Bouquet; onSave: (b: Bouquet) => void; onBack: () => void; saving: boolean; isNew: boolean }) {
  const [form, setForm] = useState<Bouquet>(bouquet);
  const set = (key: keyof Bouquet, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <FormShell title={isNew ? 'Nieuw boeket' : `${bouquet.name} bewerken`} onBack={onBack} saving={saving}
      onSubmit={(e) => { e.preventDefault(); if (!form.image) { alert('Kies eerst een foto'); return; } onSave(form); }}>
      <PhotoPicker image={form.image} onChange={(url) => set('image', url)} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Naam" value={form.name} onChange={(v) => set('name', v)} required />
        <Field label="Kleuren" value={form.color} onChange={(v) => set('color', v)} placeholder="Geel / Blauw / Oranje" required />
      </div>

      <div>
        <label className={cls.label}>Beschrijving</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} required className={`${cls.input} resize-none`} />
      </div>

      <div>
        <p className={cls.label}>Prijzen</p>
        <div className="grid grid-cols-3 gap-3">
          {([['priceSmall', 'Klein'], ['priceMid', 'Middel'], ['priceLarge', 'Groot']] as const).map(([key, lbl]) => (
            <div key={key}>
              <span className="mb-1 block text-[0.75rem] text-ink-faint">{lbl}</span>
              <input value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder="€ 0,00" required className={cls.input} />
            </div>
          ))}
        </div>
        <p className={cls.hint}>Schrijf de prijs zoals op de site, bijvoorbeeld € 23,95.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
        <Field label="Volgorde" type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', parseInt(v) || 0)} hint="Lager getal staat eerder op de site." />
        <div className="pb-7"><Toggle on={form.available} onChange={() => set('available', !form.available)} label={form.available ? 'Zichtbaar op de site' : 'Verborgen'} /></div>
      </div>
    </FormShell>
  );
}

// ============================================================
// Webshop
// ============================================================
function ProductsTab({ showToast }: { showToast: (m: string) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch('/api/admin/products').then((r) => r.json()).then(setProducts).catch(() => {}); }, []);

  const saveProduct = async (product: Product) => {
    setSaving(true);
    // Alleen dit product opslaan, zodat de voorraad van andere producten niet met oude waarden wordt overschreven
    const res = await fetch('/api/admin/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) });
    if (res.ok) {
      const saved: Product = await res.json();
      setProducts((prev) => (prev.some((p) => p.id === saved.id) ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved]).sort((a, b) => a.sortOrder - b.sortOrder));
      setEditing(null); showToast('Opgeslagen');
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Opslaan mislukt' }));
      alert(error || 'Opslaan mislukt');
    }
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Weet je zeker dat je dit product wilt verwijderen?')) return;
    await fetch('/api/admin/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setProducts(products.filter((p) => p.id !== id));
    showToast('Verwijderd');
  };

  if (editing) {
    return <ProductEditForm product={editing} onSave={saveProduct} onBack={() => setEditing(null)} saving={saving} isNew={!editing.id} />;
  }

  const newProduct = (): Product => ({ id: '', name: '', description: '', price: 0, priceLabel: '€ 0,00', image: '', category: 'decoratie', available: true, sortOrder: products.length });

  return (
    <>
      <PageHeader
        title="Webshop"
        subtitle={`${products.length} product${products.length !== 1 ? 'en' : ''} in de webshop`}
        actions={<button type="button" className={cls.primary} onClick={() => setEditing(newProduct())}><Ph name="plus" size={18} /> Nieuw product</button>}
      />
      {products.length === 0 ? (
        <EmptyState icon="shop" text="Nog geen producten" />
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <ItemRow key={p.id} image={p.image} title={p.name}
              meta={<>
                <span className="capitalize">{p.category}</span> <span className="text-ink-faint">·</span> <span className="whitespace-nowrap">{p.priceLabel}</span>
                {p.stock != null && (
                  <> <span className="text-ink-faint">·</span> <span className={p.stock <= 0 ? 'font-medium text-red-600' : ''}>{p.stock <= 0 ? 'uitverkocht' : `${p.stock} op voorraad`}</span></>
                )}
              </>}
              available={p.available}
              onToggle={() => saveProduct({ ...p, available: !p.available })}
              onEdit={() => setEditing(p)}
              onDelete={() => deleteProduct(p.id)} />
          ))}
        </div>
      )}
    </>
  );
}

const CATEGORIES = [
  { value: 'vazen', label: 'Vazen' },
  { value: 'decoratie', label: 'Decoratie' },
  { value: 'kunstbloemen', label: 'Kunstbloemen' },
  { value: 'cadeaus', label: 'Cadeaus' },
];

function ProductEditForm({ product, onSave, onBack, saving, isNew }: { product: Product; onSave: (p: Product) => void; onBack: () => void; saving: boolean; isNew: boolean }) {
  const [form, setForm] = useState<Product>(product);
  const set = (key: keyof Product, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const updatePrice = (val: string) => {
    const num = parseFloat(val) || 0;
    set('price', num);
    set('priceLabel', `€ ${num.toFixed(2).replace('.', ',')}`);
  };

  return (
    <FormShell title={isNew ? 'Nieuw product' : `${product.name} bewerken`} onBack={onBack} saving={saving}
      onSubmit={(e) => { e.preventDefault(); if (!form.image) { alert('Kies eerst een foto'); return; } onSave(form); }}>
      <PhotoPicker image={form.image} onChange={(url) => set('image', url)} />

      <Field label="Naam" value={form.name} onChange={(v) => set('name', v)} required />

      <div>
        <p className={cls.label}>Categorie</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.value} type="button" onClick={() => set('category', c.value)}
              className={`rounded-full border px-4 py-2 text-[0.9rem] transition ${form.category === c.value ? 'border-ink bg-ink text-base' : 'border-ink/15 bg-white text-ink hover:border-ink/40'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={cls.label}>Beschrijving</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} required className={`${cls.input} resize-none`} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={cls.label}>Prijs in euro</label>
          <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => updatePrice(e.target.value)} className={cls.input} required />
        </div>
        <div>
          <label className={cls.label}>Voorraad</label>
          <input type="number" min="0" step="1" value={form.stock ?? ''} placeholder="Onbeperkt"
            onChange={(e) => set('stock', e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0))}
            className={cls.input} />
          <p className={cls.hint}>Leeg is onbeperkt, 0 is uitverkocht. Gaat vanzelf omlaag na een betaalde bestelling.</p>
        </div>
        <Field label="Volgorde" type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', parseInt(v) || 0)} hint="Lager getal staat eerder." />
      </div>

      <Toggle on={form.available} onChange={() => set('available', !form.available)} label={form.available ? 'Zichtbaar in de webshop' : 'Verborgen'} />
    </FormShell>
  );
}

// ============================================================
// Bestellingen
// ============================================================
const ORDER_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  pending:        { label: 'Wacht op betaling', color: 'bg-amber-50 text-amber-800',   dot: 'bg-amber-400' },
  pending_pickup: { label: 'Betaalt in winkel', color: 'bg-sky-50 text-sky-800',       dot: 'bg-sky-400' },
  paid:           { label: 'Betaald',           color: 'bg-blue-50 text-blue-800',     dot: 'bg-blue-500' },
  preparing:      { label: 'In voorbereiding',  color: 'bg-violet-50 text-violet-800', dot: 'bg-violet-400' },
  shipped:        { label: 'Verzonden',         color: 'bg-sky-50 text-sky-800',       dot: 'bg-sky-400' },
  delivered:      { label: 'Bezorgd',           color: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  cancelled:      { label: 'Geannuleerd',       color: 'bg-red-50 text-red-700',       dot: 'bg-red-400' },
};
const DELIVERY_LABELS: Record<string, string> = { pickup: 'Ophalen in winkel', local: 'Lokale bezorging', shipping: 'Verzending' };

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
    showToast(data.synced > 0 ? `${data.synced} bestelling(en) bijgewerkt` : 'Alles is bijgewerkt');
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

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Bestellingen"
        subtitle={`${orders.length} bestelling${orders.length !== 1 ? 'en' : ''}`}
        actions={<>
          <button type="button" onClick={syncAll} disabled={syncing} className={cls.secondary}>
            {syncing ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" /> : <Ph name="sync" size={18} />}
            {syncing ? 'Bijwerken...' : 'Betalingen bijwerken'}
          </button>
          {orders.some((o) => canDelete(o.status)) && (
            <button type="button" onClick={deleteOldOrders} className={cls.danger}><Ph name="broom" size={18} /> Opschonen</button>
          )}
        </>}
      />
      {orders.length === 0 ? (
        <EmptyState icon="orders" text="Nog geen bestellingen" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const s = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
            const isOpen = expanded === o.id;
            const items = parseItems(o.items);
            const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div key={o.id} className={`${cls.card} overflow-hidden transition ${isOpen ? 'border-ink/20' : 'hover:border-ink/20'}`}>
                <button type="button" onClick={() => setExpanded(isOpen ? null : o.id)} aria-expanded={isOpen} className="w-full p-4 text-left sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-[1.35rem] leading-tight text-ink">{o.customerName}</p>
                      <p className="mt-0.5 text-[0.8rem] tabular-nums text-ink-faint">{o.orderNumber} · {dateStr}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-display text-[1.5rem] leading-none tabular-nums text-ink">{formatPrice(o.total)}</span>
                      <Ph name="caret" size={18} className={`text-ink-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusPill {...s} />
                    <span className="text-[0.8rem] text-ink-muted">{DELIVERY_LABELS[o.deliveryMethod] || o.deliveryMethod}{o.deliveryDate ? `, ${formatDay(o.deliveryDate)}` : ''}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-6 border-t border-line bg-base/50 p-4 sm:p-5">
                    <div>
                      <p className={cls.label}>Producten</p>
                      <div className="space-y-2">
                        {items.map((item: any, i: number) => (
                          <div key={i} className="flex items-baseline justify-between gap-4 text-[0.92rem]">
                            <span className="text-ink">{item.name}{item.size ? ` (${item.size})` : ''} <span className="text-ink-faint">× {item.quantity}</span></span>
                            <span className="shrink-0 tabular-nums text-ink-soft">{item.price}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 space-y-1 border-t border-line pt-3 text-[0.92rem]">
                        <div className="flex justify-between"><span className="text-ink-muted">Subtotaal</span><span className="tabular-nums">{formatPrice(o.subtotal)}</span></div>
                        {Number(o.deliveryCost) > 0 && <div className="flex justify-between"><span className="text-ink-muted">Bezorgkosten</span><span className="tabular-nums">{formatPrice(o.deliveryCost)}</span></div>}
                        <div className="flex justify-between font-medium text-ink"><span>Totaal</span><span className="tabular-nums">{formatPrice(o.total)}</span></div>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <p className={cls.label}>Bezorging</p>
                        <p className="text-[0.92rem] text-ink">{DELIVERY_LABELS[o.deliveryMethod] || o.deliveryMethod}</p>
                        {o.deliveryDate && <p className="text-[0.92rem] text-ink-soft">Datum: {formatDay(o.deliveryDate)}</p>}
                        {o.deliveryAddress && <p className="text-[0.92rem] text-ink-soft">{o.deliveryAddress}</p>}
                        {(o.deliveryPostalCode || o.deliveryCity) && <p className="text-[0.92rem] text-ink-soft">{o.deliveryPostalCode} {o.deliveryCity}</p>}
                        {o.deliveryRegion && <p className="text-[0.8rem] text-ink-faint">Regio: {o.deliveryRegion}</p>}
                      </div>
                      <div>
                        <p className={cls.label}>Klant</p>
                        <p className="text-[0.92rem] text-ink">{o.customerName}</p>
                        <a href={`mailto:${o.customerEmail}`} className="block break-all text-[0.92rem] text-ink-soft underline-offset-2 hover:underline">{o.customerEmail}</a>
                        {o.customerPhone && <a href={`tel:${o.customerPhone}`} className="block text-[0.92rem] text-ink-soft underline-offset-2 hover:underline">{o.customerPhone}</a>}
                      </div>
                    </div>

                    {o.customerNote && (
                      <div>
                        <p className={cls.label}>Opmerking van de klant</p>
                        <p className="rounded-xl bg-base-2 p-3 text-[0.92rem] italic text-ink-soft">{o.customerNote}</p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className={cls.label}>Status aanpassen</p>
                        <div className="flex flex-wrap gap-2">
                          {['paid', 'preparing', 'shipped', 'delivered'].map((st) => (
                            <button key={st} type="button" onClick={() => updateStatus(o.id, st)}
                              className={`rounded-full border px-3.5 py-2 text-[0.85rem] transition ${o.status === st ? 'border-ink bg-ink text-base' : 'border-ink/15 bg-white text-ink-soft hover:border-ink/40'}`}>
                              {ORDER_STATUS[st].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {canDelete(o.status) ? (
                        <button type="button" onClick={() => deleteOrder(o.id, o.status)} className={`${cls.danger} self-start sm:self-auto`}><Ph name="trash" size={18} /> Verwijderen</button>
                      ) : (
                        <p className="text-[0.78rem] text-ink-faint">Actieve bestellingen kun je niet verwijderen</p>
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
// Abonnementen
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

  const freqLabels: Record<string, string> = { weekly: 'Wekelijks', biweekly: 'Per 2 weken', triweekly: 'Per 3 weken', monthly: 'Per maand', quarterly: 'Per kwartaal', biannual: 'Per halfjaar', yearly: 'Per jaar' };
  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    active:    { label: 'Actief',        color: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
    paused:    { label: 'Gepauzeerd',    color: 'bg-amber-50 text-amber-800',     dot: 'bg-amber-400' },
    pending:   { label: 'In afwachting', color: 'bg-blue-50 text-blue-800',       dot: 'bg-blue-500' },
    cancelled: { label: 'Gestopt',       color: 'bg-red-50 text-red-700',         dot: 'bg-red-400' },
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="Abonnementen" subtitle={`${subs.length} abonnement${subs.length !== 1 ? 'en' : ''}`} />
      {subs.length === 0 ? (
        <EmptyState icon="repeat" text="Nog geen abonnementen" />
      ) : (
        <div className="space-y-3">
          {subs.map((s) => {
            const st = statusConfig[s.status] || statusConfig.pending;
            const details = [s.planType === 'fresh' ? 'Verse bloemen' : 'Kunstbloemen', s.planSize, freqLabels[s.frequency] || s.frequency, s.vaseIncluded ? 'In vaas' : null].filter(Boolean);
            return (
              <div key={s.id} className={`${cls.card} p-4 sm:p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-[1.35rem] leading-tight text-ink">{s.customerName}</p>
                    <a href={`mailto:${s.customerEmail}`} className="mt-0.5 block break-all text-[0.85rem] text-ink-muted hover:underline">{s.customerEmail}</a>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-display text-[1.5rem] leading-none tabular-nums text-ink">{formatPrice(s.pricePerDelivery)}</span>
                    <span className="mt-1 block text-[0.72rem] text-ink-faint">per levering</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill {...st} />
                  <span className="text-[0.85rem] text-ink-muted">{details.join(' · ')}</span>
                </div>
                {s.nextDeliveryDate && <p className="mt-2 text-[0.85rem] text-ink-muted">Volgende levering: {formatDay(s.nextDeliveryDate)}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {s.status === 'active' && <button type="button" onClick={() => handleAction(s.id, 'pause')} className={cls.secondary}><Ph name="pause" size={16} /> Pauzeren</button>}
                  {s.status === 'paused' && <button type="button" onClick={() => handleAction(s.id, 'resume')} className={cls.secondary}><Ph name="play" size={16} /> Hervatten</button>}
                  {s.status !== 'cancelled' && <button type="button" onClick={() => handleAction(s.id, 'cancel')} className={cls.danger}><Ph name="x" size={16} /> Stoppen</button>}
                  <button type="button" onClick={() => deleteSub(s.id)} className={`${cls.iconBtn} ml-auto hover:!text-red-600`} title="Verwijderen" aria-label="Abonnement verwijderen"><Ph name="trash" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ============================================================
// Instellingen
// ============================================================
type DeliveryZone = { id?: number; name: string; cost: string; sortOrder: number };
type ShopSettings = { checkout_enabled?: string; shipping_enabled: string; shipping_cost: string; free_shipping_from: string; notify_email: string; announcement?: string; opening_hours?: string; effectiveNotifyEmail?: string | null };
type DayHours = { open: string; close: string } | null;
const DAGEN = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

function parseHours(raw?: string): DayHours[] {
  try {
    const days = JSON.parse(raw || '');
    if (Array.isArray(days) && days.length === 7) return days;
  } catch {}
  return [null, ...Array(4).fill({ open: '09:00', close: '17:00' }), { open: '09:00', close: '12:30' }, null];
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className={`${cls.card} mb-5 p-5 sm:p-8`}>
      <h2 className="font-display text-[1.75rem] leading-tight text-ink">{title}</h2>
      {sub && <p className="mt-1 text-sm text-ink-muted">{sub}</p>}
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  );
}

function WebsiteSettings({ settings, showToast }: { settings: ShopSettings; showToast: (m: string) => void }) {
  const [announcement, setAnnouncement] = useState(settings.announcement || '');
  const [hours, setHours] = useState<DayHours[]>(() => parseHours(settings.opening_hours));
  const [saving, setSaving] = useState(false);

  const setDay = (i: number, value: DayHours) => setHours((prev) => prev.map((h, j) => (j === i ? value : h)));

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement: announcement.trim(), opening_hours: JSON.stringify(hours) }),
    });
    if (res.ok) showToast('Opgeslagen, staat direct op de website');
    else {
      const { error } = await res.json().catch(() => ({ error: 'Opslaan mislukt' }));
      alert(error || 'Opslaan mislukt');
    }
    setSaving(false);
  };

  return (
    <Section title="Winkel & website" sub="Wat je hier opslaat, staat direct op de website.">
      <div>
        <label className={cls.label}>Mededeling bovenaan de website</label>
        <textarea value={announcement} maxLength={200} rows={2} placeholder="Bijv. Rond kerst zijn we gesloten van 25 t/m 27 december"
          onChange={(e) => setAnnouncement(e.target.value)} className={`${cls.input} resize-none`} />
        <p className={cls.hint}>Verschijnt als balk boven het menu op elke pagina. Leeg laten betekent geen balk. {announcement.length}/200</p>
      </div>

      <div>
        <p className={cls.label}>Openingstijden</p>
        <div className="divide-y divide-line rounded-xl border border-line">
          {hours.map((h, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="w-24 text-[0.95rem] text-ink">{DAGEN[i]}</span>
              <Toggle on={!!h} onChange={() => setDay(i, h ? null : { open: '09:00', close: '17:00' })} label={h ? 'Open' : 'Gesloten'} />
              {h && (
                <div className="flex items-center gap-2 sm:ml-auto">
                  <input type="time" value={h.open} onChange={(e) => setDay(i, { ...h, open: e.target.value })} className={`${cls.input} w-[7.5rem] px-3 py-2`} aria-label={`${DAGEN[i]} open vanaf`} />
                  <span className="text-sm text-ink-faint">tot</span>
                  <input type="time" value={h.close} onChange={(e) => setDay(i, { ...h, close: e.target.value })} className={`${cls.input} w-[7.5rem] px-3 py-2`} aria-label={`${DAGEN[i]} open tot`} />
                </div>
              )}
            </div>
          ))}
        </div>
        <p className={cls.hint}>Staan op de winkelpagina en onderaan elke pagina, en worden aan Google doorgegeven.</p>
      </div>

      <button type="button" onClick={save} disabled={saving} className={`${cls.primary} w-full sm:w-auto`}>{saving ? 'Opslaan...' : 'Opslaan'}</button>
    </Section>
  );
}

function SettingsTab({ showToast }: { showToast: (m: string) => void }) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [settings, setSettings] = useState<ShopSettings>({ shipping_enabled: 'false', shipping_cost: '6.95', free_shipping_from: '75.00', notify_email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/delivery-zones').then((r) => r.json()).then((data) => setZones(data)),
      fetch('/api/admin/settings').then((r) => r.json()).then((data) => setSettings(data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveShopSettings = async () => {
    setSavingSettings(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkout_enabled: settings.checkout_enabled === 'true' ? 'true' : 'false',
        shipping_enabled: settings.shipping_enabled === 'true' ? 'true' : 'false',
        shipping_cost: settings.shipping_cost,
        free_shipping_from: settings.free_shipping_from,
        notify_email: settings.notify_email,
      }),
    });
    if (res.ok) showToast('Instellingen opgeslagen');
    else {
      const { error } = await res.json().catch(() => ({ error: 'Opslaan mislukt' }));
      alert(error || 'Opslaan mislukt');
    }
    setSavingSettings(false);
  };

  const updateZone = (index: number, key: keyof DeliveryZone, value: any) => {
    setZones((prev) => prev.map((z, i) => i === index ? { ...z, [key]: value } : z));
  };
  const addZone = () => setZones((prev) => [...prev, { name: '', cost: '0.00', sortOrder: prev.length }]);
  const removeZone = (index: number) => setZones((prev) => prev.filter((_, i) => i !== index));

  const saveZones = async () => {
    setSaving(true);
    const res = await fetch('/api/admin/delivery-zones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zones.map((z, i) => ({ ...z, sortOrder: i }))),
    });
    if (res.ok) showToast('Bezorgtarieven opgeslagen');
    setSaving(false);
  };

  if (loading) return <Spinner />;

  const shippingOn = settings.shipping_enabled === 'true';
  const checkoutOn = settings.checkout_enabled === 'true';

  return (
    <>
      <PageHeader title="Instellingen" subtitle="Openingstijden, mededeling, bezorging en meldingen" />

      <WebsiteSettings settings={settings} showToast={showToast} />

      <Section title="Bezorgtarieven" sub="Plaatsen waar je bezorgt en wat dat kost.">
        {zones.length === 0 ? (
          <p className="text-sm text-ink-muted">Nog geen bezorgplaatsen. Voeg er een toe.</p>
        ) : (
          <div className="space-y-2">
            {zones.map((zone, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={zone.name} onChange={(e) => updateZone(i, 'name', e.target.value)} placeholder="Plaats, bijv. Middelburg" className={`${cls.input} min-w-0 flex-1`} aria-label="Plaats" />
                <div className="relative w-28 shrink-0">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-faint">€</span>
                  <input type="number" step="0.50" min="0" value={zone.cost} onChange={(e) => updateZone(i, 'cost', e.target.value)} className={`${cls.input} pl-8`} aria-label="Bezorgkosten" />
                </div>
                <button type="button" onClick={() => removeZone(i)} className={`${cls.iconBtn} hover:!text-red-600`} title="Verwijderen" aria-label="Plaats verwijderen"><Ph name="trash" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveZones} disabled={saving} className={cls.primary}>{saving ? 'Opslaan...' : 'Tarieven opslaan'}</button>
          <button type="button" onClick={addZone} className={cls.secondary}><Ph name="plus" size={18} /> Plaats toevoegen</button>
        </div>
      </Section>

      <Section title="Verzending & meldingen">
        <Toggle on={checkoutOn} onChange={() => setSettings({ ...settings, checkout_enabled: checkoutOn ? 'false' : 'true' })}
          label={checkoutOn ? 'Online afrekenen staat aan' : 'Online afrekenen staat uit'}
          sub="Uit betekent dat klanten via WhatsApp bestellen. Zet het pas aan als je Mollie-account gekoppeld is." />

        <Toggle on={shippingOn} onChange={() => setSettings({ ...settings, shipping_enabled: shippingOn ? 'false' : 'true' })}
          label={shippingOn ? 'Verzenden per post staat aan' : 'Verzenden per post staat uit'}
          sub="Uit betekent dat klanten alleen kunnen ophalen of lokaal laten bezorgen. De webshop past zijn teksten hierop aan." />

        <div className={`grid gap-5 sm:grid-cols-2 ${shippingOn ? '' : 'pointer-events-none opacity-40'}`}>
          <div>
            <label className={cls.label}>Verzendkosten pakket</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-faint">€</span>
              <input type="number" step="0.05" min="0" value={settings.shipping_cost} onChange={(e) => setSettings({ ...settings, shipping_cost: e.target.value })} className={`${cls.input} pl-8`} />
            </div>
          </div>
          <div>
            <label className={cls.label}>Gratis verzending vanaf</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-faint">€</span>
              <input type="number" step="1" min="0" value={settings.free_shipping_from} placeholder="Leeg is nooit gratis" onChange={(e) => setSettings({ ...settings, free_shipping_from: e.target.value })} className={`${cls.input} pl-8`} />
            </div>
          </div>
        </div>

        <div>
          <label className={cls.label}>E-mailadres voor nieuwe bestellingen en abonnementen</label>
          <input type="email" value={settings.notify_email} placeholder={settings.effectiveNotifyEmail || 'info@celinesbloemen.nl'} onChange={(e) => setSettings({ ...settings, notify_email: e.target.value })} className={cls.input} />
          <p className={cls.hint}>Hier komt een seintje binnen bij elke betaalde bestelling, elk nieuw abonnement en elke incasso. Leeg laten betekent het standaardadres{settings.effectiveNotifyEmail ? ` (${settings.effectiveNotifyEmail})` : ''}.</p>
        </div>

        <button type="button" onClick={saveShopSettings} disabled={savingSettings} className={`${cls.primary} w-full sm:w-auto`}>{savingSettings ? 'Opslaan...' : 'Instellingen opslaan'}</button>
      </Section>
    </>
  );
}
