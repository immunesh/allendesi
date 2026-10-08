import Link from "next/link";

const SITE_LINKS = [
  { title: "Shop", links: [["All Categories", "/categories"], ["All Products", "/products"], ["Offers & Deals", "/products?collection=sale"], ["Women", "/women"], ["Men", "/men"]] },
  { title: "Your Account", links: [["My Profile", "/profile"], ["My Addresses", "/profile?tab=addresses"], ["My Orders", "/orders"], ["Wishlist", "/wishlist"]] },
  { title: "Help & Information", links: [["Contact Us", "/contact"], ["FAQs", "/faq"], ["About Allendesi", "/about"], ["Careers", "/careers"]] },
  { title: "Sell with Allendesi", links: [["Become a Seller", "/seller/register"], ["Seller Login", "/login?role=SELLER"], ["Seller Dashboard", "/seller"], ["Affiliate Program", "/affiliate"]] },
  { title: "Policies", links: [["Terms of Service", "/terms"], ["Privacy Policy", "/privacy"], ["Shipping Policy", "/policies/shipping"], ["Return & Refund Policy", "/policies/returns-refunds"], ["Cancellation Policy", "/policies/cancellation"], ["Seller Policy", "/policies/seller"]] },
];

export default function SitemapPage() {
  return (
    <main className="min-h-[60vh] bg-white">
      <header className="bg-[#090909] py-12 text-white sm:py-16">
        <div className="container-custom">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Allendesi</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Site map</h1>
          <p className="mt-3 text-sm text-white/65 sm:text-base">Browse the main sections of the Allendesi marketplace.</p>
        </div>
      </header>
      <div className="container-custom grid grid-cols-2 gap-8 py-10 sm:grid-cols-3 lg:grid-cols-5 lg:py-14">
        {SITE_LINKS.map(({ title, links }) => (
          <section key={title}>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-red-700">{title}</h2>
            <ul className="space-y-3">
              {links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-gray-600 transition-colors hover:text-red-700">{label}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}