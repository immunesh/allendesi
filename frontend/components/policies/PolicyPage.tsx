import Link from "next/link";
import { notFound } from "next/navigation";

const POLICIES: Record<string, { title: string; intro: string; points: string[] }> = {
  "terms-of-service": {
    title: "Terms of Service",
    intro: "These terms describe the basic rules for using Allendesi and placing orders through the marketplace.",
    points: [
      "Keep account and delivery details accurate and secure.",
      "Review product details, delivery options, and the final order total before confirming checkout.",
      "Product availability, prices, and delivery estimates may change as marketplace listings are updated.",
      "Contact Allendesi support if you need help with an account, order, or listing.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "Allendesi uses information needed to operate accounts, fulfil orders, provide support, and improve the marketplace.",
    points: [
      "Account, contact, delivery, and order details are used to provide requested services.",
      "Payment transactions are processed through the payment options presented at checkout.",
      "Keep your account credentials private and contact support if you believe your account has been accessed without permission.",
      "For privacy questions or requests, contact the Allendesi support team.",
    ],
  },
  shipping: {
    title: "Shipping Policy",
    intro: "Shipping options and estimated delivery dates are shown during checkout and can vary by destination and product availability.",
    points: [
      "Orders are prepared after checkout is confirmed.",
      "Tracking details are shared when an order is dispatched, where carrier tracking is available.",
      "Delivery estimates may be affected by location, carrier operations, or other circumstances outside the marketplace.",
      "For an order-specific update, visit My Orders or contact support.",
    ],
  },
  "returns-refunds": {
    title: "Return & Refund Policy",
    intro: "Return eligibility and refund timing depend on the item and order. Check the product and order details before starting a request.",
    points: [
      "Eligible return requests can be started from the relevant order in My Orders.",
      "Returned products must meet the condition and packaging requirements shown for the item.",
      "Refunds are processed after the return is reviewed and are sent through the original payment method when available.",
      "Contact support if an item arrived damaged or differs from your order.",
    ],
  },
  cancellation: {
    title: "Cancellation Policy",
    intro: "Cancellation availability depends on the order's current fulfilment status.",
    points: [
      "Open My Orders and select the order to check whether cancellation is available.",
      "Orders already dispatched may no longer be cancellable; eligible items can be reviewed under the return policy.",
      "Any approved refund is returned through the original payment method when available.",
      "Contact support for help with an order that cannot be cancelled online.",
    ],
  },
  seller: {
    title: "Seller Policy",
    intro: "Allendesi sellers help customers shop with accurate product information and dependable fulfilment.",
    points: [
      "Provide clear, accurate product descriptions, images, availability, and pricing.",
      "Keep inventory and order status up to date in the Seller Dashboard.",
      "Respond to customer and marketplace support requests in a timely manner.",
      "Seller access and marketplace participation are subject to applicable laws and platform requirements.",
    ],
  },
};

export default function PolicyPage({ slug }: { slug: string }) {
  const policy = POLICIES[slug];
  if (!policy) notFound();

  return (
    <main className="min-h-[60vh] bg-white">
      <header className="bg-[#090909] py-12 text-white sm:py-16">
        <div className="container-custom">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Allendesi policies</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{policy.title}</h1>
        </div>
      </header>
      <article className="container-custom max-w-3xl py-10 sm:py-14">
        <p className="text-base leading-relaxed text-gray-700">{policy.intro}</p>
        <ul className="mt-6 list-disc space-y-4 pl-5 text-sm leading-relaxed text-gray-600">
          {policy.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
        <p className="mt-8 border-t border-gray-200 pt-5 text-sm text-gray-600">
          Need help? <Link href="/contact" className="font-semibold text-red-700 hover:text-red-800">Contact Allendesi support</Link>.
        </p>
      </article>
    </main>
  );
}