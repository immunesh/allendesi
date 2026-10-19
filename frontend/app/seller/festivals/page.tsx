'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { festivalsApi, uploadFestivalImage } from '@/lib/festival-api';
import { formatDate, formatPrice } from '@/lib/utils';
import { ImagePlus, Plus, Trash2 } from 'lucide-react';

type Festival = Record<string, any>;
type Assignment = Record<string, any>;
const initialForm = { productId: '', name: '', description: '', basePrice: '', stock: '', festivalPrice: '', discountPercent: '', promotionalDescription: '', images: [] as string[] };
const messageOf = (error: any) => error?.response?.data?.message || 'Unable to update festival products.';

export default function SellerFestivalsPage() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [products, setProducts] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [form, setForm] = useState(initialForm);
  const [selectedFestival, setSelectedFestival] = useState('');
  const [newProduct, setNewProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [festivalResult, assignmentsResult, productsResult, statsResult] = await Promise.all([
        festivalsApi.sellerAvailable(), festivalsApi.sellerMine(), api.get('/products/seller'), festivalsApi.sellerStats(),
      ]);
      const available = festivalResult.data.data || [];
      setFestivals(available); setAssignments(assignmentsResult.data.data || []); setProducts(productsResult.data.data || []);
      setSelectedFestival((current) => current || available.find((item: Festival) => item.acceptingProducts)?.id || '');
      setStats(statsResult.data.data || {});
    } catch (error) { setMessage(messageOf(error)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const upload = async (file?: File) => {
    if (!file) return;
    try { const url = await uploadFestivalImage(file); setForm((current) => ({ ...current, images: [...current.images, url] })); }
    catch (error) { setMessage(messageOf(error)); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedFestival) return;
    setSaving(true); setMessage('');
    try {
      await festivalsApi.addProduct(selectedFestival, {
        ...form,
        productId: newProduct ? undefined : form.productId,
        basePrice: form.basePrice ? Number(form.basePrice) : undefined,
        stock: form.stock ? Number(form.stock) : undefined,
        festivalPrice: form.festivalPrice ? Number(form.festivalPrice) : null,
        discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
      });
      setForm(initialForm); await load();
    } catch (error) { setMessage(messageOf(error)); }
    finally { setSaving(false); }
  };
  const remove = async (assignment: Assignment) => {
    if (!window.confirm(`Remove ${assignment.product.name} from ${assignment.festival.name}? The original product will remain in your catalog.`)) return;
    try { await festivalsApi.removeProduct(assignment.id); await load(); }
    catch (error) { setMessage(messageOf(error)); }
  };
  const changeAssignment = async (assignment: Assignment, field: string, value: string) => {
    try {
      const updated = await festivalsApi.updateProduct(assignment.id, { [field]: value === '' ? null : Number(value) });
      setAssignments((current) => current.map((item) => item.id === assignment.id ? { ...item, ...updated.data.data } : item));
    } catch (error) { setMessage(messageOf(error)); }
  };

  const selected = festivals.find((festival) => festival.id === selectedFestival);
  const activeAssignments = assignments.filter((item) => item.festival.isActive && new Date(item.festival.endsAt) >= new Date());
  const pendingCount = assignments.filter((item) => item.status === 'PENDING_APPROVAL').length;

  return <div className="mx-auto max-w-6xl text-white">
    <div className="mb-8 border-b border-red-950/60 pb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">Seller workspace</p><h1 className="mt-2 text-3xl font-bold">Festival listings</h1><p className="mt-2 max-w-2xl text-sm text-gray-400">Join open seasonal collections. Your original products stay in your catalog when a festival listing is removed.</p></div>
    {message && <div role="status" className="mb-5 border border-red-900/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">{message}</div>}
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"><div className="border border-white/10 bg-[#101010] p-4"><div className="text-2xl font-semibold">{stats.assignments ?? assignments.length}</div><div className="text-xs text-gray-500">Your festival listings</div></div><div className="border border-white/10 bg-[#101010] p-4"><div className="text-2xl font-semibold">{stats.pending ?? pendingCount}</div><div className="text-xs text-gray-500">Awaiting approval</div></div><div className="border border-white/10 bg-[#101010] p-4"><div className="text-2xl font-semibold">{stats.active ?? activeAssignments.length}</div><div className="text-xs text-gray-500">In active collections</div></div><div className="border border-white/10 bg-[#101010] p-4"><div className="text-2xl font-semibold">{formatPrice(stats.sales || 0)}</div><div className="text-xs text-gray-500">Festival sales</div></div><div className="border border-white/10 bg-[#101010] p-4"><div className="text-2xl font-semibold">{stats.orders || 0}</div><div className="text-xs text-gray-500">Festival orders</div></div></div>

    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Open festivals</h2><span className="text-xs text-gray-500">Active and upcoming</span></div>
        {loading ? <div className="border border-white/10 p-8 text-center text-gray-400">Loading festivals…</div> : festivals.length === 0 ? <div className="border border-dashed border-white/15 p-8 text-center"><p className="font-medium">No festivals are accepting listings</p><p className="mt-2 text-sm text-gray-500">Check back when the next collection opens.</p></div> : <div className="divide-y divide-white/10 border-y border-white/10">{festivals.map((festival) => <div key={festival.id} className="grid gap-4 py-5 sm:grid-cols-[120px_1fr_auto] sm:items-center">
          <div className="aspect-[4/3] overflow-hidden bg-[#171717]">{(festival.thumbnail || festival.bannerImage) ? <img src={festival.thumbnail || festival.bannerImage} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-red-400">Festivals</div>}</div>
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{festival.name}</h3><span className={`text-[10px] uppercase ${festival.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-300'}`}>{festival.status}</span></div><p className="mt-1 line-clamp-2 text-sm text-gray-400">{festival.description || 'Explore products for this seasonal collection.'}</p><p className="mt-2 text-xs text-gray-500">{formatDate(festival.startsAt)} – {formatDate(festival.endsAt)} · {festival.products?.length || 0} of your listings</p><Link href={`/festivals/${festival.slug}`} className="mt-2 inline-block text-xs text-red-400 hover:text-red-300">View customer page</Link></div>
          {festival.acceptingProducts && <button onClick={() => { setSelectedFestival(festival.id); document.getElementById('festival-product-form')?.scrollIntoView({ behavior: 'smooth' }); }} className="inline-flex items-center justify-center gap-1 rounded-sm bg-red-700 px-3 py-2 text-xs font-semibold hover:bg-red-600"><Plus size={14} /> Add product</button>}
        </div>)}</div>}
      </section>

      <section id="festival-product-form" className="h-fit border border-white/10 bg-[#101010] p-5"><h2 className="text-xl font-semibold">Add festival product</h2><p className="mt-1 text-sm text-gray-500">Choose an owned product or create one without a standard category.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-xs text-gray-400">Festival<select required disabled={!festivals.some((festival) => festival.acceptingProducts)} value={selectedFestival} onChange={(e) => setSelectedFestival(e.target.value)} className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"><option value="">{festivals.some((festival) => festival.acceptingProducts) ? 'Select a festival' : 'No festivals accepting products'}</option>{festivals.filter((festival) => festival.acceptingProducts).map((festival) => <option key={festival.id} value={festival.id}>{festival.name} · {festival.status}</option>)}</select>{!festivals.some((festival) => festival.acceptingProducts) && <span className="mt-2 block text-xs leading-5 text-amber-300">There are no active or upcoming festivals yet. Ask an admin to create and activate one in Manage Festivals; it will appear here automatically.</span>}</label>
          <div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="radio" checked={!newProduct} onChange={() => setNewProduct(false)} className="accent-red-600" /> Existing product</label><label className="flex items-center gap-2"><input type="radio" checked={newProduct} onChange={() => setNewProduct(true)} className="accent-red-600" /> New product</label></div>
          {!newProduct ? <label className="block text-xs text-gray-400">Your product<select required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white"><option value="">Choose product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label> : <><label className="block text-xs text-gray-400">Product name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white" /></label><label className="block text-xs text-gray-400">Description<textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white" /></label><label className="block text-xs text-gray-400">Original price<input required type="number" min="0.01" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white" /></label></>}
          <div className="grid grid-cols-2 gap-3"><label className="block text-xs text-gray-400">Festival price<input type="number" min="0.01" step="0.01" value={form.festivalPrice} onChange={(e) => setForm({ ...form, festivalPrice: e.target.value })} placeholder="Optional" className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white" /></label><label className="block text-xs text-gray-400">Discount %<input type="number" min="0.01" max="90" step="0.1" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} placeholder="Optional" className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white" /></label></div>
          <label className="block text-xs text-gray-400">Festival stock limit<input type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="Uses product inventory when blank" className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white" /></label>
          <label className="block text-xs text-gray-400">Promotional description<textarea rows={2} value={form.promotionalDescription} onChange={(e) => setForm({ ...form, promotionalDescription: e.target.value })} className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white" /></label>
          {newProduct && <div><label className="block text-xs text-gray-400">Product stock<input required type="number" min="0" step="1" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-1 w-full border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white" /></label><label className="mt-3 flex cursor-pointer items-center gap-2 border border-white/10 px-3 py-2 text-xs text-gray-300"><ImagePlus size={15} /> Upload product image<input type="file" accept="image/*" onChange={(e) => void upload(e.target.files?.[0])} className="sr-only" /></label>{form.images.length > 0 && <p className="mt-1 text-xs text-emerald-400">{form.images.length} image uploaded</p>}</div>}
          <button type="submit" disabled={saving || !selected?.acceptingProducts} className="w-full rounded-sm bg-red-700 px-4 py-3 text-sm font-semibold hover:bg-red-600 disabled:opacity-50">{saving ? 'Submitting…' : 'Submit festival product'}</button>
          {selected?.approvalEnabled && <p className="text-xs text-gray-500">This festival requires admin approval before your listing is visible.</p>}
        </form>
      </section>
    </div>

    <section className="mt-12"><h2 className="mb-4 text-xl font-semibold">Your festival products</h2>{assignments.length === 0 ? <div className="border border-dashed border-white/15 p-8 text-center"><p className="font-medium">No festival products yet</p><p className="mt-2 text-sm text-gray-500">Choose an open festival and add an existing or new product.</p><button onClick={() => document.getElementById('festival-product-form')?.scrollIntoView({ behavior: 'smooth' })} className="mt-4 inline-flex items-center gap-2 text-sm text-red-400"><Plus size={15} /> Add festival product</button></div> : <div className="overflow-x-auto border border-white/10"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Product / festival</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Festival offer</th><th className="px-4 py-3">Inventory</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-white/5">{assignments.map((item) => <tr key={item.id}><td className="px-4 py-4"><div className="font-medium">{item.product.name}</div><div className="mt-1 text-xs text-gray-500">{item.festival.name}</div></td><td className="px-4 py-4 text-xs">{item.status.replaceAll('_', ' ')}</td><td className="px-4 py-4"><div>{item.festivalPrice ? formatPrice(item.festivalPrice) : item.discountPercent ? `${item.discountPercent}% off` : 'No offer'}</div><input aria-label="Festival price" type="number" min="0" step="0.01" placeholder="Festival price" defaultValue={item.festivalPrice || ''} onBlur={(e) => { if (String(item.festivalPrice || '') !== e.target.value) void changeAssignment(item, 'festivalPrice', e.target.value); }} className="mt-1 w-28 border border-white/10 bg-[#080808] px-2 py-1 text-xs" /></td><td className="px-4 py-4 text-gray-300">{item.stock ?? item.product.stock} units</td><td className="px-4 py-4 text-right"><button title="Remove festival assignment" onClick={() => void remove(item)} className="border border-red-950 p-2 text-red-400 hover:bg-red-950/50"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}</section>
  </div>;
}