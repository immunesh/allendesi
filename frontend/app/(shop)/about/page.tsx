import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, HeartHandshake, Home, Search, ShieldCheck, ShoppingBag, Sparkles, Store } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Allendesi | Your Everyday Marketplace',
  description: 'Discover Allendesi, a marketplace for fashion, home, beauty, food, wellness, and more.',
};

const CATEGORIES = [
  { name: 'Fashion Clothing', slug: 'fashion-clothing', icon: ShoppingBag },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', icon: Sparkles },
  { name: 'Home & Kitchen', slug: 'home-kitchen', icon: Home },
  { name: 'Wellness', slug: 'wellness', icon: HeartHandshake },
];

const PILLARS = [
  { icon: Search, title: 'Find what you need', description: 'Explore products from a range of marketplace categories in one place.' },
  { icon: ShieldCheck, title: 'Shop with clarity', description: 'Review product details, prices, ratings, and seller information before you buy.' },
  { icon: Store, title: 'Support sellers', description: 'Discover independent businesses and products listed by Allendesi sellers.' },
];

export default function AboutPage() {
  return (
    <div>
      <section className="relative isolate min-h-[360px] overflow-hidden bg-[#0b0b0b] sm:min-h-[420px]">
        <Image
          src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1600&q=85"
          alt="A welcoming neighborhood shop"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/65 to-black/15" />
        <div className="container-custom flex min-h-[360px] items-center py-14 sm:min-h-[420px]">
          <div className="max-w-2xl text-white">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">About Allendesi</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">A marketplace for everyday discoveries.</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75">Allendesi brings shoppers and sellers together across fashion, beauty, home, food, wellness, and more.</p>
            <Link href="/products" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500">
              Explore the marketplace <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="why-allendesi" className="container-custom py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-400">Why Allendesi</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">One place to browse, compare, and shop.</h2>
          </div>
          <p className="max-w-2xl text-base leading-relaxed text-white/65">We make it easier to discover products across a growing range of categories. Browse the catalog, compare product details, save favourites, and manage orders from your account.</p>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#101010] py-10 sm:py-14">
        <div className="container-custom">
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-400">Shop by category</p>
            <h2 className="mt-2 text-2xl font-bold">A little of everything.</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIES.map(({ name, slug, icon: Icon }) => (
              <Link key={slug} href={`/products?category=${slug}`} className="group flex min-h-32 flex-col justify-between border border-white/10 bg-[#151515] p-4 transition-colors hover:border-red-500/60">
                <Icon className="h-5 w-5 text-red-400" aria-hidden="true" />
                <span className="mt-6 text-sm font-semibold text-white">{name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-custom py-12 sm:py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="border-t-2 border-red-500 py-5">
              <Icon className="h-6 w-6 text-red-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#101010] py-10 sm:py-14">
        <div className="container-custom flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-400">For sellers</p>
            <h2 className="mt-2 text-2xl font-bold">Bring your business to Allendesi.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">List products, manage orders, and follow sales from your seller account.</p>
          </div>
          <Link href="/seller/register" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-white/20 px-5 text-sm font-semibold text-white transition-colors hover:border-red-400 hover:text-red-300">
            Start Selling <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
