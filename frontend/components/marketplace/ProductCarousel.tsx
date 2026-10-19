'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import { Product } from '@/types';

export default function ProductCarousel({
  products,
  highlightBestPrice = false,
  dark = false,
}: {
  products: Product[];
  highlightBestPrice?: boolean;
  dark?: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: direction * 680, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <button type="button" onClick={() => scroll(-1)} aria-label="Scroll products left" className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:border-red-500 hover:text-red-400 ${dark ? 'border-white/15 text-white' : 'border-gray-300 text-gray-700'}`}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => scroll(1)} aria-label="Scroll products right" className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:border-red-500 hover:text-red-400 ${dark ? 'border-white/15 text-white' : 'border-gray-300 text-gray-700'}`}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div ref={railRef} className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
        {products.map((product, index) => (
          <div key={product.id} className="w-[min(72vw,250px)] flex-none snap-start sm:w-[250px]">
            <ProductCard product={product} promoLabel={highlightBestPrice && index === 0 ? 'Best Price' : undefined} />
          </div>
        ))}
      </div>
    </div>
  );
}
