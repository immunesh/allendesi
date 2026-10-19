import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, Phone, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ | Allendesi Customer Support',
  description: 'Answers to common questions about shopping on Allendesi, orders, returns, payments, and seller accounts.',
};

const FAQ_SECTIONS = [
  {
    title: 'Products & Sellers',
    icon: '🛍️',
    faqs: [
      { q: 'What can I shop for on Allendesi?', a: 'Browse products across fashion, beauty, home, food, wellness, and other marketplace categories. Available products and details are shown in the catalog.' },
      { q: 'Where can I find product details?', a: 'Open a product page to review its description, images, price, availability, and customer ratings before ordering.' },
      { q: 'How do I contact a seller?', a: 'For help with a product or an order, use the contact options on our Contact page and include your order details when relevant.' },
    ],
  },
  {
    title: 'Orders & Shipping',
    icon: '🚚',
    faqs: [
      { q: 'How do I track my order?', a: 'Sign in, open My Orders, and select the order to view its current status and available shipment details.' },
      { q: 'When will my order arrive?', a: 'Delivery estimates and applicable shipping charges are shown during checkout and in your order details.' },
      { q: 'When is shipping free?', a: 'Free shipping is available above the order threshold shown on the site. Any applicable charges appear at checkout.' },
    ],
  },
  {
    title: 'Returns & Refunds',
    icon: '↩️',
    faqs: [
      { q: 'What is the return policy?', a: 'Return eligibility and instructions are described in our Return & Refund Policy. Review the policy for the terms that apply to your order.' },
      { q: 'How do I ask about a return?', a: 'Contact customer support with your order number and a short description of the issue. You can also review your order from My Orders.' },
      { q: 'What if an item arrives damaged or incorrect?', a: 'Contact support with your order number and details so the team can review the issue and explain the available next steps.' },
    ],
  },
  {
    title: 'Payments & Account',
    icon: '💳',
    faqs: [
      { q: 'Which payment methods are available?', a: 'Available payment methods are displayed during checkout and may vary by order.' },
      { q: 'How do I manage my account?', a: 'Sign in to manage your profile, saved addresses, orders, notification preferences, and wishlist.' },
      { q: 'How do I use a coupon?', a: 'Enter a valid coupon code during checkout. The order summary will show whether it applies.' },
    ],
  },
  {
    title: 'Selling on Allendesi',
    icon: '🏪',
    faqs: [
      { q: 'How do I become a seller?', a: 'Use the Start Selling link to create a seller account and access the seller dashboard.' },
      { q: 'What can I manage from the seller dashboard?', a: 'Sellers can list products, manage orders, and review sales information from their account.' },
    ],
  },
];

const sectionId = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function FAQPage() {
  return (
    <div>
      <div className="page-hero py-14 text-center">
        <div className="container-custom mx-auto max-w-2xl">
          <h1 className="mb-4 text-4xl font-display font-bold text-white md:text-5xl">Frequently Asked Questions</h1>
          <p className="text-lg text-white/75">Answers about shopping, orders, returns, and selling on Allendesi.</p>
        </div>
      </div>

      <div className="container-custom py-14">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {FAQ_SECTIONS.map(({ title, icon, faqs }) => (
              <section key={title} id={sectionId(title)}>
                <h2 className="mb-5 flex items-center gap-3 text-2xl font-display font-bold text-gray-900"><span className="text-2xl">{icon}</span>{title}</h2>
                <div className="space-y-3">
                  {faqs.map(({ q, a }) => (
                    <details key={q} className="group card">
                      <summary className="flex cursor-pointer list-none items-center justify-between p-5">
                        <h3 className="pr-4 text-sm font-semibold text-gray-900 md:text-base">{q}</h3>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-200 text-sm font-bold text-brand-600 transition-colors group-open:border-brand-600 group-open:bg-brand-600 group-open:text-white">+</span>
                      </summary>
                      <div className="px-5 pb-5"><p className="border-t border-gray-100 pt-4 text-sm leading-relaxed text-gray-600">{a}</p></div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="space-y-5 lg:pt-0">
            <div className="card p-5">
              <h2 className="mb-4 font-bold text-gray-900">Jump to Section</h2>
              <div className="space-y-2">
                {FAQ_SECTIONS.map(({ title, icon }) => <a key={title} href={`#${sectionId(title)}`} className="flex items-center gap-2 py-1 text-sm text-gray-600 transition-colors hover:text-brand-600"><span>{icon}</span>{title}</a>)}
              </div>
            </div>
            <div className="card p-5">
              <h2 className="mb-2 font-bold text-gray-900">Still need help?</h2>
              <p className="mb-4 text-sm text-gray-600">Contact the Allendesi support team for help with products, orders, or your account.</p>
              <div className="space-y-2">
                <a href="tel:+911800Allendesi" className="flex items-center gap-2 text-sm font-medium text-brand-700"><Phone className="h-4 w-4" />+91 1800-Allendesi (Free)</a>
                <a href="mailto:help@Allendesi.com" className="flex items-center gap-2 text-sm font-medium text-brand-700"><Mail className="h-4 w-4" />help@Allendesi.com</a>
                <Link href="/contact" className="flex items-center gap-2 text-sm font-medium text-brand-700"><MessageCircle className="h-4 w-4" />Contact Us</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
