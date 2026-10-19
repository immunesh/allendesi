import { redirect } from 'next/navigation';

export default function WomenPage() {
  redirect('/products?gender=WOMEN');
}
