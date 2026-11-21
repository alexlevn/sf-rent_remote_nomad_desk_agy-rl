import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SITE_CONFIG } from '@/content/site';

export default function HomePage() {
  return (
    <section className="flex-1 flex flex-col items-center justify-center p-8 sm:p-16 text-center max-w-4xl mx-auto">
      <Badge variant="accent" className="mb-4">
        ⚡ Dedicated Ergonomic Workstation in Every Home
      </Badge>
      <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[var(--color-text-on-light)] mb-4">
        Furnished Apartments for Monthly Rentals with Proper Desks
      </h1>
      <p className="text-base sm:text-lg text-[var(--color-text-on-light-muted)] max-w-2xl mb-8">
        Pack one suitcase. Arrive, unpack, and sit down at a dual-monitor 4K desk
        with guaranteed fiber internet in top remote work hubs worldwide.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button asChild size="lg" pill>
          <Link href={SITE_CONFIG.links.browse}>Browse Apartments</Link>
        </Button>
        <Button asChild variant="outline" size="lg" pill>
          <Link href={SITE_CONFIG.links.workstationBuilder}>
            Build Your Workstation
          </Link>
        </Button>
      </div>
    </section>
  );
}
