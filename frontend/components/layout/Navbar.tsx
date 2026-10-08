'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, ShoppingBag, Heart, User, Menu, X, ChevronDown,
  Phone, Sparkles, LogOut, Package, Home, Store,
} from 'lucide-react';
import { useAuthStore, useCartStore, useWishlistStore, useUIStore } from '@/lib/store';
import { getCategories } from '@/lib/category-api';
import { cn } from '@/lib/utils';

type NavLink = {
  label: string;
  href: string;
  mega?: { label: string; href: string }[];
  megaTitle?: string;
};

const NAV_LINKS: NavLink[] = [
  {
    label: 'All Categories',
    href: '/shop',
    megaTitle: 'SHOP BY CATEGORY',
    mega: [],
  },
  {
    label: 'Easy Picks',
    href: '/shop?collection=featured',
  },
  {
    label: 'Best Bargains',
    href: '/shop?collection=sale',
  },
  { label: 'Offers', href: '/shop?collection=sale' },
  { label: 'Deals', href: '/shop?collection=sale' },
  { label: 'Festival Store', href: '/shop?collection=sale' },
  { label: 'Indian Fashion', href: '/shop?collection=new' },
  { label: 'Become a Seller', href: '/seller/register' },
];

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const cartStore = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const { isSearchOpen, toggleSearch, isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ name: string; slug: string }>>([]);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    getCategories()
      .then((items) => setCategories(items))
      .catch((error) => console.error('Failed to load categories:', error));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      toggleSearch();
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUserMenuOpen(false);
    router.push('/');
  };

  const itemCount = cartStore.itemCount;
  const navLinks = NAV_LINKS.map((link) =>
    link.label === 'All Categories'
      ? {
          ...link,
          mega: categories.map((category) => ({
            label: category.name,
            href: `/products?category=${encodeURIComponent(category.slug)}`,
          })),
        }
      : link
  );

  return (
    <>
      {/* Top bar */}
      <div className="bg-brand-950 text-white text-xs py-2 hidden md:block">
        <div className="container-custom flex justify-between items-center">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> +91 1800-Allendesi (Free)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-brand-300">Free shipping above ₹999</span>
            <Link href="/blog" className="hover:text-brand-300 transition-colors">Hair Care Tips</Link>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <header className={cn(
        'sticky top-0 z-50 bg-[#0d0d0d] text-white transition-shadow duration-300',
        scrolled ? 'shadow-xl shadow-black/30' : 'shadow-sm shadow-black/20'
      )}>
        <div className="border-b border-gray-800/80 bg-[#111111]">
          <div className="container-custom">
            <div className="flex h-[72px] items-center gap-2 sm:gap-4">
              {/* Logo */}
              <Link href="/" className="flex-shrink-0 flex items-center gap-2" onClick={closeMobileMenu}>
                <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-800 rounded-lg flex items-center justify-center shadow-lg shadow-brand-900/30">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-display font-bold text-gradient">Allendesi</span>
              </Link>

              {/* Desktop search */}
              <form onSubmit={handleSearch} className="mx-auto hidden w-full max-w-xl flex-1 lg:flex">
                <label htmlFor="navbar-search" className="sr-only">Search</label>
                <div className="flex w-full items-center rounded-full border border-gray-700 bg-gray-900/80 focus-within:border-brand-500 focus-within:bg-gray-900">
                  <Search className="ml-4 h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    id="navbar-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search wigs, hair systems, styles..."
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-gray-400 focus:outline-none"
                  />
                  <button type="submit" className="mr-1 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700">
                    Search
                  </button>
                </div>
              </form>

              {/* Right actions */}
              <div className="ml-auto flex items-center gap-1 sm:gap-2">
                {/* Search */}
                <button
                  onClick={toggleSearch}
                  className="rounded-xl p-2 transition-colors hover:bg-gray-800 lg:hidden"
                  aria-label="Search"
                  title="Search"
                >
                  <Search className="h-5 w-5 text-gray-200" />
                </button>

                {/* Wishlist */}
                <Link href="/wishlist" aria-label="Wishlist" title="Wishlist" className="relative hidden items-center gap-2 rounded-xl p-2 transition-colors hover:bg-gray-800 sm:flex">
                  <Heart className="h-5 w-5 text-gray-200" />
                  <span className="hidden text-sm text-gray-200 xl:inline">Wishlist</span>
                  {wishlistItems.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {wishlistItems.length}
                    </span>
                  )}
                </Link>

                {/* Cart */}
                <button
                  onClick={cartStore.toggleCart}
                  className="relative flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-gray-800"
                  aria-label="Cart"
                  title="Cart"
                >
                  <ShoppingBag className="h-5 w-5 text-gray-200" />
                  <span className="hidden text-sm text-gray-200 xl:inline">Cart</span>
                  {itemCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </button>

                {/* User */}
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-gray-800"
                    >
                      <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {user?.firstName[0]}{user?.lastName[0]}
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 animate-fade-in z-50">
                        <div className="px-4 py-2 border-b border-gray-100 mb-1">
                          <p className="font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
                          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        {[
                          { href: '/profile', icon: User, label: 'My Profile' },
                          { href: '/orders', icon: Package, label: 'My Orders' },
                          { href: '/wishlist', icon: Heart, label: 'Wishlist' },
                        ].map(({ href, icon: Icon, label }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                          >
                            <Icon className="w-4 h-4" /> {label}
                          </Link>
                        ))}
                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" /> Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href="/login" className="hidden sm:flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-900/30 transition-colors hover:bg-brand-500">
                    <User className="w-4 h-4" /> Sign In
                  </Link>
                )}

                {/* Mobile menu */}
                <button
                  onClick={toggleMobileMenu}
                  className="ml-1 rounded-xl p-2 transition-colors hover:bg-gray-800 lg:hidden"
                  aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={isMobileMenuOpen}
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-800/80 bg-[#0d0d0d]">
          <div className="w-full px-3 sm:px-5 xl:px-8">
            <nav aria-label="Main navigation" className="hidden h-[52px] w-full items-center justify-between gap-1 overflow-visible py-1 lg:flex">
              {navLinks.map((link) => (
                <div
                  key={link.label}
                  className="relative z-20 h-full min-w-0 flex-1"
                  onMouseEnter={() => link.mega && setActiveMenu(link.label)}
                  onMouseLeave={() => setActiveMenu(null)}
                >
                  <Link
                    href={link.href}
                    onClick={(e) => {
                      if (link.mega) {
                        e.preventDefault();
                        setActiveMenu((prev) => (prev === link.label ? null : link.label));
                      }
                    }}
                    onFocus={() => link.mega && setActiveMenu(link.label)}
                    className={cn(
                      'flex h-full w-full items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 text-sm font-medium transition-colors xl:px-2',
                      link.label === 'All Categories'
                        ? 'px-3 text-white hover:text-brand-400'
                        : 'text-gray-200 hover:text-brand-400',
                      activeMenu === link.label && 'text-brand-400'
                    )}
                  >
                    {link.label}
                    {link.mega && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', activeMenu === link.label && 'rotate-180')} />}
                  </Link>

                  {link.mega && activeMenu === link.label && (
                    <div className="absolute left-0 top-full z-[60] max-h-[calc(100dvh-8rem)] w-64 overflow-y-auto rounded-xl border border-gray-800 bg-gray-950 p-4 shadow-2xl animate-fade-in">
                      {link.megaTitle && <p className="mb-2 px-3 text-[11px] font-semibold tracking-wide text-brand-400">{link.megaTitle}</p>}
                      <div className="grid grid-cols-2 gap-1">
                        {link.mega.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="rounded-lg px-3 py-2 text-sm leading-snug text-gray-300 transition-colors hover:bg-gray-900 hover:text-brand-400"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                      <div className="mt-3 border-t border-gray-800 pt-3">
                        <Link href={link.href} className="text-sm font-semibold text-brand-400 hover:text-brand-300">
                          View All {link.label} <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Search overlay */}
        {isSearchOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-3 animate-fade-in">
            <form onSubmit={handleSearch} className="container-custom">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for wigs, hair systems, styles..."
                  className="w-full pl-12 pr-12 py-3 border-2 border-brand-300 rounded-full focus:outline-none focus:border-brand-500 text-sm"
                />
                <button
                  type="button"
                  onClick={toggleSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 max-w-2xl mx-auto">
                <span className="text-xs text-gray-500">Popular:</span>
                {['Lace Front', 'Human Hair', "Men's System", 'Curly', 'Ombre'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setSearchQuery(t); router.push(`/search?q=${encodeURIComponent(t)}`); toggleSearch(); }}
                    className="text-xs bg-gray-100 hover:bg-brand-100 hover:text-brand-700 px-3 py-1 rounded-full transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 top-16 z-40 overflow-y-auto bg-gray-950 animate-slide-in-right lg:hidden">
            <div className="mx-auto max-w-2xl p-4">
              {!isAuthenticated ? (
                <div className="mb-4">
                  <Link href="/login" className="btn-primary block py-2.5 text-center text-sm" onClick={closeMobileMenu}>Sign In</Link>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-2xl mb-6">
                  <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user?.firstName[0]}{user?.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
              )}

              <div className="mb-4 grid grid-cols-2 gap-2">
                <Link href="/wishlist" onClick={closeMobileMenu} className="flex items-center justify-center gap-2 rounded-lg border border-gray-800 px-3 py-3 text-sm font-medium text-gray-200 hover:bg-gray-900">
                  <Heart className="h-4 w-4" /> Wishlist
                </Link>
                <button onClick={() => { cartStore.toggleCart(); closeMobileMenu(); }} className="flex items-center justify-center gap-2 rounded-lg border border-gray-800 px-3 py-3 text-sm font-medium text-gray-200 hover:bg-gray-900">
                  <ShoppingBag className="h-4 w-4" /> Cart{itemCount > 0 ? ` (${itemCount})` : ''}
                </button>
              </div>

              {navLinks.map((link) => (
                <div key={link.label} className="mb-2">
                  <Link
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="flex items-center justify-between rounded-lg px-3 py-3 font-medium text-gray-100 hover:bg-gray-900"
                  >
                    {link.label}
                  </Link>
                  {link.mega && (
                    <div className="mt-1 pl-4">
                      {link.megaTitle && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold tracking-wide text-brand-400">{link.megaTitle}</p>}
                      <div className="grid grid-cols-2 gap-1">
                        {link.mega.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={closeMobileMenu}
                            className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-brand-400"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isAuthenticated && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Link href="/orders" onClick={closeMobileMenu} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                    <Package className="w-5 h-5 text-gray-500" /> My Orders
                  </Link>
                  <Link href="/profile" onClick={closeMobileMenu} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                    <User className="w-5 h-5 text-gray-500" /> Profile
                  </Link>
                  {user?.role === 'SELLER' && (
                    <Link href="/seller" onClick={closeMobileMenu} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                      <Store className="w-5 h-5 text-gray-500" /> Seller Dashboard
                    </Link>
                  )}
                  <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded-xl text-red-600 hover:bg-red-50">
                    <LogOut className="w-5 h-5" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
