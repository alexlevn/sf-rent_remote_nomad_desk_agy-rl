'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { HOME_CONTENT } from '@/content/home';
import { isSafeImagePath } from '@/lib/validations/media';
import type { CommunityVideo } from '@/lib/types';

const MAX_DISPLAY_VIDEOS = 7;

interface CommunityReelsProps {
  videos: CommunityVideo[];
}

function getSafeExternalUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function CommunityReels({ videos }: CommunityReelsProps) {
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(() => new Set());
  const displayVideos = videos.slice(0, MAX_DISPLAY_VIDEOS);

  return (
    <section className="py-16 sm:py-20 bg-[var(--color-bg-light)] text-[var(--color-text-on-light)] border-t border-[var(--color-border-light)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        {displayVideos.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-[var(--color-border-light)] text-sm text-[var(--color-text-on-light-muted)]">
            Community reels will appear here soon.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
            {displayVideos.map((video) => {
              const avatarSrc = typeof video.avatar === 'string' ? video.avatar.trim() : '';
              const showAvatarImage =
                avatarSrc.length > 0 &&
                isSafeImagePath(avatarSrc) &&
                !failedAvatars.has(avatarSrc);
              const normalizedHandle = video.authorName.replace(/^@+/, '');
              const fallbackInitial = normalizedHandle.charAt(0).toUpperCase() || '?';
              const externalUrl = getSafeExternalUrl(video.url);

              const cardContent = (
                <>
                  <div className="flex items-center justify-between z-10">
                    <span className="bg-black/60 backdrop-blur-xs text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
                      {video.platform}
                    </span>
                    <span className="text-sm" aria-hidden="true">
                      ▶
                    </span>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 group-hover:scale-105 transition-transform duration-500" />

                  <div className="relative z-10 self-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white border border-white/40 group-hover:bg-[var(--color-brand)] transition-colors">
                    <span aria-hidden="true">▶</span>
                  </div>

                  <div className="relative z-10 flex items-center gap-2">
                    <div className="relative w-7 h-7 rounded-full overflow-hidden bg-neutral-700 border border-white/50 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {showAvatarImage ? (
                        <Image
                          src={avatarSrc}
                          alt={`${normalizedHandle} avatar`}
                          fill
                          unoptimized
                          sizes="28px"
                          className="object-cover"
                          onError={() =>
                            setFailedAvatars((prev) => {
                              if (prev.has(avatarSrc)) return prev;
                              const next = new Set(prev);
                              next.add(avatarSrc);
                              return next;
                            })
                          }
                        />
                      ) : (
                        fallbackInitial
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">@{normalizedHandle}</div>
                      <div className="text-[10px] text-white/70 truncate">NomadDesk Guest</div>
                    </div>
                  </div>
                </>
              );

              if (externalUrl) {
                return (
                  <a
                    key={video.id}
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Watch ${video.platform} reel by @${normalizedHandle}`}
                    className="shrink-0 w-44 sm:w-52 aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700 relative shadow-md flex flex-col justify-between p-3 text-white snap-start group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
                  >
                    {cardContent}
                  </a>
                );
              }

              return (
                <div
                  key={video.id}
                  className="shrink-0 w-44 sm:w-52 aspect-[9/16] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-700 relative shadow-md flex flex-col justify-between p-3 text-white snap-start group"
                >
                  {cardContent}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
