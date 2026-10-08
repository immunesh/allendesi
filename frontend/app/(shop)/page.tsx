'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, Sparkles,
  ChevronLeft, ChevronRight, Zap, Pause, Play,
  HeartPulse, Utensils, Shirt, Baby, Home, Sofa, Sun, BookOpen, PawPrint
} from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { formatPrice } from '@/lib/utils';
 
import { Category, Product } from '@/types';
import { productsApi } from '@/lib/api';
import { getCategories } from '@/lib/category-api';
import { getHeroSlides } from '@/lib/hero-api';

const CATEGORY_ICONS = {
  wellness: HeartPulse,
  'beauty-personal-care': Sparkles,
  food: Utensils,
  'fashion-clothing': Shirt,
  'baby-kids': Baby,
  'home-kitchen': Home,
  'home-furnishing': Sofa,
  spirituality: Sun,
  books: BookOpen,
  'pet-care': PawPrint,
};

const CATEGORY_TILE_STYLES = [
  { color: 'from-pink-900/80 to-brand-900/80' },
  { color: 'from-gray-900/80 to-blue-900/80' },
  { color: 'from-amber-900/80 to-brand-900/80' },
  { color: 'from-brand-950/80 to-purple-900/80' },
];

const GENDER_BADGE: Record<string, string> = {
  WOMEN: "Women's",
  MEN: "Men's",
  UNISEX: 'Unisex',
};

const DEFAULT_HERO_SLIDES = [
  {
    id: 1,
    headline: 'Elevate Your Everyday Style',
    subheadline: '',
    description: 'Discover premium products from trusted sellers on Allendesi.',
    cta: 'Shop Now',
    ctaLink: '/products',
    ctaSecondary: 'Explore Collection',
    ctaSecondaryLink: '/products?collection=featured',
    badge: 'New Season Collection',
    image: '/img1.webp?hero=1',
  },
  {
    id: 2,
    headline: 'Great Products. Better Deals.',
    subheadline: '',
    description: 'Discover limited-time offers across the Allendesi marketplace.',
    cta: 'Shop Deals',
    ctaLink: '/products?collection=sale',
    badge: 'Allendesi Deals',
    image: '/img2.webp?hero=2',
  },
  {
    id: 3,
    headline: 'Fresh Styles Have Arrived',
    subheadline: '',
    description: 'Explore the latest products from our sellers.',
    cta: 'Explore New Arrivals',
    ctaLink: '/products?collection=new',
    badge: 'New Arrivals',
    image: '/img%203.webp?hero=3',
  },
  {
    id: 4,
    headline: 'Grow Your Business With Allendesi',
    subheadline: '',
    description: 'Reach more customers and grow your online store with Allendesi.',
    cta: 'Become a Seller',
    ctaLink: '/seller/register',
    badge: 'Sell on Allendesi',
    image: '/women.avif',
  },
];


function ProductSection({
  title,
  description,
  products,
  viewAllHref,
  columns = 5,
}: {
  title: string;
  description: string;
  products: Product[];
  viewAllHref: string;
  columns?: 4 | 5;
}) {
  return (
    <section className="py-7 md:py-9">
      <div className="container-custom">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          <Link href={viewAllHref} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-red-400 transition-colors hover:text-red-300">
            View All <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {products.length > 0 ? (
          <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 ${columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
            {products.slice(0, columns).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-white/10 px-4 py-3 text-sm text-gray-500">
            No products are available in this collection right now.
          </p>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [heroSlides, setHeroSlides] = useState<any[]>(DEFAULT_HERO_SLIDES);
  const [heroSlide, setHeroSlide] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    const loadHeroSlides = async () => {
      try {
        const data = await getHeroSlides(true);
        if (Array.isArray(data) && data.length > 0) {
          setHeroSlides(
            data.map((slide: any) => ({
              ...slide,
            }))
          );
          setHeroSlide(0);
        }
      } catch (error) {
        console.error('Homepage hero slides error:', error);
      }
    };

    loadHeroSlides();
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || heroSlides.length < 2) return;

    const interval = setInterval(() => {
      setIsSliding(true);
      setTimeout(() => {
        setHeroSlide((s) => (s + 1) % heroSlides.length);
        setIsSliding(false);
      }, 220);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroSlides.length, isAutoPlaying]);

  const goSlide = (dir: number) => {
    if (heroSlides.length < 2) return;
    setIsSliding(true);
    setTimeout(() => {
      setHeroSlide((s) => ((s + dir + heroSlides.length) % heroSlides.length));
      setIsSliding(false);
    }, 220);
  };

  const slide = heroSlides[heroSlide] || heroSlides[0];
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [todayDeals, setTodayDeals] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const orderedCategories = categories.map((category) => ({
    ...category,
    href: `/products?category=${encodeURIComponent(category.slug)}`,
  }));

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data || []);
      } catch (error) {
        console.error('Homepage categories error:', error);
        setCategories([]);
      }
    };

    loadCategories();
  }, []);

