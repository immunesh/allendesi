'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { BadgePercent, Check, Loader2, Pause, Pencil, Play, Plus, RefreshCw, ShieldCheck, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useUIStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils';

type Tab = 'ALL' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'REJECTED' | 'CAMPAIGNS' | 'COUPONS';
type ProductOption = { id: string; name: string; basePrice: number };
type CategoryOption = { id: string; name: string };
type Offer = {
  id: string; status: string; displayStatus: string; rejectionReason?: string | null;
  discountPercent: number | null; salePrice: number | null; startsAt: string; endsAt: string;
  product: { id: string; name: string; basePrice: number; salePrice?: number | null; category?: { name: string } };
  seller: { id: string; firstName: string; lastName: string; email: string };
};
type Campaign = {
  id: string; name: string; description?: string | null; type: string; value: number;
  minOrder?: number | null; maxDiscount?: number | null; usageLimit?: number | null;
  usedCount: number; perUserLimit?: number | null; startsAt: string; endsAt: string;
  stackingAllowed: boolean; isActive: boolean; displayStatus: string;
  products: Array<{ productId: string; product: { id: string; name: string } }>;
  categories: Array<{ categoryId: string; category: { id: string; name: string } }>;
};
type CampaignForm = {
  name: string; description: string; type: 'PERCENTAGE' | 'FIXED'; value: string;
  minOrder: string; maxDiscount: string; startsAt: string; endsAt: string;
  usageLimit: string; perUserLimit: string; stackingAllowed: boolean; isActive: boolean;
  productIds: string[]; categoryIds: string[];
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'ALL', label: 'All Offers' },
  { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { id: 'ACTIVE', label: 'Active Offers' },
  { id: 'SCHEDULED', label: 'Scheduled Offers' },
  { id: 'EXPIRED', label: 'Expired Offers' },
  { id: 'REJECTED', label: 'Rejected Offers' },
  { id: 'CAMPAIGNS', label: 'Marketplace Campaigns' },
  { id: 'COUPONS', label: 'Coupon Management' },
];

const emptyCampaign = (): CampaignForm => ({
  name: '', description: '', type: 'PERCENTAGE', value: '', minOrder: '', maxDiscount: '',
  startsAt: '', endsAt: '', usageLimit: '', perUserLimit: '', stackingAllowed: false,
  isActive: false, productIds: [], categoryIds: [],
});

const localDateTime = (value: string) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const badgeStyle: Record<string, string> = {
  ACTIVE: 'bg-green-500/15 text-green-300', SCHEDULED: 'bg-blue-500/15 text-blue-300',
  PENDING_APPROVAL: 'bg-amber-500/15 text-amber-300', EXPIRED: 'bg-white/10 text-gray-400',
  REJECTED: 'bg-red-500/15 text-red-300', SUSPENDED: 'bg-orange-500/15 text-orange-300',
  PAUSED: 'bg-white/10 text-gray-400',
};

