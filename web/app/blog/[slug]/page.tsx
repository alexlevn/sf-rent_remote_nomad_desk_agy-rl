import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getBlogPostBySlug, listBlogPosts } from '@/lib/api/blog';
import { hasHtmlTags, sanitizeHtml } from '@/lib/validations/content';
import { normalizeImageSrc } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { ArticleLayout } from '@/features/content/article-layout';

interface BlogDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found | NomadDesk',
    };
  }

  const title = post.seoTitle?.trim() || `${post.title} | NomadDesk Blog`;
  const description = post.seoDescription?.trim() || post.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      images: post.image ? [{ url: normalizeImageSrc(post.image, '/seed/blog/blog-1.webp') }] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  // Fetch related posts (excluding current)
  const allPosts = await listBlogPosts();
  const relatedPosts = allPosts.filter((p) => p.slug !== slug).slice(0, 2);

  const breadcrumbs = [
    { label: 'Blog', href: '/blog' },
    { label: post.category },
  ];

  return (
    <ArticleLayout
      breadcrumbs={breadcrumbs}
      badgeText={post.category}
      badgeVariant="neutral"
      title={post.title}
      author={post.author}
      publishDate={post.publishDate}
      readTime={post.readTime}
      image={post.image}
      imageAlt={post.title}
      leadText={post.excerpt}
      afterContent={
        relatedPosts.length > 0 ? (
          <div className="pt-10 border-t border-[var(--color-border-light)] mt-12">
            <h3 className="text-xl font-bold text-[var(--color-text-on-light)] mb-6">
              Related Articles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="group block bg-white border border-[var(--color-border-light)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative h-36 w-full bg-neutral-100 overflow-hidden">
                    <Image
                      src={normalizeImageSrc(related.image, '/seed/blog/blog-1.webp')}
                      alt={related.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 360px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <Badge variant="neutral" className="text-[10px] mb-2">
                      {related.category}
                    </Badge>
                    <h4 className="text-sm font-bold text-[var(--color-text-on-light)] group-hover:text-[var(--color-brand)] line-clamp-2 transition-colors mb-2">
                      {related.title}
                    </h4>
                    <p className="text-xs text-[var(--color-text-on-light-muted)] line-clamp-2">
                      {related.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : undefined
      }
    >
      {/* Rich Editorial Body */}
      {hasHtmlTags(post.content) ? (
        <div
          className="rich-html-content prose prose-neutral max-w-none text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)] space-y-4"
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(post.content),
          }}
        />
      ) : (
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-on-light)] mt-6 mb-4">
            Comparing Total Costs vs Traditional Vacation Rentals
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)] mb-5">
            Traditional hotel and short-term platforms slap on service surcharges ranging from 14% to 22%, combined with variable cleaning fees and local tourist taxes. By committing to monthly stays (30+ days), guests unlock institutional rates while host operators enjoy guaranteed occupancy.
          </p>

          {/* Key Takeaway Callout Box */}
          <div className="bg-[var(--color-bg-light-subtle)] border border-[var(--color-border-light)] rounded-xl p-5 my-6">
            <strong className="block text-sm sm:text-base font-bold text-[var(--color-text-on-light)] mb-1">
              Key Takeaway for Tech Workers:
            </strong>
            <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] leading-relaxed">
              A dedicated workstation in your apartment eliminates the need for expensive €250/mo coworking hot-desk memberships while providing complete privacy for confidential video calls.
            </p>
          </div>

          <p className="text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)]">
            {post.content}
          </p>
        </div>
      )}
    </ArticleLayout>
  );
}
