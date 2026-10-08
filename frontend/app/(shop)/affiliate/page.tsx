import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";

export default function AffiliatePage() {
  return (
    <main className="min-h-[60vh] bg-white">
      <section className="bg-[#090909] py-16 text-white sm:py-24">
        <div className="container-custom max-w-3xl">
          <Share2 className="mb-5 h-8 w-8 text-red-400" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Allendesi partners</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">Affiliate Program</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">
            Interested in sharing Allendesi products with your audience? Contact our team to discuss partnership options and current program details.
          </p>
          <Link href="/contact?topic=Affiliate%20Program" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-600">
            Contact partnerships <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}