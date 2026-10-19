'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { festivalsApi, uploadFestivalImage } from '@/lib/festival-api';
import { formatDate } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, Eye, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

type Festival = Record<string, any>;
type FestivalForm = {
  name: string; slug: string; description: string; bannerImage: string; thumbnail: string; startsAt: string; endsAt: string;
  pageTitle: string; promotionalText: string; pageBanner: string; isFeatured: boolean; isActive: boolean; isPublished: boolean; approvalEnabled: boolean;
};
const blankForm: FestivalForm = {
  name: '', slug: '', description: '', bannerImage: '', thumbnail: '', startsAt: '', endsAt: '', pageTitle: '', promotionalText: '', pageBanner: '',
  isFeatured: false, isActive: true, isPublished: false, approvalEnabled: true,
};
const localDate = (date?: string) => date ? new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
const errorText = (error: any) => error?.response?.data?.message || 'Could not complete this festival action.';

export default function AdminFestivalsPage() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [form, setForm] = useState<FestivalForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [sort, setSort] = useState('date');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, metrics] = await Promise.all([festivalsApi.adminList({ page, limit: 10, search, status }), festivalsApi.adminStats()]);
      const values = list.data.data || [];
      setFestivals(sort === 'name' ? [...values].sort((a, b) => a.name.localeCompare(b.name)) : values);
      setPages(list.data.pagination?.pages || 1);
      setStats(metrics.data.data || {});
    } catch (error) { setMessage(errorText(error)); }
    finally { setLoading(false); }
  }, [page, search, status, sort]);

  useEffect(() => { void load(); }, [load]);

  const startCreate = () => { setEditingId(null); setForm(blankForm); setMessage(''); setOpen(true); };
  const startEdit = (festival: Festival) => {
    setEditingId(festival.id);
    setForm({ ...blankForm, ...festival, startsAt: localDate(festival.startsAt), endsAt: localDate(festival.endsAt), thumbnail: festival.thumbnail || '' });
    setMessage(''); setOpen(true);
  };
  const upload = async (field: 'bannerImage' | 'thumbnail' | 'pageBanner', file?: File) => {
    if (!file) return;
    try { setForm((value) => ({ ...value, [field]: 'Uploading...' })); const url = await uploadFestivalImage(file); setForm((value) => ({ ...value, [field]: url })); }
    catch (error) { setMessage(errorText(error)); setForm((value) => ({ ...value, [field]: '' })); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      const data = { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() };
      if (editingId) await festivalsApi.update(editingId, data); else await festivalsApi.create(data);
      setOpen(false); await load();
    } catch (error) { setMessage(errorText(error)); }
    finally { setSaving(false); }
  };
  const remove = async (festival: Festival) => {
    if (!window.confirm(`Delete ${festival.name}? Its festival assignments will be removed, but the products will remain.`)) return;
    try { await festivalsApi.remove(festival.id); await load(); }
    catch (error) { setMessage(errorText(error)); }
  };
  const review = async (assignmentId: string, nextStatus: string) => {
    try { await festivalsApi.review(assignmentId, nextStatus); await load(); }
    catch (error) { setMessage(errorText(error)); }
  };

  return <div className="min-h-full bg-[#090909] px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">Seasonal marketplace</p><h1 className="mt-2 text-3xl font-bold">Manage Festivals</h1><p className="mt-2 max-w-2xl text-sm text-gray-400">Build festival collections, control visibility, and review seller submissions.</p></div>
        <button onClick={startCreate} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2.5 text-sm font-semibold hover:bg-red-500"><Plus size={17} /> New festival</button>
      </div>

      {message && <div role="status" className="mb-5 rounded-md border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">{message}</div>}
      <div className="mb-7 grid grid-cols-2 gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-4 xl:grid-cols-7">
        {[['Total festivals', stats.total], ['Active now', stats.active], ['Upcoming', stats.upcoming], ['Product listings', stats.assignments], ['Needs review', stats.pending], ['Festival sales', `₹${Number(stats.sales || 0).toLocaleString('en-IN')}`], ['Festival orders', stats.orders]].map(([label, value]) => <div key={String(label)} className="bg-[#111] px-4 py-4"><div className="text-2xl font-semibold">{value ?? '—'}</div><div className="mt-1 text-xs text-gray-400">{label}</div></div>)}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="flex min-w-56 flex-1 items-center gap-2 border border-white/10 bg-[#111] px-3"><Search size={16} className="text-gray-500" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search festivals" className="w-full bg-transparent py-2.5 text-sm outline-none" /></label>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-white/10 bg-[#111] px-3 py-2 text-sm"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="UPCOMING">Upcoming</option><option value="INACTIVE">Inactive</option></select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="border border-white/10 bg-[#111] px-3 py-2 text-sm"><option value="date">Sort: event date</option><option value="name">Sort: name</option></select>
      </div>

      <div className="overflow-x-auto border border-white/10 bg-[#101010]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Festival</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Listings / sellers</th><th className="px-4 py-3">Visibility</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {loading ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading festivals…</td></tr> : festivals.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No festivals match these filters.</td></tr> : festivals.map((festival) => {
              const sellers = Array.from(new Set((festival.products || []).map((item: Festival) => `${item.seller.firstName} ${item.seller.lastName}`)));
              return <tr key={festival.id} className="align-top">
                <td className="px-4 py-4"><div className="font-semibold">{festival.name}</div><div className="mt-1 text-xs text-gray-500">/festivals/{festival.slug} · {festival.status}</div>{festival.isFeatured && <span className="mt-2 inline-block text-[11px] text-amber-300">Homepage featured</span>}</td>
                <td className="px-4 py-4 text-gray-300">{formatDate(festival.startsAt)} – {formatDate(festival.endsAt)}</td>
                <td className="px-4 py-4"><div>{festival._count?.products ?? festival.products?.length ?? 0} products</div><div className="mt-1 max-w-56 truncate text-xs text-gray-500">{sellers.length ? sellers.join(', ') : 'No seller submissions'}</div></td>
                <td className="px-4 py-4"><div className={festival.isPublished ? 'text-emerald-400' : 'text-gray-500'}>{festival.isPublished ? 'Published' : 'Draft'}</div><div className="mt-1 text-xs text-gray-500">{festival.isActive ? 'Active' : 'Inactive'}</div></td>
                <td className="px-4 py-4"><div className="flex justify-end gap-2"><Link title="Preview festival" href={`/festivals/${festival.slug}?preview=1`} className="border border-white/10 p-2 text-gray-300 hover:text-white"><Eye size={15} /></Link><button title="Edit festival" onClick={() => startEdit(festival)} className="border border-white/10 p-2 text-gray-300 hover:text-white"><Pencil size={15} /></button><button title="Delete festival" onClick={() => void remove(festival)} className="border border-red-950 p-2 text-red-400 hover:bg-red-950/40"><Trash2 size={15} /></button></div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-3 text-sm text-gray-400"><span>Page {page} of {pages}</span><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)} className="border border-white/10 p-2 disabled:opacity-30"><ChevronLeft size={16} /></button><button aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)} className="border border-white/10 p-2 disabled:opacity-30"><ChevronRight size={16} /></button></div>

      <section className="mt-10"><h2 className="mb-4 text-xl font-semibold">Product submissions</h2><div className="space-y-3">{festivals.flatMap((festival) => (festival.products || []).map((item: Festival) => ({ ...item, festivalName: festival.name }))).map((item: Festival) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 border border-white/10 bg-[#101010] p-4"><div><div className="font-medium">{item.product.name}</div><div className="mt-1 text-xs text-gray-500">{item.festivalName} · {item.seller.firstName} {item.seller.lastName} · {item.status.replaceAll('_', ' ')}</div></div><div className="flex gap-2">{item.status !== 'APPROVED' && <button onClick={() => void review(item.id, 'APPROVED')} className="inline-flex items-center gap-1 rounded-sm bg-emerald-700 px-3 py-2 text-xs font-semibold hover:bg-emerald-600"><Check size={14} /> Approve / publish</button>}{item.status === 'APPROVED' && <button onClick={() => void review(item.id, 'UNPUBLISHED')} className="rounded-sm border border-white/15 px-3 py-2 text-xs hover:bg-white/5">Unpublish</button>}{item.status !== 'REJECTED' && <button onClick={() => void review(item.id, 'REJECTED')} className="rounded-sm border border-red-900 px-3 py-2 text-xs text-red-300 hover:bg-red-950/50">Reject</button>}</div></div>)}</div></section>
    </div>

    {open && <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}><form onSubmit={save} className="my-8 w-full max-w-3xl border border-white/15 bg-[#111] p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-semibold">{editingId ? 'Edit festival' : 'Create festival'}</h2><p className="mt-1 text-sm text-gray-500">Festival collections are independent of product categories.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-2 text-gray-400 hover:text-white"><X size={18} /></button></div>
      {message && <p role="alert" className="mb-4 text-sm text-red-300">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {([['name', 'Festival name'], ['slug', 'URL slug'], ['startsAt', 'Start date'], ['endsAt', 'End date'], ['pageTitle', 'Page title'], ['promotionalText', 'Promotional text']] as const).map(([key, label]) => <label key={key} className="text-xs text-gray-400">{label}<input required={key === 'name' || key === 'startsAt' || key === 'endsAt'} type={key === 'startsAt' || key === 'endsAt' ? 'datetime-local' : 'text'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 w-full border border-white/10 bg-[#090909] px-3 py-2.5 text-sm text-white outline-none focus:border-red-500" /></label>)}
        <label className="text-xs text-gray-400 sm:col-span-2">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full border border-white/10 bg-[#090909] px-3 py-2.5 text-sm text-white outline-none focus:border-red-500" /></label>
        {([['bannerImage', 'Festival banner'], ['thumbnail', 'Thumbnail image'], ['pageBanner', 'Page banner']] as const).map(([key, label]) => <label key={key} className="text-xs text-gray-400">{label}<span className="mt-1 flex items-center gap-2 border border-white/10 bg-[#090909] px-3 py-2"><ImagePlus size={15} /><input type="file" accept="image/*" onChange={(e) => void upload(key, e.target.files?.[0])} className="min-w-0 text-xs" /></span><input aria-label={`${label} URL`} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder="Image URL" className="mt-1 w-full border border-white/10 bg-[#090909] px-3 py-2 text-xs" /></label>)}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{([['isActive', 'Festival active'], ['isPublished', 'Visible to customers'], ['isFeatured', 'Feature on homepage'], ['approvalEnabled', 'Require product approval']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="accent-red-600" />{label}</label>)}</div>
      <div className="mt-7 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="border border-white/15 px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-sm bg-red-600 px-5 py-2 text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save festival' : 'Create festival'}</button></div>
    </form></div>}
  </div>;
}