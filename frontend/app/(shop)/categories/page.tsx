"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";
import { getCategories } from "@/lib/category-api";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setHasError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-[60vh] bg-white">
      <header className="border-b border-gray-200 bg-[#090909] py-12 text-white sm:py-16">
        <div className="container-custom">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Explore Allendesi</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Shop by category</h1>
          <p className="mt-3 max-w-xl text-sm text-white/65 sm:text-base">Browse every collection and find the products you need.</p>
        </div>
      </header>

      <section className="container-custom py-10 sm:py-14">
        {loading ? (
          <p className="text-sm text-gray-500">Loading categories...</p>
        ) : hasError ? (
          <div className="rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-600">Categories could not be loaded right now.</p>
            <Link href="/products" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-800">
              Browse all products <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-500">No categories are available yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${encodeURIComponent(category.slug)}`}
                className="group flex min-h-36 flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 transition hover:border-red-700 hover:bg-red-50/40 sm:min-h-40 sm:p-5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-700 transition group-hover:bg-red-700 group-hover:text-white">
                  <Layers3 className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold text-gray-900">{category.name}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 transition group-hover:text-red-700">
                    Shop category <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}