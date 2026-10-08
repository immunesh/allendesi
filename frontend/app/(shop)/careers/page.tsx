import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";

export default function CareersPage() {
  return (
    <main className="min-h-[60vh] bg-white">
      <section className="bg-[#090909] py-16 text-white sm:py-24">
        <div className="container-custom max-w-3xl">
          <Briefcase className="mb-5 h-8 w-8 text-red-400" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Careers at Allendesi</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">Help build a better way to shop.</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70">
            We bring customers, independent sellers, and useful products together. Contact our team to ask about current opportunities.
          </p>
          <Link href="/contact?topic=Careers" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-600">
            Ask about careers <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}