useEffect(() => {
  const loadProducts = async () => {
    
    try {
      const res = await productsApi.getAll();

      const list =
        res?.data?.data || [];

      console.log(
        "HOME PRODUCTS",
        list
      );

      setNewArrivals(
        list
          .filter(
            (p: Product) =>
              p.isNewArrival
          )
          .slice(0, 5)
      );

      setBestSellers(
        list
          .filter(
            (p: Product) =>
              p.isBestSeller
          )
          .slice(0, 5)
      );

      setTodayDeals(
        list
          .filter((p: Product) => p.salePrice && p.salePrice < p.basePrice)
          .sort((a: Product, b: Product) => (b.basePrice - (b.salePrice || b.basePrice)) - (a.basePrice - (a.salePrice || a.basePrice)))
          .slice(0, 4)
      );

      setTrendingProducts(
        [...list]
          .sort((a: Product, b: Product) => (b.rating - a.rating) || (b.reviewCount - a.reviewCount))
          .slice(0, 4)
      );
      
    } catch (error) {
      console.error(
        "Homepage products error:",
        error
      );

      setNewArrivals([]);
      setBestSellers([]);
      setTodayDeals([]);
      setTrendingProducts([]);
    }
  };

  loadProducts();
}, []);
console.log(
  "NEW",
  newArrivals
);

console.log(
  "BEST",
  bestSellers
);
const featuredDeal = todayDeals[0] || bestSellers[0] || newArrivals[0];
const featuredDealImage =
  featuredDeal?.images?.find((image) => image.isPrimary)?.url ||
  featuredDeal?.images?.[0]?.url ||
  "/img1.webp";
