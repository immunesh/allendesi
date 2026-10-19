'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { festivalsApi } from '@/lib/festival-api';
import { Product } from '@/types';
import { formatDate } from '@/lib/utils';

type Festival = Record<string, any>;

export default function FestivalCollectionPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const searchParams = useSearchParams();
  const preview = searchParams.get('preview') === '1';
  const [festival, setFestival] = useState<Festival | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('relevant');
  const [visible, setVisible] = useState(12);

  useEffect(() => {
    if (!slug) return;
    (preview ? festivalsApi.preview(slug) : festivalsApi.publicBySlug(slug)).then(({ data }) => setFestival(data.data))
      .catch((err) => setError(err?.response?.data?.message || 'This festival could not be found.'))
      .finally(() => setLoading(false));
  }, [slug, preview]);

  const products = useMemo(() => {
    const values: Product[] = (festival?.products || []).map((product: any) => {
      const price = product.festivalListing?.price ?? (product.festivalListing?.discountPercent ? product.basePrice * (1 - product.festivalListing.discountPercent / 100) : null);
      return { ...product, salePrice: price && price < product.basePrice ? price : product.salePrice };
    }).filter((product: Product) => product.stock > 0 && product.isActive);
    const query = search.trim().toLowerCase();
    const filtered = query ? values.filter((product) => `${product.name} ${product.description} ${product.tags || ''}`.toLowerCase().includes(query)) : values;
    return [...filtered].sort((a, b) => sort === 'price-asc' ? (a.salePrice ?? a.basePrice) - (b.salePrice ?? b.basePrice) : sort === 'price-desc' ? (b.salePrice ?? b.basePrice) - (a.salePrice ?? a.basePrice) : sort === 'popular' ? b.reviewCount - a.reviewCount : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [festival, search, sort]);

  if (loading) return <div className="min-h-screen bg-[#090909] p-8 text-center text-gray-400">Loading festival collection…</div>;
  if (error || !festival) return <div className="min-h-[60vh] bg-[#090909] px-5 py-20 text-center text-white"><Sparkles className="mx-auto text-red-500" /><h1 className="mt-4 text-2xl font-semibold">Festival unavailable</h1><p className="mt-2 text-sm text-gray-400">{error || 'This festival is not currently published.'}</p></div>;

  return <div className="min-h-screen bg-[#090909] text-white">
    {preview && <div className="border-b border-amber-700/40 bg-amber-950/50 px-4 py-2 text-center text-xs font-semibold text-amber-200">Admin preview · this festival is not necessarily visible to customers</div>}
    <section className="relative min-h-[300px] overflow-hidden border-b border-red-950/60 bg-[#111] sm:min-h-[390px]">
      {(festival.pageBanner || festival.bannerImage) && <img src={festival.pageBanner || festival.bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/25" />
      <div className="relative mx-auto flex min-h-[300px] max-w-7xl flex-col justify-end px-5 py-10 sm:min-h-[390px] sm:px-8 sm:py-14"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-300"><Sparkles size={15} /> Festival collection</p><h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{festival.pageTitle || festival.name}</h1>{festival.promotionalText && <p className="mt-3 max-w-2xl text-lg text-white/90">{festival.promotionalText}</p>}<p className="mt-4 max-w-2xl text-sm leading-6 text-gray-300">{festival.description}</p><p className="mt-4 text-xs text-gray-300">{formatDate(festival.startsAt)} – {formatDate(festival.endsAt)}</p></div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold">Shop the collection</h2><p className="mt-1 text-sm text-gray-500">{products.length} available products</p></div><div className="flex w-full flex-wrap gap-2 sm:w-auto"><label className="flex min-w-48 flex-1 items-center gap-2 border border-white/10 bg-[#111] px-3 sm:flex-initial"><Search size={16} className="text-gray-500" /><input value={search} onChange={(e) => { setSearch(e.target.value); setVisible(12); }} placeholder="Search this collection" className="w-full bg-transparent py-2.5 text-sm outline-none" /></label><label className="flex items-center gap-2 border border-white/10 bg-[#111] px-3"><SlidersHorizontal size={15} className="text-gray-500" /><select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent py-2.5 text-sm outline-none"><option value="relevant">Newest</option><option value="popular">Popularity</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label></div></div>
      {products.length === 0 ? <div className="border border-dashed border-white/15 py-16 text-center"><p className="text-lg font-semibold">No products found</p><p className="mt-2 text-sm text-gray-500">Try another search, or check back as sellers add to this collection.</p></div> : <><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">{products.slice(0, visible).map((product) => <ProductCard key={product.id} product={product} promoLabel="Festival offer" />)}</div>{visible < products.length && <div className="mt-8 text-center"><button onClick={() => setVisible((count) => count + 12)} className="border border-red-800 px-6 py-3 text-sm font-semibold text-red-300 hover:bg-red-950/40">Load more</button></div>}</>}
    </section>
  </div>;
}