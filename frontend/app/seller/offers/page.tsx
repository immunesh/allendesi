'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Check, Loader2, Pencil, Plus, Power, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore, useUIStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

type Product = { id: string; name: string; basePrice: number; salePrice?: number | null };
type Offer = {
  id: string;
  productId: string;
  product: Product;
  discountPercent: number | null;
  salePrice: number | null;
  startsAt: string;
  endsAt: string;
  status: string;
  displayStatus: string;
  rejectionReason?: string | null;
  unitsSold?: number;
  revenue?: number;
};

type OfferForm = {
  productId: string;
  pricingMode: 'PERCENTAGE' | 'SALE_PRICE';
  value: string;
  startsAt: string;
  endsAt: string;
};

const emptyForm = (): OfferForm => ({ productId: '', pricingMode: 'PERCENTAGE', value: '', startsAt: '', endsAt: '' });
const localDateTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const statusStyle: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-300',
  SCHEDULED: 'bg-blue-500/15 text-blue-300',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-300',
  EXPIRED: 'bg-white/10 text-gray-400',
  REJECTED: 'bg-red-500/15 text-red-300',
  SUSPENDED: 'bg-orange-500/15 text-orange-300',
  WITHDRAWN: 'bg-white/10 text-gray-400',
};

export default function SellerOffersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productError, setProductError] = useState('');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, pending: 0, expired: 0, unitsSold: 0, revenue: 0 });
  const [form, setForm] = useState<OfferForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const { showToast } = useUIStore();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const selectedProduct = products.find((product) => product.id === form.productId);
  const calculatedPrice = useMemo(() => {
    if (!selectedProduct || !form.value) return null;
    const value = Number(form.value);
    if (!Number.isFinite(value)) return null;
    return form.pricingMode === 'PERCENTAGE'
      ? Math.round(selectedProduct.basePrice * (1 - value / 100) * 100) / 100
      : value;
  }, [form, selectedProduct]);
  const calculatedPercent = selectedProduct && calculatedPrice != null && selectedProduct.basePrice > 0
    ? Math.round((1 - calculatedPrice / selectedProduct.basePrice) * 10000) / 100
    : null;

  const loadData = async () => {
    setLoading(true);
    setProductError('');
    try {
      const [productResult, offerResult, summaryResult] = await Promise.allSettled([
        api.get('/products/seller'),
        api.get('/offers/seller'),
        api.get('/offers/seller/summary'),
      ]);
      if (productResult.status === 'fulfilled') {
        const sellerProducts = productResult.value.data?.data;
        setProducts(Array.isArray(sellerProducts) ? sellerProducts : []);
      } else {
        setProducts([]);
        const message = productResult.reason?.response?.data?.message || 'Could not load your products';
        setProductError(message);
        showToast(message, 'error');
      }
      if (offerResult.status === 'fulfilled') {
        setOffers(offerResult.value.data?.data || []);
      } else {
        showToast(offerResult.reason?.response?.data?.message || 'Could not load offers', 'error');
      }
      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value.data?.data || { total: 0, active: 0, pending: 0, expired: 0, unitsSold: 0, revenue: 0 });
      } else {
        showToast(summaryResult.reason?.response?.data?.message || 'Could not load offer statistics', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const refreshOnFocus = () => { void loadData(); };
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [currentUserId]);

  const resetForm = () => { setForm(emptyForm()); setEditingId(null); };

  const startEdit = (offer: Offer) => {
    setEditingId(offer.id);
    setForm({
      productId: offer.productId,
      pricingMode: offer.discountPercent != null ? 'PERCENTAGE' : 'SALE_PRICE',
      value: String(offer.discountPercent ?? offer.salePrice ?? ''),
      startsAt: localDateTime(offer.startsAt),
      endsAt: localDateTime(offer.endsAt),
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProduct || calculatedPrice == null || calculatedPrice < 0 || calculatedPrice >= selectedProduct.basePrice) {
      showToast('Sale price must be non-negative and below the original price', 'error');
      return;
    }
    if (!form.startsAt || !form.endsAt || new Date(form.endsAt) <= new Date(form.startsAt)) {
      showToast('Offer end date must be later than its start date', 'error');
      return;
    }
    const payload = {
      productId: form.productId,
      discountPercent: form.pricingMode === 'PERCENTAGE' ? Number(form.value) : null,
      salePrice: form.pricingMode === 'SALE_PRICE' ? Number(form.value) : calculatedPrice,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
    };
    setSaving(true);
    try {
      if (editingId) await api.put(`/offers/seller/${editingId}`, payload);
      else await api.post('/offers/seller', payload);
      showToast(editingId ? 'Offer updated' : 'Offer submitted');
      resetForm();
      await loadData();
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not save offer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (offer: Offer) => {
    const action = offer.status === 'APPROVED' ? 'withdraw' : 'reactivate';
    if (!window.confirm(`Do you want to ${action} this offer?`)) return;
    setActionId(offer.id);
    try {
      await api.patch(`/offers/seller/${offer.id}/toggle`);
      await loadData();
      showToast(action === 'withdraw' ? 'Offer withdrawn' : 'Offer reactivation submitted');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not update offer', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (offer: Offer) => {
    if (!window.confirm(`Delete the offer for ${offer.product.name}?`)) return;
    setActionId(offer.id);
    try {
      await api.delete(`/offers/seller/${offer.id}`);
      await loadData();
      showToast('Offer deleted');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not delete offer', 'error');
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading offers...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-400">Seller workspace</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Offers & Discounts</h1>
          <p className="mt-1 text-sm text-gray-400">Create scheduled offers for products in your store.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadData()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/15 px-3 text-sm text-white hover:border-red-400"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button onClick={resetForm} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500"><Plus className="h-4 w-4" />Create Offer</button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          ['Offers', summary.total], ['Active', summary.active], ['Pending', summary.pending], ['Expired', summary.expired],
          ['Units sold', summary.unitsSold], ['Offer revenue', formatPrice(summary.revenue)],
        ].map(([label, value]) => <div key={label} className="border border-white/10 bg-[#101010] p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 text-xl font-semibold text-white">{value}</p></div>)}
      </section>

      <form onSubmit={handleSubmit} className="grid gap-4 border border-white/10 bg-[#101010] p-5 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="mb-1 block text-xs text-gray-400">Product</label>
          <select required value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="input-field">
            <option value="">{productError || (products.length ? 'Choose your product' : 'No products found. Add a product first.')}</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatPrice(product.basePrice)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Set offer by</label>
          <select value={form.pricingMode} onChange={(event) => setForm({ ...form, pricingMode: event.target.value as OfferForm['pricingMode'], value: '' })} className="input-field">
            <option value="PERCENTAGE">Discount %</option><option value="SALE_PRICE">Sale price</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">{form.pricingMode === 'PERCENTAGE' ? 'Discount %' : 'Sale price'}</label>
          <input required type="number" min="0" step="0.01" max={form.pricingMode === 'PERCENTAGE' ? 100 : undefined} value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} className="input-field" />
          <p className="mt-1 text-xs text-gray-500">Calculated sale price: {calculatedPrice == null ? '—' : formatPrice(calculatedPrice)}</p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Starts</label>
          <input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="input-field" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Ends</label>
          <input required type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="input-field" />
        </div>
        {selectedProduct && calculatedPercent != null && <p className="text-xs text-gray-400 sm:col-span-2 lg:col-span-6">Original price {formatPrice(selectedProduct.basePrice)} · Discount {calculatedPercent}% · Final price {formatPrice(calculatedPrice || 0)}</p>}
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button disabled={saving || products.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{editingId ? 'Save Offer' : 'Submit Offer'}</button>
          {editingId && <button type="button" onClick={resetForm} className="min-h-10 border border-white/15 px-4 text-sm text-white">Cancel</button>}
        </div>
      </form>

      <section className="overflow-x-auto border border-white/10 bg-[#101010]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="p-4">Product</th><th className="p-4">Original</th><th className="p-4">Offer price</th><th className="p-4">Discount</th><th className="p-4">Dates</th><th className="p-4">Status</th><th className="p-4">Performance</th><th className="p-4">Actions</th></tr></thead>
          <tbody>
            {offers.map((offer) => {
              const salePrice = offer.salePrice ?? offer.product.basePrice;
              const discountPercent = offer.discountPercent ?? Math.round((1 - salePrice / offer.product.basePrice) * 100);
              return <tr key={offer.id} className="border-b border-white/5 align-top text-gray-300">
                <td className="p-4 font-medium text-white">{offer.product.name}{offer.rejectionReason && <p className="mt-1 max-w-64 text-xs text-red-300">Reason: {offer.rejectionReason}</p>}</td>
                <td className="p-4">{formatPrice(offer.product.basePrice)}</td>
                <td className="p-4 font-semibold text-white">{formatPrice(salePrice)}</td>
                <td className="p-4 text-red-300">{discountPercent}%</td>
                <td className="p-4 text-xs">{new Date(offer.startsAt).toLocaleString()}<br />to {new Date(offer.endsAt).toLocaleString()}</td>
                <td className="p-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${statusStyle[offer.displayStatus] || statusStyle[offer.status] || statusStyle.EXPIRED}`}><CalendarDays className="h-3 w-3" />{offer.displayStatus.replace('_', ' ')}</span></td>
                <td className="p-4">{offer.unitsSold || 0} units<br /><span className="text-xs text-gray-500">{formatPrice(offer.revenue || 0)}</span></td>
                <td className="p-4"><div className="flex gap-2">
                  <button title="Edit offer" onClick={() => startEdit(offer)} className="p-1.5 text-gray-400 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  {(offer.status === 'APPROVED' || offer.status === 'WITHDRAWN') && <button title={offer.status === 'APPROVED' ? 'Withdraw offer' : 'Request reactivation'} disabled={actionId === offer.id} onClick={() => void handleToggle(offer)} className="p-1.5 text-gray-400 hover:text-amber-300"><Power className="h-4 w-4" /></button>}
                  <button title="Delete offer" disabled={actionId === offer.id} onClick={() => void handleDelete(offer)} className="p-1.5 text-gray-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>;
            })}
            {offers.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-gray-500"><AlertCircle className="mx-auto mb-2 h-5 w-5" />No offers yet. Create an offer for one of your products.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