const featuredDealDiscount =
  featuredDeal?.salePrice && featuredDeal.basePrice > featuredDeal.salePrice
    ? Math.round(((featuredDeal.basePrice - featuredDeal.salePrice) / featuredDeal.basePrice) * 100)
    : 0;
  return (
    <div>
      {/* ─── HERO SLIDER ─────────────────────────────────────────── */}
      <section className="container-custom py-4 sm:py-6" aria-label="Featured promotions" aria-roledescription="carousel">
        <div className="relative isolate min-h-[430px] overflow-hidden rounded-2xl bg-[#0A0A0A] md:min-h-[370px] lg:min-h-[390px]">
          <div className={`absolute inset-x-0 bottom-0 h-[150px] transition-opacity duration-300 md:inset-y-0 md:left-[46%] md:h-auto ${isSliding ? 'opacity-0' : 'opacity-100'}`}>
            <Image
              src={slide.image}
              alt={slide.headline}
              fill
              sizes="(max-width: 768px) 100vw, 62vw"
              className="object-cover object-[65%_center] md:object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/35 to-transparent md:bg-gradient-to-r md:from-[#0A0A0A]/70 md:via-[#0A0A0A]/20 md:to-transparent" />
          </div>

          <div className={`relative z-10 flex min-h-[430px] items-start px-6 pt-6 pb-[170px] transition-all duration-300 sm:px-9 md:min-h-[370px] md:w-[54%] md:items-center md:px-10 md:py-10 md:pb-20 lg:min-h-[390px] lg:w-[50%] lg:px-14 ${isSliding ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="w-full text-white md:max-w-[270px] lg:max-w-[390px]">
            {slide.badge && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-600/15 px-3 py-1.5 text-xs font-bold uppercase text-red-100 sm:mb-4">
                <Sparkles className="h-4 w-4 text-red-300" aria-hidden="true" />
                <span>{slide.badge}</span>
              </div>
            )}

            <h1 className="mb-3 max-w-[17ch] font-display text-[2rem] font-bold leading-[1.08] sm:text-4xl md:text-[2.8rem] lg:text-[3.5rem]">
              {slide.headline}
              {slide.subheadline && <span className="block text-red-100">{slide.subheadline}</span>}
            </h1>

            <p className="mb-5 max-w-[42ch] text-sm leading-relaxed text-white/80 sm:text-base md:mb-6">
              {slide.description}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {slide.cta && slide.ctaLink && (
                <Link href={slide.ctaLink} className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm sm:text-base">
                  {slide.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
              {slide.ctaSecondary && slide.ctaSecondaryLink && (
                <Link href={slide.ctaSecondaryLink} className="inline-flex items-center gap-2 rounded-full border border-white/35 px-4 py-3 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10 sm:text-base">
                  {slide.ctaSecondary}
                </Link>
              )}
            </div>
          </div>
          </div>

          <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between sm:left-6 sm:right-6">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goSlide(-1)}
                aria-label="Previous promotion"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition-colors hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => goSlide(1)}
                aria-label="Next promotion"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition-colors hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
              {heroSlides.map((_: any, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goSlide(i - heroSlide)}
                  aria-label={`Go to promotion ${i + 1}`}
                  aria-current={i === heroSlide ? 'true' : undefined}
                  className={`h-2 rounded-full transition-all duration-300 ${i === heroSlide ? 'w-6 bg-red-500' : 'w-2 bg-white/45 hover:bg-white/75'}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsAutoPlaying((playing) => !playing)}
              aria-label={isAutoPlaying ? 'Pause carousel' : 'Play carousel'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white transition-colors hover:bg-black/70"
            >
              {isAutoPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ──────────────────────────────────────────────── */}
      <section className="py-10 md:py-12 container-custom">
    <div className="text-center mb-8 md:mb-10">
    <h2 className="section-title">Shop by Category</h2>
    <p className="section-subtitle">
      Find the perfect wig for your lifestyle and personality
    </p>
  </div>

  {orderedCategories.length > 0 && (
  <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
    {orderedCategories.map((cat, i) => {
      const badge = (cat.gender && GENDER_BADGE[cat.gender]) || 'Shop Now';
      const style = CATEGORY_TILE_STYLES[i % CATEGORY_TILE_STYLES.length];
      const CategoryIcon = CATEGORY_ICONS[cat.slug as keyof typeof CATEGORY_ICONS] || Sparkles;

      return (
      <Link
        key={cat.id}
        href={cat.href}
        className="group relative h-32 w-32 flex-none overflow-hidden rounded-xl sm:h-36 sm:w-36"
      >
        {cat.image ? (
          <Image
            src={cat.image}
            alt={cat.name}
            fill
            sizes="144px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${style.color}`}>
            <CategoryIcon className="h-9 w-9 text-white/85 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
          </div>
        )}

        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent transition-opacity group-hover:opacity-90"
        />

        <div className="absolute inset-0 flex items-end p-3">
          <div>
            <h3 className="text-sm font-bold leading-tight text-white sm:text-base">
              {cat.name}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-white/80">
              {badge} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </Link>
      );
    })}
  </div>
  )}
</section>

      <ProductSection
        title="Best Sellers"
        description="Customer favourites, tried and loved"
        products={bestSellers}
        viewAllHref="/products?collection=best"
      />

      <ProductSection
        title="New Arrivals"
        description="Fresh styles just landed"
        products={newArrivals}
        viewAllHref="/products?collection=new"
      />

      <ProductSection
        title="Today's Deals"
        description="Limited-time savings on selected products"
        products={todayDeals}
        viewAllHref="/products?collection=sale"
        columns={4}
      />

      <ProductSection
        title="Trending Now"
        description="Popular products shoppers are rating highly"
        products={trendingProducts}
        viewAllHref="/products?collection=featured"
        columns={4}
      />

      {/* ─── FEATURED DEAL ──────────────────────────────────────── */}
      <section className="py-10 sm:py-14">
        <div className="container-custom">
          <div className="grid overflow-hidden rounded-lg border border-red-950 bg-[#090909] md:grid-cols-2">
            <div className="flex flex-col items-start justify-center px-6 py-8 sm:px-10 sm:py-12 lg:px-14">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-red-400">
                Today&apos;s deals
              </p>
              <h2 className="max-w-lg text-3xl font-bold leading-tight text-white sm:text-4xl">
                Great finds. Better prices.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
                {featuredDeal
                  ? `Take a look at ${featuredDeal.name} and more customer favorites on offer.`
                  : "Browse popular picks and discover limited-time prices across the store."}
              </p>
              {featuredDeal?.salePrice && (
                <div className="mt-5 flex items-center gap-3">
                  <span className="text-xl font-bold text-white">
                    {formatPrice(featuredDeal.salePrice)}
                  </span>
                  <span className="text-sm text-white/45 line-through">
                    {formatPrice(featuredDeal.basePrice)}
                  </span>
                  {featuredDealDiscount > 0 && (
                    <span className="rounded-sm bg-red-700 px-2 py-1 text-xs font-bold text-white">
                      {featuredDealDiscount}% off
                    </span>
                  )}
                </div>
              )}
              <Link
                href={featuredDeal ? `/products/${featuredDeal.slug}` : "/products?collection=sale"}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-red-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                {featuredDeal ? "Shop this deal" : "Browse all deals"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <Link
              href={featuredDeal ? `/products/${featuredDeal.slug}` : "/products?collection=sale"}
              aria-label={featuredDeal ? `Shop ${featuredDeal.name}` : "Browse today's deals"}
              className="relative min-h-56 overflow-hidden bg-gradient-to-br from-[#550d16] via-[#26090d] to-[#090909] sm:min-h-72 md:min-h-[340px]"
            >
              <Image
                src={featuredDealImage}
                alt={featuredDeal?.name || "Featured products on sale"}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-5 transition-transform duration-500 hover:scale-[1.03] sm:p-8"
              />
              {featuredDealDiscount > 0 && (
                <span className="absolute right-4 top-4 rounded-sm bg-red-700 px-3 py-2 text-sm font-bold text-white">
                  Save {featuredDealDiscount}%
                </span>
              )}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── GENDER SPLIT BANNER ──────────────────────────────────── */}
      <section className="py-16 container-custom">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Women */}
          <Link href="/women" className="group relative overflow-hidden rounded-3xl min-h-[360px] cursor-pointer">
            <Image
              src='https://images.unsplash.com/photo-1541643600914-78b084683601?w=1200&q=80'
              alt="Perfume Collection"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-pink-900/80 via-brand-900/60 to-transparent" />
            <div className="absolute inset-0 p-10 flex flex-col justify-end">
              <span className="badge bg-white/20 text-white mb-3 self-start backdrop-blur-sm">For Her</span>
              <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Women&apos;s Wigs</h3>
              <p className="text-white/75 mb-5 max-w-xs">From silky straight to glamorous curls — express every side of you.</p>
              <span className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-5 py-2.5 rounded-full self-start group-hover:bg-brand-50 transition-colors">
                Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>

          {/* Men */}
          <Link href="/men" className="group relative overflow-hidden rounded-3xl min-h-[360px] cursor-pointer">
            <Image
              src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80"
              alt="Shoes Collection"
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900/85 via-brand-950/60 to-transparent" />
            <div className="absolute inset-0 p-10 flex flex-col justify-end">
              <span className="badge bg-white/20 text-white mb-3 self-start backdrop-blur-sm">For Him</span>
              <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Men&apos;s Hair Systems</h3>
              <p className="text-white/75 mb-5 max-w-xs">Undetectable Swiss lace hair systems. Natural look, zero compromise.</p>
              <span className="inline-flex items-center gap-2 bg-white text-brand-700 font-bold px-5 py-2.5 rounded-full self-start group-hover:bg-brand-50 transition-colors">
                Explore <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ─── MARKETPLACE NAVIGATION ─────────────────────────────── */}
      <section className="border-y border-red-950 bg-[#080808] py-12 text-white sm:py-14" aria-label="Allendesi site navigation">
        <div className="container-custom">
          <div className="mb-8 flex flex-col gap-2 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Allendesi marketplace</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">How can we help?</h2>
            </div>
            <Link href="/contact" className="text-sm font-medium text-white/65 transition-colors hover:text-red-300">
              Get in touch <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-6 lg:gap-6">
            {[
              { title: 'About Allendesi', links: [
                { label: 'About Allendesi', href: '/about' },
                { label: 'Our Story', href: '/about#story' },
                { label: 'Why Allendesi', href: '/about#why-allendesi' },
                { label: 'Careers', href: '/careers' },
              ] },
              { title: 'My Account', links: [
                { label: 'My Profile', href: '/profile' },
                { label: 'My Orders', href: '/orders' },
                { label: 'My Addresses', href: '/profile?tab=addresses' },
                { label: 'Wishlist', href: '/wishlist' },
              ] },
              { title: 'Customer Support', links: [
                { label: 'Contact Us', href: '/contact' },
                { label: 'FAQs', href: '/faq' },
                { label: 'Order in Bulk', href: '/contact?topic=Wholesale%20%2F%20B2B' },
                { label: 'Suggest a Product', href: '/contact?topic=Product%20Information' },
              ] },
              { title: 'Sell with Allendesi', links: [
                { label: 'Become a Seller', href: '/seller/register' },
                { label: 'Seller Login', href: '/login?role=SELLER' },
                { label: 'Seller Dashboard', href: '/seller' },
                { label: 'Affiliate Program', href: '/affiliate' },
              ] },
              { title: 'Explore', links: [
                { label: 'All Categories', href: '/categories' },
                { label: 'All Products', href: '/products' },
                { label: 'Site Map', href: '/sitemap' },
                { label: 'Offers & Deals', href: '/products?collection=sale' },
              ] },
              { title: 'Policies & Terms', links: [
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Shipping Policy', href: '/policies/shipping' },
                { label: 'Return & Refund Policy', href: '/policies/returns-refunds' },
                { label: 'Cancellation Policy', href: '/policies/cancellation' },
                { label: 'Seller Policy', href: '/policies/seller' },
              ] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-red-300">{title}</h3>
                <ul className="space-y-3">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-sm text-white/65 transition-colors hover:text-red-300">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
