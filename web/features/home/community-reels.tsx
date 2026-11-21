'use client';

import { Badge } from '@/components/ui/badge';
import { HOME_CONTENT } from '@/content/home';
import type { CommunityVideo } from '@/lib/types';

interface CommunityReelsProps {
  videos: CommunityVideo[];
}

export function CommunityReels({ videos }: CommunityReelsProps) {
  // Use 7 videos if available
  const displayVideos = videos.slice(0, 7);

  return (
    <section className="py-16 sm:py-20 bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] border-t border-[var(--color-border-light)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <Badge variant="accent" className="mb-2">
            {HOME_CONTENT.reels.badge}
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-on-light)]">
            {HOME_CONTENT.reels.title}
          </h2>
          <p className="text-sm text-[var(--color-text-on-light-muted)] mt-1">
            {HOME_CONTENT.reels.subtitle}
          </p>
        </div>

        {/* Reels Horizontal Scroll / Grid */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
          {displayVideos.map((video) => (
            <div
              key={video.id}
              className="shrink-0 w-44 sm:w-52 aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700 relative shadow-md flex flex-col justify-between p-3 text-white snap-start group"
            >
              {/* Top Bar with Platform */}
              <div className="flex items-center justify-between z-10">
                <span className="bg-black/60 backdrop-blur-xs text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
                  {video.platform}
                </span>
                <span className="text-sm">▶</span>
              </div>

              {/* Decorative Reel Animation Backdrop */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 group-hover:scale-105 transition-transform duration-500" />

              {/* Center Play Icon */}
              <div className="relative z-10 self-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/40 group-hover:bg-[var(--color-brand)] transition-colors">
                ▶
              </div>

              {/* Bottom Author Meta */}
              <div className="relative z-10 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-neutral-700 border border-white/50 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {video.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">@{video.authorName}</div>
                  <div className="text-[10px] text-white/70 truncate">NomadDesk Guest</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
