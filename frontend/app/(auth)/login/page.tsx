'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Sparkles, Mail, Lock, Loader2 } from 'lucide-react';
import { useAuthStore, useUIStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { showToast } = useUIStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [role, setRole] = useState<'CUSTOMER' | 'SELLER'>('CUSTOMER');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const finalizeAuth = (user: any, accessToken: string, refreshToken: string, source: string) => {
    const normalizedUser = { ...user, role: (user.role || 'CUSTOMER').toUpperCase() };
    setAuth(normalizedUser, accessToken, refreshToken);
    showToast(source === 'google' ? `Welcome, ${normalizedUser.firstName || normalizedUser.email}!` : `Welcome back, ${normalizedUser.firstName || normalizedUser.email}!`);

    if (normalizedUser.role === 'ADMIN') router.push('/admin');
    else if (normalizedUser.role === 'SELLER') router.push('/seller');
    else router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await authApi.login(form.email, form.password, role);
      const payload = data?.data ?? data;
      const { user, accessToken, refreshToken } = payload;
      finalizeAuth(user, accessToken, refreshToken, 'email');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error?.response?.data?.message || 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      showToast('Google sign-in was cancelled', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google`, {
        credential: credentialResponse.credential,
      }, { withCredentials: true });

      const payload = data?.data ?? data;
      const { user, accessToken, refreshToken } = payload;
      finalizeAuth(user, accessToken, refreshToken, 'google');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error?.response?.data?.message || 'Google sign-in failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050505] text-white">
      <div className="hidden lg:flex lg:w-1/2 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.35),_transparent_45%),linear-gradient(135deg,_#0b0b0b,_#1a0a0a)] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-red-500/40"
              style={{
                width: `${90 + i * 35}px`,
                height: `${90 + i * 35}px`,
                top: `${i * 10}%`,
                left: `${i % 2 === 0 ? -10 : 65}%`,
              }}
            />
          ))}
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/40 bg-red-600/20">
            <Sparkles className="h-5 w-5 text-red-400" />
          </div>
          <span className="text-2xl font-semibold tracking-wide text-white">Allendesi</span>
        </Link>

        <div className="relative z-10">
          <h2 className="mb-4 text-4xl font-semibold text-white">Welcome back to Allendesi</h2>
          <p className="mb-8 max-w-lg text-lg text-gray-300">
            Sign in to access your wishlist, orders, and special member offers.
          </p>
          <div className="space-y-4">
            {['Track your orders instantly', 'Manage your saved wishlist', 'Unlock exclusive offers', 'Access your virtual try-on looks'].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 text-gray-200">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-red-600/20 text-xs text-red-400">
                  ✓
                </div>
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-gray-500">© 2025 Allendesi Technologies Pvt. Ltd.</p>
      </div>

      <div className="flex-1 bg-[#090909] px-6 py-12 lg:px-16 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Sparkles className="h-6 w-6 text-red-500" />
            <span className="text-xl font-semibold text-white">Allendesi</span>
          </div>

          <div className="rounded-3xl border border-red-900/40 bg-[#0f0f0f] p-7 shadow-2xl shadow-red-950/20">
            <h1 className="mb-2 text-3xl font-semibold text-white">Sign In</h1>
            <p className="mb-8 text-sm text-gray-400">
              New to Allendesi?{' '}
              <Link href="/register" className="font-semibold text-red-400 hover:text-red-300">Create an account</Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
           <div>
  <label className="mb-2 block text-sm font-semibold tracking-wide text-red-200">
    Sign in as
  </label>

  <div className="relative">
    <select
      value={role}
      onChange={(e) =>
        setRole(e.target.value as 'CUSTOMER' | 'SELLER')
      }
      className="
        w-full
        appearance-none
        rounded-2xl
        border border-red-800/40
        bg-black
        px-4
        py-3.5
        pr-12
        text-sm
        font-medium
        text-white
        shadow-[0_0_0_1px_rgba(220,38,38,0.08)]
        transition-all
        duration-200
        outline-none
        hover:border-red-600/60
        hover:bg-[#0b0b0b]
        focus:border-red-500
        focus:ring-2
        focus:ring-red-500/30
      "
    >
      <option value="CUSTOMER" className="bg-black text-white">
        Customer
      </option>

      <option value="SELLER" className="bg-black text-white">
        Seller
      </option>
    </select>

    {/* Custom arrow */}
    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
      <svg
        className="h-4 w-4 text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  </div>

  <p className="mt-2 text-xs text-gray-500">
    Choose whether you want to continue as a customer or a seller.
  </p>
</div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className={`w-full rounded-xl border border-red-950/40 bg-[#121212] py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-red-500 ${errors.email ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-300">Password</label>
                  <Link href="/forgot-password" className="text-xs text-red-400 hover:text-red-300">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Enter your password"
                    className={`w-full rounded-xl border border-red-950/40 bg-[#121212] py-3 pl-10 pr-10 text-sm text-white outline-none focus:border-red-500 ${errors.password ? 'border-red-500' : ''}`}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
              </div>

              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-70">
                {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing In…</> : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
              <div className="relative flex justify-center bg-[#0f0f0f] px-3 text-[11px] uppercase tracking-[0.25em] text-gray-500">Or continue with</div>
            </div>

           <div className="mt-4 space-y-3">
  <div className="flex justify-center">
    <GoogleLogin
      useOneTap={false}
      onSuccess={handleGoogleSuccess}
      onError={() => {
        showToast('Google sign-in failed', 'error');
      }}
    />
  </div>

  <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-950/40 bg-[#121212] py-2.5 text-sm font-medium text-gray-200 transition hover:border-red-500/50 hover:bg-[#171717]">
    🍎 Apple
  </button>
</div>

            <p className="mt-8 text-center text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="underline text-gray-400">Terms of Service</Link> and{' '}
              <Link href="/privacy" className="underline text-gray-400">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
