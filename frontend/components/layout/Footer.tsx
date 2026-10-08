'use client';

import Link from 'next/link';
import { Sparkles, Instagram, Facebook, Youtube, Twitter, Mail, Phone, MapPin } from 'lucide-react';

const SOCIAL_LINKS = [
  { Icon: Instagram, href: '#', label: 'Instagram' },
  { Icon: Facebook, href: '#', label: 'Facebook' },
  { Icon: Youtube, href: '#', label: 'YouTube' },
  { Icon: Twitter, href: '#', label: 'Twitter' },
];

const FEATURES = [
  { icon: '🚚', title: 'Free Shipping', desc: 'On orders above ₹999' },
  { icon: '↩️', title: 'Easy Returns', desc: '7-day hassle-free returns' },
  { icon: '🔒', title: 'Secure Payment', desc: '100% encrypted & safe' },
  { icon: '💬', title: '24/7 Support', desc: 'Expert help anytime' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300">
      {/* Feature strip */}
      <div className="border-b border-gray-800">
        <div className="container-custom py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="font-semibold text-white text-sm">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main footer */}
      <div className="container-custom py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)] md:gap-14">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-display font-bold text-white">Allendesi</span>
            </Link>
            <section className="mt-6 max-w-3xl border-l-2 border-red-700 pl-5 sm:pl-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Our Journey</p>
              <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">A marketplace for shoppers across India</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base">
                Allendesi is a trusted online shopping platform serving customers across India. We bring shoppers and sellers together with a broad selection of products, convenient online shopping, and dependable customer support.
              </p>
            </section>
          </div>

          <div className="border-t border-gray-800 pt-7 md:border-l md:border-t-0 md:pl-8 md:pt-1">
            <h3 className="mb-4 text-sm font-semibold text-white">Contact Allendesi</h3>
            <div className="space-y-2 text-sm">
              <a href="tel:+911800Allendesi" className="flex items-center gap-2 hover:text-brand-400 transition-colors">
                <Phone className="w-4 h-4 text-brand-500" /> +91 1800-Allendesi (Free)
              </a>
              <a href="mailto:hello@Allendesi.com" className="flex items-center gap-2 hover:text-brand-400 transition-colors">
                <Mail className="w-4 h-4 text-brand-500" /> hello@Allendesi.com
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-400">Allendesi HQ, Bandra Kurla Complex, Mumbai 400051</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              {SOCIAL_LINKS.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 bg-gray-800 hover:bg-brand-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Newsletter */}
      <div className="border-t border-gray-800">
        <div className="container-custom py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h4 className="font-semibold text-white">Get Style Inspiration + Exclusive Offers</h4>
              <p className="text-sm text-gray-500 mt-1">Join 2 lakh+ subscribers. Unsubscribe anytime.</p>
            </div>
            <form className="flex gap-2 w-full md:w-auto" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 md:w-72 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
              />
              <button type="submit" className="btn-primary py-2.5 px-6 whitespace-nowrap">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="container-custom py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Allendesi Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-2">
            {['Visa', 'Mastercard', 'UPI', 'Razorpay', 'EMI'].map((pay) => (
              <span key={pay} className="bg-gray-800 px-2 py-1 rounded text-gray-400">{pay}</span>
            ))}
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
            <Link href="/sitemap" className="hover:text-gray-300 transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
