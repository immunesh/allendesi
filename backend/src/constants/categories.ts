export const ALLENDESI_CATEGORIES = [
  { name: 'Wellness', slug: 'wellness' },
  { name: 'Beauty & Personal Care', slug: 'beauty-personal-care' },
  { name: 'Food', slug: 'food' },
  { name: 'Fashion Clothing', slug: 'fashion-clothing' },
  { name: 'Baby & Kids', slug: 'baby-kids' },
  { name: 'Home & Kitchen', slug: 'home-kitchen' },
  { name: 'Home Furnishing', slug: 'home-furnishing' },
  { name: 'Spirituality', slug: 'spirituality' },
  { name: 'Books', slug: 'books' },
  { name: 'Pet Care', slug: 'pet-care' },
] as const;

export const isAllendesiCategory = (
  category: { name: string; slug: string } | null | undefined
): boolean =>
  Boolean(
    category &&
      ALLENDESI_CATEGORIES.some(
        (allowed) =>
          allowed.name === category.name && allowed.slug === category.slug
      )
  );