export default function AdminOffersPage() {
  const [tab, setTab] = useState<Tab>('ALL');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [policy, setPolicy] = useState({ sellerOffersRequireApproval: true, maximumSellerDiscount: 90 });
  const [form, setForm] = useState<CampaignForm>(emptyCampaign());
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const { showToast } = useUIStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const [offerResponse, campaignResponse, productResponse, categoryResponse, couponResponse, summaryResponse, policyResponse] = await Promise.all([
        api.get('/offers/admin'), api.get('/campaigns'), api.get('/products'), api.get('/categories'),
        api.get('/coupons'), api.get('/offers/admin/summary'), api.get('/offers/admin/policy'),
      ]);
      setOffers(offerResponse.data.data || []);
      setCampaigns(campaignResponse.data.data || []);
      setProducts(productResponse.data.data || []);
      setCategories(categoryResponse.data.data || []);
      setCoupons(couponResponse.data.data || []);
      setSummary(summaryResponse.data.data || {});
      setPolicy(policyResponse.data.data || { sellerOffersRequireApproval: true, maximumSellerDiscount: 90 });
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not load offer management data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const visibleOffers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return offers.filter((offer) => {
      const matchesTab = tab === 'ALL' || offer.displayStatus === tab;
      const matchesSearch = !query || [offer.product.name, offer.seller.email, offer.seller.firstName, offer.seller.lastName].join(' ').toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }, [offers, search, tab]);

  const reviewOffer = async (offer: Offer, action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE') => {
    let reason = '';
    if (action === 'REJECT') {
      reason = window.prompt('Enter a rejection reason for the seller:')?.trim() || '';
      if (!reason) return;
    } else if (action === 'SUSPEND' && !window.confirm(`Suspend the offer for ${offer.product.name}?`)) return;
    setActionId(offer.id);
    try {
      await api.patch(`/offers/admin/${offer.id}/review`, { action, reason });
      await loadData();
      showToast(action === 'REJECT' ? 'Offer rejected with reason' : `Offer ${action.toLowerCase()}d`);
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not update offer', 'error');
    } finally {
      setActionId(null);
    }
  };

  const deleteOffer = async (offer: Offer) => {
    if (!window.confirm(`Remove the offer for ${offer.product.name}?`)) return;
    setActionId(offer.id);
    try {
      await api.delete(`/offers/admin/${offer.id}`);
      await loadData();
      showToast('Offer removed');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not remove offer', 'error');
    } finally {
      setActionId(null);
    }
  };

  const savePolicy = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api.put('/offers/admin/policy', policy);
      showToast('Offer policy saved');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not save policy', 'error');
    }
  };

  const editCampaign = (campaign: Campaign) => {
    setEditingCampaignId(campaign.id);
    setForm({
      name: campaign.name, description: campaign.description || '', type: campaign.type as CampaignForm['type'],
      value: String(campaign.value), minOrder: campaign.minOrder == null ? '' : String(campaign.minOrder),
      maxDiscount: campaign.maxDiscount == null ? '' : String(campaign.maxDiscount),
      startsAt: localDateTime(campaign.startsAt), endsAt: localDateTime(campaign.endsAt),
      usageLimit: campaign.usageLimit == null ? '' : String(campaign.usageLimit),
      perUserLimit: campaign.perUserLimit == null ? '' : String(campaign.perUserLimit),
      stackingAllowed: campaign.stackingAllowed, isActive: campaign.isActive,
      productIds: campaign.products.map((entry) => entry.productId),
      categoryIds: campaign.categories.map((entry) => entry.categoryId),
    });
  };

  const saveCampaign = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form, value: Number(form.value), minOrder: form.minOrder ? Number(form.minOrder) : null,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
        startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(),
      };
      if (editingCampaignId) await api.put(`/campaigns/${editingCampaignId}`, payload);
      else await api.post('/campaigns', payload);
      setForm(emptyCampaign());
      setEditingCampaignId(null);
      await loadData();
      showToast(editingCampaignId ? 'Campaign updated' : 'Campaign created');
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not save campaign', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (campaign: Campaign) => {
    setActionId(campaign.id);
    try {
      await api.patch(`/campaigns/${campaign.id}/toggle`);
      await loadData();
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not update campaign', 'error');
    } finally {
      setActionId(null);
    }
  };

  const deleteCampaign = async (campaign: Campaign) => {
    if (!window.confirm(`Delete campaign ${campaign.name}?`)) return;
    setActionId(campaign.id);
    try {
      await api.delete(`/campaigns/${campaign.id}`);
      await loadData();
    } catch (error: any) {
      showToast(error?.response?.data?.message || 'Could not delete campaign', 'error');
    } finally {
      setActionId(null);
    }
  };

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading offers and promotions...</div>;

  return (
    <div className="space-y-6 p-4 text-white sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-red-400">Marketplace controls</p><h1 className="mt-2 text-2xl font-bold">Offers & Promotions</h1><p className="mt-1 text-sm text-gray-400">Review seller offers, manage campaigns, and monitor usage.</p></div>
        <button onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 border border-white/15 px-3 text-sm text-white hover:border-red-400"><RefreshCw className="h-4 w-4" />Refresh</button>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {[
          ['All offers', summary.totalOffers || 0], ['Pending', summary.pendingApprovals || 0], ['Active offers', summary.activeOffers || 0],
          ['Campaigns', summary.activeCampaigns || 0], ['Coupon uses', summary.couponUses || 0], ['Discounts granted', formatPrice(summary.totalDiscountsGranted || 0)],
        ].map(([label, value]) => <div key={label} className="border border-white/10 bg-[#101010] p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>)}
      </section>

      <div className="flex gap-2 overflow-x-auto border-b border-white/10 pb-2">
        {TABS.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 border-b-2 px-3 py-2 text-sm ${tab === item.id ? 'border-red-500 text-red-300' : 'border-transparent text-gray-400 hover:text-white'}`}>{item.label}</button>)}
      </div>

      {tab === 'CAMPAIGNS' ? (
        <div className="space-y-5">
          <form onSubmit={saveCampaign} className="grid gap-4 border border-white/10 bg-[#101010] p-5 md:grid-cols-2 xl:grid-cols-4">
            <h2 className="text-lg font-semibold md:col-span-2 xl:col-span-4">{editingCampaignId ? 'Edit campaign' : 'Create marketplace campaign'}</h2>
            <input required placeholder="Campaign name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="input-field" />
            <input placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input-field" />
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CampaignForm['type'] })} className="input-field"><option value="PERCENTAGE">Percentage discount</option><option value="FIXED">Fixed discount</option></select>
            <input required type="number" min="0.01" step="0.01" max={form.type === 'PERCENTAGE' ? 100 : undefined} placeholder="Discount value" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} className="input-field" />
            <input type="number" min="0" step="0.01" placeholder="Minimum order" value={form.minOrder} onChange={(event) => setForm({ ...form, minOrder: event.target.value })} className="input-field" />
            <input type="number" min="0" step="0.01" placeholder="Maximum discount" value={form.maxDiscount} onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })} className="input-field" />
            <input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="input-field" />
            <input required type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="input-field" />
            <input type="number" min="1" step="1" placeholder="Campaign usage limit" value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} className="input-field" />
            <input type="number" min="1" step="1" placeholder="Limit per customer" value={form.perUserLimit} onChange={(event) => setForm({ ...form, perUserLimit: event.target.value })} className="input-field" />
            <label className="block text-xs text-gray-400">Eligible products <span className="text-gray-600">(leave empty for all)</span><select multiple value={form.productIds} onChange={(event) => setForm({ ...form, productIds: Array.from(event.target.selectedOptions, (option) => option.value) })} className="input-field mt-1 h-28">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
            <label className="block text-xs text-gray-400">Eligible categories <span className="text-gray-600">(leave empty for all)</span><select multiple value={form.categoryIds} onChange={(event) => setForm({ ...form, categoryIds: Array.from(event.target.selectedOptions, (option) => option.value) })} className="input-field mt-1 h-28">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <div className="flex flex-wrap gap-5 md:col-span-2 xl:col-span-4">
              <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.stackingAllowed} onChange={(event) => setForm({ ...form, stackingAllowed: event.target.checked })} />Allow discount stacking</label>
              <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />Active</label>
            </div>
            <div className="flex gap-2 md:col-span-2 xl:col-span-4">
              <button disabled={saving} className="inline-flex min-h-10 items-center gap-2 bg-red-600 px-4 text-sm font-semibold disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{editingCampaignId ? 'Save Campaign' : 'Create Campaign'}</button>
              {editingCampaignId && <button type="button" onClick={() => { setEditingCampaignId(null); setForm(emptyCampaign()); }} className="min-h-10 border border-white/15 px-4 text-sm">Cancel</button>}
            </div>
          </form>

          <div className="overflow-x-auto border border-white/10 bg-[#101010]"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="p-4">Campaign</th><th className="p-4">Discount</th><th className="p-4">Eligibility</th><th className="p-4">Dates</th><th className="p-4">Usage</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>
            {campaigns.map((campaign) => <tr key={campaign.id} className="border-b border-white/5 text-gray-300"><td className="p-4 font-medium text-white">{campaign.name}</td><td className="p-4">{campaign.type === 'PERCENTAGE' ? `${campaign.value}%` : formatPrice(campaign.value)}{campaign.maxDiscount != null && <span className="block text-xs text-gray-500">Max {formatPrice(campaign.maxDiscount)}</span>}</td><td className="p-4">{campaign.products.length + campaign.categories.length === 0 ? 'All eligible products' : `${campaign.products.length} products · ${campaign.categories.length} categories`}</td><td className="p-4 text-xs">{new Date(campaign.startsAt).toLocaleString()}<br />to {new Date(campaign.endsAt).toLocaleString()}</td><td className="p-4">{campaign.usedCount}{campaign.usageLimit ? ` / ${campaign.usageLimit}` : ''}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs ${badgeStyle[campaign.displayStatus] || badgeStyle.PAUSED}`}>{campaign.displayStatus}</span></td><td className="p-4"><div className="flex gap-2"><button title="Edit campaign" onClick={() => editCampaign(campaign)} className="p-1.5 text-gray-400 hover:text-white"><Pencil className="h-4 w-4" /></button><button title={campaign.isActive ? 'Pause' : 'Activate'} disabled={actionId === campaign.id} onClick={() => void toggleCampaign(campaign)} className="p-1.5 text-gray-400 hover:text-amber-300">{campaign.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button><button title="Delete campaign" disabled={actionId === campaign.id} onClick={() => void deleteCampaign(campaign)} className="p-1.5 text-gray-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}
            {campaigns.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">No marketplace campaigns yet.</td></tr>}
          </tbody></table></div>
        </div>
      ) : tab === 'COUPONS' ? (
        <section className="border border-white/10 bg-[#101010] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold">Coupon codes</h2><p className="mt-1 text-sm text-gray-400">Create codes, set validity and usage limits, and review usage.</p></div><Link href="/admin/coupons" className="inline-flex min-h-10 items-center gap-2 bg-red-600 px-4 text-sm font-semibold">Open Coupon Management <BadgePercent className="h-4 w-4" /></Link></div>
          <p className="mt-5 text-sm text-gray-400">{coupons.length} codes · {summary.couponUses || 0} recorded uses</p>
        </section>
      ) : (
        <div className="space-y-5">
          {tab === 'ALL' && <form onSubmit={savePolicy} className="flex flex-wrap items-end gap-4 border border-white/10 bg-[#101010] p-4">
            <label className="flex items-center gap-2 text-sm text-gray-300"><input type="checkbox" checked={policy.sellerOffersRequireApproval} onChange={(event) => setPolicy({ ...policy, sellerOffersRequireApproval: event.target.checked })} />Require approval for seller offers</label>
            <label className="text-xs text-gray-400">Maximum seller discount %<input type="number" min="1" max="100" value={policy.maximumSellerDiscount} onChange={(event) => setPolicy({ ...policy, maximumSellerDiscount: Number(event.target.value) })} className="input-field mt-1 w-36" /></label>
            <button className="min-h-10 border border-white/15 px-4 text-sm hover:border-red-400">Save Policy</button>
          </form>}
          <div className="flex flex-wrap items-center gap-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or seller" className="input-field max-w-sm" /><span className="text-xs text-gray-500">{visibleOffers.length} offers</span></div>
          <div className="overflow-x-auto border border-white/10 bg-[#101010]"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase text-gray-500"><tr><th className="p-4">Product / Seller</th><th className="p-4">Original</th><th className="p-4">Sale</th><th className="p-4">Discount</th><th className="p-4">Dates</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>
            {visibleOffers.map((offer) => <tr key={offer.id} className="border-b border-white/5 align-top text-gray-300"><td className="p-4"><p className="font-medium text-white">{offer.product.name}</p><p className="mt-1 text-xs text-gray-500">{offer.seller.firstName} {offer.seller.lastName} · {offer.seller.email}</p>{offer.rejectionReason && <p className="mt-1 text-xs text-red-300">Reason: {offer.rejectionReason}</p>}</td><td className="p-4">{formatPrice(offer.product.basePrice)}</td><td className="p-4 font-semibold text-white">{formatPrice(offer.salePrice ?? offer.product.basePrice)}</td><td className="p-4 text-red-300">{offer.discountPercent ?? Math.round((1 - (offer.salePrice ?? offer.product.basePrice) / offer.product.basePrice) * 100)}%</td><td className="p-4 text-xs">{new Date(offer.startsAt).toLocaleString()}<br />to {new Date(offer.endsAt).toLocaleString()}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs ${badgeStyle[offer.displayStatus] || badgeStyle.EXPIRED}`}>{offer.displayStatus.replace('_', ' ')}</span></td><td className="p-4"><div className="flex flex-wrap gap-2">{offer.status === 'PENDING_APPROVAL' && <><button disabled={actionId === offer.id} onClick={() => void reviewOffer(offer, 'APPROVE')} className="inline-flex items-center gap-1 bg-green-700 px-2.5 py-1.5 text-xs font-semibold"><Check className="h-3 w-3" />Approve</button><button disabled={actionId === offer.id} onClick={() => void reviewOffer(offer, 'REJECT')} className="inline-flex items-center gap-1 border border-red-500/40 px-2.5 py-1.5 text-xs text-red-300"><X className="h-3 w-3" />Reject</button></>}{offer.status === 'APPROVED' && <button disabled={actionId === offer.id} onClick={() => void reviewOffer(offer, 'SUSPEND')} className="px-2.5 py-1.5 text-xs text-amber-300">Suspend</button>}{offer.status === 'SUSPENDED' && <button disabled={actionId === offer.id} onClick={() => void reviewOffer(offer, 'REACTIVATE')} className="px-2.5 py-1.5 text-xs text-green-300">Reactivate</button>}<button title="Remove offer" disabled={actionId === offer.id} onClick={() => void deleteOffer(offer)} className="p-1.5 text-gray-500 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}
            {visibleOffers.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">No offers in this view.</td></tr>}
          </tbody></table></div>
          <p className="flex items-start gap-2 text-xs text-gray-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Offer status is calculated from approval state and server time. Only approved, currently valid offers affect customer pricing.</p>
        </div>
      )}
    </div>
  );
}
