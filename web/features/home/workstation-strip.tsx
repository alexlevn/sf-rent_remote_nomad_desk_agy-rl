import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HOME_CONTENT } from '@/content/home';
import { SITE_CONFIG } from '@/content/site';

export function WorkstationStrip() {
  return (
    <section className="py-16 sm:py-20 bg-[var(--color-text-on-light)] text-[#fcfaf7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="max-w-2xl">
            <Badge
              variant="accent"
              className="bg-[var(--color-brand)] text-white border-transparent mb-3"
            >
              {HOME_CONTENT.workstationBanner.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-3 leading-tight">
              {HOME_CONTENT.workstationBanner.title}
            </h2>
            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
              {HOME_CONTENT.workstationBanner.description}
            </p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <Button
              asChild
              size="lg"
              pill
              className="w-full sm:w-auto shadow-xl hover:scale-105 transition-transform"
            >
              <Link href={SITE_CONFIG.links.workstationBuilder}>
                {HOME_CONTENT.workstationBanner.cta}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
