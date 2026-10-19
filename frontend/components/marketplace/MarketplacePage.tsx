'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgePercent, Gift, Home, Lamp, Shirt, ShoppingBag, Sparkles, Tag, Gem, Plug, PackageOpen } from 'lucide-react';
import ProductCarousel from '@/components/marketplace/ProductCarousel';
import { productsApi } from '@/lib/api';
import { formatPrice, getDiscountPercent } from '@/lib/utils';
import { Product } from '@/types';

type MarketSection = 'easy-picks' | 'best-bargains' | 'offers' | 'deals' | 'festival-store' | 'indian-fashion';

const FESTIVAL_CATEGORIES = [
  { label: 'Diwali decorations', slug: 'diwali-decorations', keywords: ['diwali', 'decoration', 'decor', 'lamp', 'rangoli'], icon: Lamp },
  { label: 'Gifts', slug: 'gifts', keywords: ['gift', 'hamper'], icon: Gift },
  { label: 'Clothing', slug: 'festive-clothing', keywords: ['clothing', 'ethnic wear', 'saree', 'kurta', 'apparel'], icon: Shirt },
  { label: 'Electronics', slug: 'electronics', keywords: ['electronics', 'electronic', 'phone', 'device'], icon: Plug },
  { label: 'Home decor', slug: 'home-decor', keywords: ['home decor', 'home furnishing', 'interior'], icon: Home },
  { label: 'Festive essentials', slug: 'festive-essentials', keywords: ['festive', 'puja', 'pooja', 'essential'], icon: Sparkles },
];

const FASHION_CATEGORIES = [
  { label: 'Ethnic wear', slug: 'ethnic-wear', keywords: ['ethnic', 'traditional wear'], icon: Shirt },
  { label: 'Kurtas', slug: 'kurtas', keywords: ['kurta', 'kurti'], icon: Shirt },
  { label: 'Sarees', slug: 'sarees', keywords: ['saree', 'sari'], icon: Sparkles },
  { label: 'Footwear', slug: 'footwear', keywords: ['footwear', 'shoe', 'sandal'], icon: ShoppingBag },
  { label: 'Accessories', slug: 'accessories', keywords: ['accessory', 'accessories'], icon: Gem },
  { label: 'Traditional jewelry', slug: 'traditional-jewelry', keywords: ['jewelry', 'jewellery', 'necklace', 'earring'], icon: Gem },
];

const SECTION_COPY: Record<MarketSection, { title: string; eyebrow: string; description: string }> = {
  'easy-picks': { title: 'Easy Picks', eyebrow: 'A good place to start', description: 'Shop customer favourites and standout finds from the live Allendesi catalog.' },
  'best-bargains': { title: 'Best Bargains', eyebrow: 'Worth a closer look', description: 'Real markdowns from Allendesi sellers, ordered by the biggest savings.' },
  offers: { title: 'Offers worth opening', eyebrow: 'Offers', description: 'Browse products with live sale prices. The price and saving shown come directly from the catalog.' },
  deals: { title: 'Today’s best deals', eyebrow: 'Deals', description: 'Discover marked-down products across the store, with prices updated from the live catalog.' },
  'festival-store': { title: 'Make room for celebration', eyebrow: 'Festival Store', description: 'Browse festive categories and shop products that are actually available in the Allendesi catalog.' },
  'indian-fashion': { title: 'Indian Fashion', eyebrow: 'The occasion edit', description: 'Explore traditional style categories and discover matching pieces from the live catalog.' },
};

const isDiscounted = (product: Product) => product.salePrice != null && product.salePrice < product.basePrice;

