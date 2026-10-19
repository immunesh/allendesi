'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Sparkles } from 'lucide-react';
import { festivalsApi } from '@/lib/festival-api';
import { formatDate } from '@/lib/utils';

type Festival = Record<string, any>;

export default function FestivalsPage() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    festivalsApi.publicList().then(({ data }) => setFestivals(data.data || []))
      .catch(() => setError('Festival collections are unavailable right now.'))
      .finally(() => setLoading(false));
  }, []);

  return <div className="min-h-screen bg-[#090909] text-white">
    <section className="relative border-b border-red-950/60 bg-[#111]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-400"><Sparkles size={15} /> Allendesi celebrations</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">Shop the season.<br /><span className="text-red-500">Find your festival.</span></h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400">Discover independent collections curated by Allendesi sellers for the moments worth celebrating.</p>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-red-900 via-red-500 to-amber-400" />
    </section>
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-6 flex items-end justify-between"><div><h2 className="text-2xl font-semibold">Festival collections</h2><p className="mt-1 text-sm text-gray-500">Published events, updated by our marketplace team.</p></div><span className="text-xs text-gray-500">{festivals.length} collections</span></div>
      {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((value) => <div key={value} className="aspect-[4/3] animate-pulse bg-[#171717]" />)}</div> : error ? <p role="alert" className="border border-red-900/50 p-6 text-sm text-red-200">{error}</p> : festivals.length === 0 ? <div className="border border-dashed border-white/15 py-16 text-center"><Sparkles className="mx-auto text-red-500" /><h3 className="mt-4 text-lg font-semibold">New celebrations are on the way</h3><p className="mt-2 text-sm text-gray-500">There are no published festival collections at the moment.</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{festivals.map((festival) => <Link key={festival.id} href={`/festivals/${festival.slug}`} className="group block overflow-hidden border border-white/10 bg-[#111] transition-colors hover:border-red-700/70">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#1a1111]">{(festival.thumbnail || festival.bannerImage) ? <img src={festival.thumbnail || festival.bannerImage} alt={festival.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-red-950 to-[#171717]"><Sparkles size={34} className="text-red-400" /></div>}<span className="absolute bottom-3 left-3 bg-black/75 px-2.5 py-1 text-xs text-white">{festival.status === 'UPCOMING' ? 'Coming soon' : 'Now celebrating'}</span></div>
        <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-xl font-semibold group-hover:text-red-300">{festival.name}</h3><ArrowRight size={18} className="mt-1 shrink-0 text-red-400 transition-transform group-hover:translate-x-1" /></div><p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-gray-400">{festival.description || 'Explore a collection made for the occasion.'}</p><div className="mt-4 flex items-center gap-2 text-xs text-gray-500"><CalendarDays size={14} />{formatDate(festival.startsAt)} – {formatDate(festival.endsAt)}</div></div>
      </Link>)}</div>}
    </section>
  </div>;
}