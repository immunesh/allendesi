'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Store, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { useAuthStore, useUIStore } from '@/lib/store';
import { authApi } from '@/lib/api';

export default function SellerRegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { showToast } = useUIStore();
  const [form, setForm] = useState({ shopName: '', ownerName: '', email: '', phone: '', password: '', confirm: '', address: '', gst: '', description: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.register({
        firstName: form.ownerName.split(' ')[0] || 'Seller',
        lastName: form.ownerName.split(' ').slice(1).join(' ') || 'Owner',
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: 'SELLER',
      });
      const { user, accessToken, refreshToken } = data.data;
      const normalizedUser = { ...user, role: 'SELLER' };
      setAuth(normalizedUser, accessToken, refreshToken);
      showToast(`Welcome to your seller dashboard, ${normalizedUser.firstName}!`);
      router.push('/seller');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error?.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-12 text-white">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-red-950/40 bg-[#0b0b0b] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] lg:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-red-800"><Store className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-semibold">Become a Seller</h1>
            <p className="text-sm text-gray-400">Open a storefront for your brand and start selling on Allendesi.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div>
              <label className="mb-2 block text-sm text-gray-300">Shop Name</label>
              <input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} className="input-field" placeholder="Luxury Hair Studio" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Owner Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className="input-field pl-10" placeholder="Aisha Kapoor" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field pl-10" placeholder="seller@you.com" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field pl-10" placeholder="9876543210" />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-5">
            <div>
              <label className="mb-2 block text-sm text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field pl-10 pr-10" placeholder="Create password" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Confirm Password</label>
              <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="input-field" placeholder="Repeat password" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" placeholder="Mumbai, India" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">GST Number (optional)</label>
              <input value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} className="input-field" placeholder="27ABCDE1234F1Z5" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-gray-300">Store Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-[110px]" placeholder="Tell customers about your brand" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating Seller Account...</> : 'Create Seller Account'}
            </button>
            <p className="text-center text-sm text-gray-400">Already a seller? <Link href="/login" className="text-red-400">Sign in</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}