function getSearchableText(product: Product) {
  return [product.name, product.description, product.brand, product.category?.name, product.category?.slug, ...(product.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function MarketplacePage({ section }: { section: MarketSection }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const copy = SECTION_COPY[section];
  const categories = section === 'festival-store' ? FESTIVAL_CATEGORIES : section === 'indian-fashion' ? FASHION_CATEGORIES : [];

  useEffect(() => {
    let mounted = true;
    productsApi.getAll()
      .then((response) => {
        const list = response?.data?.data;
        if (mounted) setProducts(Array.isArray(list) ? list.filter((product: Product) => product.isActive !== false) : []);
      })
      .catch((error) => {
        console.error('Marketplace products error:', error);
        if (mounted) setProducts([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const sectionProducts = useMemo(() => {
    if (section === 'best-bargains' || section === 'offers' || section === 'deals') {
      return products.filter(isDiscounted).sort((a, b) => getDiscountPercent(b.basePrice, b.salePrice ?? b.basePrice) - getDiscountPercent(a.basePrice, a.salePrice ?? a.basePrice));
    }
    if (section === 'festival-store') {
      const keywords = FESTIVAL_CATEGORIES.flatMap((category) => category.keywords);
      return products.filter((product) => keywords.some((keyword) => getSearchableText(product).includes(keyword)));
    }
    if (section === 'indian-fashion') {
      const keywords = FASHION_CATEGORIES.flatMap((category) => category.keywords);
      return products.filter((product) => keywords.some((keyword) => getSearchableText(product).includes(keyword)));
    }
    const featured = products.filter((product) => product.isFeatured || product.isBestSeller);
    return (featured.length ? featured : products).sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  }, [products, section]);

  const featuredDeal = sectionProducts[0];
  const emptyMessage = section === 'festival-store' || section === 'indian-fashion'
    ? 'We don’t have products in these categories yet. Browse the full catalog to see what is available.'
    : section === 'easy-picks'
      ? 'There are no products to show right now. Please check back soon.'
      : 'There are no active sale prices to show right now. Please check back soon.';

  return (
    <div className="min-h-screen bg-[#090909] pb-14 text-white">
      <section className={`relative overflow-hidden border-b border-white/10 ${section === 'festival-store' ? 'bg-[#24100b]' : section === 'indian-fashion' ? 'bg-[#18100f]' : 'bg-[#111111]'}`}>
        <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-l from-red-950/50 to-transparent md:block" aria-hidden="true" />
        <div className="container-custom relative grid min-h-[280px] items-center gap-8 py-10 md:grid-cols-[1fr_auto] md:py-14">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-red-400"><Tag className="h-4 w-4" aria-hidden="true" />{copy.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{copy.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">{copy.description}</p>
            <Link href={section === 'easy-picks' ? '/products?collection=featured' : section === 'best-bargains' || section === 'offers' || section === 'deals' ? '/products?collection=sale' : '/products'} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-red-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500">
              {section === 'best-bargains' ? 'Shop Bargains' : section === 'festival-store' || section === 'indian-fashion' ? 'Shop Now' : 'Explore Products'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="hidden h-28 w-28 items-center justify-center rounded-full border border-red-400/25 bg-red-500/10 text-red-300 md:flex" aria-hidden="true">
            {section === 'festival-store' ? <Gift className="h-12 w-12" /> : section === 'indian-fashion' ? <Gem className="h-12 w-12" /> : section === 'easy-picks' ? <Sparkles className="h-12 w-12" /> : <BadgePercent className="h-12 w-12" />}
          </div>
        </div>
      </section>

      {section === 'offers' && (
        <section className="border-b border-red-950 bg-red-950/25 py-5">
          <div className="container-custom flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><BadgePercent className="h-6 w-6 text-red-400" /><p className="text-sm font-semibold text-white">Sale prices, clearly marked.</p></div>
            <p className="text-xs text-white/60">Every discount below is calculated from the listed original and selling prices.</p>
          </div>
        </section>
      )}

      {section === 'deals' && featuredDeal && (
        <section className="border-b border-white/10 bg-[#121212] py-5">
          <div className="container-custom flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-wider text-red-400">Biggest listed saving</p><p className="mt-1 text-lg font-semibold">{featuredDeal.name} <span className="text-red-400">{getDiscountPercent(featuredDeal.basePrice, featuredDeal.salePrice ?? featuredDeal.basePrice)}% off</span></p></div>
            <Link href={`/products/${featuredDeal.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-red-400 hover:text-red-300">See deal <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="container-custom py-9 sm:py-11">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><h2 className="text-2xl font-bold">Browse by category</h2><p className="mt-1 text-sm text-white/55">Choose a category to see matching products in the catalog.</p></div>
            <Link href="/products" className="hidden items-center gap-1 text-sm font-semibold text-red-400 hover:text-red-300 sm:inline-flex">All products <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map(({ label, slug, icon: Icon }) => (
              <Link key={slug} href={`/products?category=${slug}`} className="group flex min-h-28 flex-col justify-between border border-white/10 bg-[#121212] p-4 transition-colors hover:border-red-500/70 hover:bg-[#191111]">
                <Icon className="h-5 w-5 text-red-400 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
                <span className="mt-5 text-sm font-semibold leading-snug text-white">{label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="market-products" className="container-custom scroll-mt-28 py-9 sm:py-11">
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-400">{section === 'best-bargains' ? 'Best Price picks' : section === 'festival-store' || section === 'indian-fashion' ? 'From the live catalog' : 'Shop the selection'}</p>
            <h2 className="mt-2 text-2xl font-bold">{section === 'best-bargains' ? 'Best bargains' : section === 'festival-store' ? 'Festive finds' : section === 'indian-fashion' ? 'Indian fashion picks' : section === 'deals' ? 'Deals across the store' : section === 'offers' ? 'Current offers' : 'Easy picks'}</h2>
          </div>
          <Link href={section === 'best-bargains' || section === 'offers' || section === 'deals' ? '/products?collection=sale' : '/products'} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-red-400 transition-colors hover:text-red-300">View All <ArrowRight className="h-4 w-4" /></Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((item) => <div key={item} className="aspect-[3/4] animate-pulse bg-white/5" />)}</div>
        ) : sectionProducts.length > 0 ? (
          <ProductCarousel products={sectionProducts} highlightBestPrice={section === 'best-bargains' || section === 'offers'} dark />
        ) : (
          <div className="border border-dashed border-white/15 bg-white/[0.025] px-6 py-12 text-center">
            <PackageOpen className="mx-auto h-9 w-9 text-white/35" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold text-white">Nothing to show just yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/55">{emptyMessage}</p>
            <Link href="/products" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300">Browse all products <ArrowRight className="h-4 w-4" /></Link>
          </div>
        )}
      </section>

      {section === 'best-bargains' && sectionProducts.length > 0 && featuredDeal && (
        <section className="container-custom pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-y border-red-900/50 bg-[#160b0c] px-5 py-5 sm:px-7">
            <div><p className="text-xs font-bold uppercase tracking-wider text-red-400">Best price in this selection</p><p className="mt-1 font-semibold text-white">{featuredDeal.name} <span className="ml-2 text-red-300">Save {getDiscountPercent(featuredDeal.basePrice, featuredDeal.salePrice ?? featuredDeal.basePrice)}%</span></p><p className="mt-1 text-xs text-white/55">{formatPrice(featuredDeal.salePrice ?? featuredDeal.basePrice)} instead of {formatPrice(featuredDeal.basePrice)}</p></div>
            <Link href={`/products/${featuredDeal.slug}`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-500">Shop this bargain <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      )}
    </div>
  );
}
