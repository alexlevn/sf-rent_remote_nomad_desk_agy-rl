import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { normalizeImageSrc } from '@/lib/format';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface ArticleLayoutProps {
  breadcrumbs: BreadcrumbItem[];
  badgeText: string;
  badgeVariant?: BadgeProps['variant'];
  title: string;
  author?: string;
  publishDate?: string;
  readTime?: string;
  image: string;
  imageAlt?: string;
  leadText?: string;
  children: React.ReactNode;
  afterContent?: React.ReactNode;
}

export function ArticleLayout({
  breadcrumbs,
  badgeText,
  badgeVariant = 'accent',
  title,
  author = 'NomadDesk Editorial Team',
  publishDate = 'Updated November 2026',
  readTime = '5 min read',
  image,
  imageAlt,
  leadText,
  children,
  afterContent,
}: ArticleLayoutProps) {
  return (
    <article className="w-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-12 sm:pt-8 sm:pb-16">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="text-xs text-[var(--color-text-on-light-muted)] mb-4 flex items-center gap-1.5 flex-wrap">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label}>
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[var(--color-brand)] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'font-medium text-[var(--color-text-on-light)]' : ''}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <span className="text-[var(--color-border-light)]">/</span>}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Category Badge */}
        <div className="mb-3">
          <Badge variant={badgeVariant}>{badgeText}</Badge>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-text-on-light)] leading-tight mb-4">
          {title}
        </h1>

        {/* Editorial Meta */}
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-on-light-muted)] mb-8 flex-wrap">
          <span>By {author}</span>
          <span className="text-[var(--color-border-light)]">·</span>
          <span>{readTime}</span>
          <span className="text-[var(--color-border-light)]">·</span>
          <span>{publishDate}</span>
        </div>

        {/* Hero Image */}
        <div className="relative h-[240px] sm:h-[340px] md:h-[380px] w-full rounded-2xl overflow-hidden mb-8 shadow-sm bg-neutral-100">
          <Image
            src={normalizeImageSrc(image, '/seed/guide/362.webp')}
            alt={imageAlt || title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>

        {/* Lead Summary */}
        {leadText && (
          <p className="text-base sm:text-lg font-medium text-[var(--color-text-on-light-secondary)] leading-relaxed mb-6">
            {leadText}
          </p>
        )}

        {/* Rich Article Content */}
        <div className="text-sm sm:text-base leading-relaxed text-[var(--color-text-on-light)] space-y-6">
          {children}
        </div>

        {/* After Content (Suggested Apartments or Related Articles) */}
        {afterContent && <div className="mt-12">{afterContent}</div>}
      </div>
    </article>
  );
}
