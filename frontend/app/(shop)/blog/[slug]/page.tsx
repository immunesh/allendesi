import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, User } from 'lucide-react';
import { getAllBlogs, isMarketplaceBlogPost } from '@/lib/blog-api';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  image?: string | null;
  author?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
};

async function getPosts(): Promise<BlogPost[]> {
  return (await getAllBlogs()).filter(isMarketplaceBlogPost) as BlogPost[];
}

async function getPost(slug: string) {
  const posts = await getPosts();
  return { posts, post: posts.find((item) => item.slug === slug) };
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { post } = await getPost(params.slug);
  return {
    title: post ? `${post.title} | Allendesi Journal` : 'Allendesi Journal',
    description: post?.excerpt || 'Shopping guides, product ideas, and marketplace inspiration from Allendesi.',
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { posts, post } = await getPost(params.slug);
  if (!post) notFound();

  const relatedPosts = posts.filter((item) => item.slug !== post.slug).slice(0, 3);
  const publishedDate = formatDate(post.publishedAt || post.createdAt);

  return (
    <article>
      <section className="relative min-h-[300px] overflow-hidden bg-[#111111] sm:min-h-[380px]">
        <Image src={post.image || '/women.avif'} alt={post.title} fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
        <div className="container-custom relative flex min-h-[300px] flex-col justify-end py-8 text-white sm:min-h-[380px]">
          <Link href="/blog" className="mb-5 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Journal
          </Link>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/70">
            {post.author && <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" aria-hidden="true" />{post.author}</span>}
            {publishedDate && <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{publishedDate}</span>}
          </div>
        </div>
      </section>

      <div className="container-custom grid gap-10 py-10 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)] lg:py-14">
        <div>
          {post.excerpt && <p className="mb-8 border-l-2 border-red-500 pl-4 text-lg leading-relaxed text-white/75">{post.excerpt}</p>}
          {post.content ? (
            <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-p:text-gray-300 prose-p:leading-relaxed prose-li:text-gray-300 prose-a:text-red-400 prose-h2:text-2xl prose-h3:text-xl" dangerouslySetInnerHTML={{ __html: post.content }} />
          ) : (
            <p className="text-sm leading-relaxed text-white/70">{post.excerpt || 'More details will be available soon.'}</p>
          )}
          <div className="mt-10 border-t border-white/10 pt-7">
            <Link href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300">Explore products <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="border border-white/10 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">More from the Journal</h2>
            {relatedPosts.length > 0 ? (
              <div className="space-y-4">
                {relatedPosts.map((item) => (
                  <Link key={item.id} href={`/blog/${item.slug}`} className="group flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-[#171717]">
                      <Image src={item.image || '/women.avif'} alt={item.title} fill sizes="64px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                    <span className="text-sm font-medium leading-snug text-white/75 transition-colors group-hover:text-red-300">{item.title}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/55">New marketplace guides are on the way.</p>
            )}
          </div>
          <div className="border border-red-950 bg-[#130d0d] p-5">
            <h2 className="text-lg font-semibold text-white">Ready to browse?</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">Explore current products and collections on Allendesi.</p>
            <Link href="/products" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-400 hover:text-red-300">Shop All Products <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
