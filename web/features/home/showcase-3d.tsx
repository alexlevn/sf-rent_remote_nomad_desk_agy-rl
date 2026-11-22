import { Badge } from '@/components/ui/badge';
import { HOME_CONTENT } from '@/content/home';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Showcase3DProps {
  property?: Property;
}

export function Showcase3D({ property }: Showcase3DProps = {}) {
  return (
    <section className="py-20 sm:py-24 bg-[var(--color-bg-dark)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <Badge variant="accent" className="mb-3">
            {HOME_CONTENT.showcase.badge}
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            {HOME_CONTENT.showcase.title}
          </h2>
          <p className="text-sm sm:text-base text-neutral-400">
            {HOME_CONTENT.showcase.subtitle}
          </p>
        </div>

        {/* 3 Step Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12">
          {HOME_CONTENT.showcase.steps.map((item) => (
            <div
              key={item.step}
              className={cn(
                'rounded-2xl p-6 sm:p-7 border transition-all',
                item.highlight
                  ? 'bg-neutral-800/90 border-[var(--color-brand)]/60 shadow-xl'
                  : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700',
              )}
            >
              <div
                className={cn(
                  'text-2xl sm:text-3xl font-extrabold mb-3',
                  item.highlight ? 'text-[var(--color-brand)]' : 'text-neutral-500',
                )}
              >
                {item.step}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* 3D Isometric / Workspace Room Inspection Preview Box */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-950 border border-neutral-800 p-6 sm:p-10 flex flex-col lg:flex-row items-center gap-8 shadow-2xl">
          <div className="flex-1">
            <span className="text-xs font-semibold tracking-wider text-[var(--color-brand)] uppercase">
              Virtual 3D Room Tour
            </span>
            <h3
              data-testid="showcase-3d-title"
              className="text-xl sm:text-2xl font-bold text-white mt-1 mb-3"
            >
              {property ? property.title : 'Ergonomic Layouts Inspected for High-Output Work'}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 mb-6 leading-relaxed">
              Every home is verified with electric sit-stand desks, 4K monitor arms, calibrated task lighting, and minimum 300 Mbps symmetrical fiber connectivity.
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-[var(--color-brand)] font-bold">✓</span>
                Dual 4K / Ultrawide Display
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-[var(--color-brand)] font-bold">✓</span>
                Herman Miller Aeron / Mesh Chair
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-[var(--color-brand)] font-bold">✓</span>
                Ethernet & Guaranteed Fiber
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="text-[var(--color-brand)] font-bold">✓</span>
                Quiet Acoustic Environments
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 aspect-video bg-neutral-900 rounded-xl border border-neutral-800 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-900 to-neutral-800 opacity-90" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-brand)]/20 border border-[var(--color-brand)] flex items-center justify-center text-2xl mb-3 text-[var(--color-brand)]">
                📐
              </div>
              <div className="text-sm font-bold text-white mb-1">
                3D Digital Twin & Floorplan Available
              </div>
              <p className="text-xs text-neutral-400 max-w-xs">
                Inspect window glare angles, acoustic isolation, and power outlet positions before booking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
