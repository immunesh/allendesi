const DEFAULT_API_URL = 'http://localhost:5000/api';
const API_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

const LEGACY_HAIR_CONTENT = /\b(hair|wig|wigs|toupee|tricholog(?:ist|y)|alopecia|scalp)\b/i;

export function isMarketplaceBlogPost(post: {
  title?: string;
  excerpt?: string;
  content?: string;
  author?: string;
  tags?: string | string[];
}) {
  const searchable = [post.title, post.excerpt, post.content, post.author, post.tags]
    .flat()
    .filter(Boolean)
    .join(' ');

  return !LEGACY_HAIR_CONTENT.test(searchable);
}

export async function getAllBlogs() {
  try {
    const response = await fetch(
      `${API_URL}/blogs/published`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch blogs");
    }

    const data = await response.json();

    return data.data || [];
  } catch (error) {
    console.error("Blog fetch error:", error);
    return [];
  }
}