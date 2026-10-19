import { notFound } from 'next/navigation';
import MarketplacePage from '@/components/marketplace/MarketplacePage';

const MARKET_SECTIONS = ['easy-picks', 'best-bargains', 'offers', 'deals', 'festival-store', 'indian-fashion'] as const;

export default function MarketSectionPage({ params }: { params: { section: string } }) {
  if (!MARKET_SECTIONS.includes(params.section as (typeof MARKET_SECTIONS)[number])) notFound();
  return <MarketplacePage section={params.section as (typeof MARKET_SECTIONS)[number]} />;
}
