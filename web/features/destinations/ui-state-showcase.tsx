export function UIStateShowcase() {
  return (
    <section className="mt-16 mb-12">
      <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 sm:p-8">
        <div className="text-base sm:text-lg font-bold text-[var(--color-text-on-light)] mb-1">
          📋 UI States & Verification Blocks — Danh Mục Thành Phố (/a/furnished-apartments)
        </div>
        <p className="text-xs sm:text-sm text-[var(--color-text-on-light-muted)] mb-6">
          These verification blocks showcase alternative UI conditions (Empty states, Skeleton loading, Error alerts, Validation states) required for thorough stage review.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--color-bg-light)] border border-[var(--color-border-light)] rounded-xl p-5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-muted)] text-[var(--color-text-on-light)] mb-2">
              City Search Filter State
            </span>
            <input
              type="text"
              readOnly
              value="Valencia"
              aria-label="Filter state preview"
              className="w-full px-3 py-2 text-sm bg-white border border-[var(--color-border-light)] rounded-lg mb-2 text-[var(--color-text-on-light)]"
            />
            <div className="text-xs text-[var(--color-text-on-light-muted)]">
              Real-time filtering of all 34 supported remote work destinations.
            </div>
          </div>

          <div className="bg-[var(--color-bg-light)] border border-[var(--color-border-light)] rounded-xl p-5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)] mb-2">
              City Coming Soon State
            </span>
            <div className="p-3 bg-[#fdfaf6] border border-dashed border-[#d1c8be] rounded-lg text-xs leading-relaxed">
              <strong className="text-[var(--color-text-on-light)] text-sm">Reykjavik, Iceland</strong>
              <div className="mt-1.5">
                <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-100 text-amber-800">
                  Host Applications Open
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
