'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Package, PlusCircle, ShoppingCart, BarChart3, Boxes, UserCircle, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore, useUIStore } from '@/lib/store';

const links = [
  { href: '/seller', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/seller/products', label: 'My Products', icon: Package },
  { href: '/seller/products/add', label: 'Add Product', icon: PlusCircle },
  { href: '/seller/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/seller/sales', label: 'Sales', icon: BarChart3 },
  { href: '/seller/inventory', label: 'Inventory', icon: Boxes },
  { href: '/seller/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/seller/profile', label: 'Profile', icon: UserCircle },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { showToast } = useUIStore();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!isAuthenticated || role !== 'SELLER') {
      router.replace('/login');
      return;
    }
    setCheckingAuth(false);
  }, [isAuthenticated, router]);

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">Loading seller workspace...</div>;
  }

  const handleLogout = () => {
    clearAuth();
    showToast('Logged out successfully', 'info');
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="lg:hidden flex items-center justify-between border-b border-red-950/40 bg-[#0b0b0b] px-4 py-3">
        <div className="font-semibold">Allendesi Seller</div>
        <button onClick={() => setSidebarOpen((v) => !v)} className="rounded-lg border border-red-900/40 p-2">
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex min-h-screen">
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-72 border-r border-red-950/40 bg-[#090909] p-5 transition-transform lg:translate-x-0 lg:static lg:w-72`}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Seller Hub</p>
              <p className="text-sm text-gray-400">{user?.firstName || 'Seller'}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/seller' && pathname.startsWith(href));
              return (
                <Link key={href} href={href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active ? 'bg-red-600/20 text-red-400' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-red-950/40 bg-black/30 p-4">
            <p className="text-sm font-semibold">Need support?</p>
            <p className="mt-1 text-sm text-gray-400">Use the platform tools to manage products, inventory, and orders.</p>
          </div>

          <button onClick={handleLogout} className="mt-8 flex w-full items-center gap-3 rounded-xl border border-red-900/40 px-3 py-3 text-sm text-red-300 hover:bg-red-950/20">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </aside>

        <div className="flex-1">
          <main className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
