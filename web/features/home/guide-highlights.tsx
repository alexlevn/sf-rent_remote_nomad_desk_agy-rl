import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HOME_CONTENT } from '@/content/home';
import { SITE_CONFIG } from '@/content/site';
import type { TravelGuide } from '@/lib/types';

interface GuideHighlightsProps {
  guides: TravelGuide[];
}

export function GuideHighlights({ guides }: GuideHighlightsProps) {
  const displayGuides = guides.slice(0, 3);
  const normalizeSrc = (src: string) => (src.startsWith('/') ? src : `/${src}`);

  return (
    <section className="py-16 sm:py-20 bg-[var(--color-bg-light-alt)] text-[var(--color-text-on-light)] border-t border-[var(--color-border-light)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-10 gap-4">
          <div>
            <Badge variant="neutral" className="mb-2">
              {HOME_CONTENT.guides.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
              {HOME_CONTENT.guides.title}
            </h2>
            <p className="text-sm text-[var(--color-text-on-light-muted)] mt-1">
              {HOME_CONTENT.guides.subtitle}
            </p>
          </div>
          <Button asChild variant="outline" pill className="self-start sm:self-auto text-xs sm:text-sm">
            <Link href={SITE_CONFIG.links.travelGuides}>
              {HOME_CONTENT.guides.exploreAllLabel}
            </Link>
          </Button>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {displayGuides.map((guide) => {
            const guideUrl = `/travel-guide/${guide.slug}`;
            return (
              <article
                key={guide.id}
                className="group bg-white rounded-2xl overflow-hidden border border-[var(--color-border-light)] shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="relative h-48 w-full overflow-hidden bg-neutral-100">
                  <Link href={guideUrl}>
                    <Image
                      src={normalizeSrc(guide.image || '/seed/guide/placeholder.jpg')}
                      alt={guide.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                    <span className="bg-black/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-xs">
                      {guide.city}
                    </span>
                    <span className="bg-white/90 text-[var(--color-text-on-light)] text-xs font-medium px-2.5 py-1 rounded-full">
                      {guide.category}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-[var(--color-text-on-light-muted)] font-medium mb-1.5">
                      {guide.publishDate}
                    </div>
                    <h3 className="text-base font-bold text-[var(--color-text-on-light)] mb-2 group-hover:text-[var(--color-brand)] transition-colors line-clamp-2">
                      <Link href={guideUrl}>{guide.title}</Link>
                    </h3>
                    <p className="text-xs text-[var(--color-text-on-light-muted)] line-clamp-3 mb-4 leading-relaxed">
                      {guide.excerpt}
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href={guideUrl}
                      className="text-xs font-bold text-[var(--color-brand)] inline-flex items-center gap-1 hover:underline"
                    >
                      Read Nomad Guide →
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
