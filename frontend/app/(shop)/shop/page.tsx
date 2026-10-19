import { redirect } from 'next/navigation';

export default function ShopPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value) query.set(key, value);
  });
  const queryString = query.toString();
  redirect(queryString ? `/products?${queryString}` : '/products');
}
