import Link from 'next/link';

export interface CitySummary {
  name: string;
  slug: string;
  propertiesCount: number;
}

export interface CountryGroupProps {
  country: string;
  totalApartments: number;
  cities: CitySummary[];
  continent?: string;
}

export function CountryGroup({
  country,
  totalApartments,
  cities,
}: CountryGroupProps) {
  const exploreSlug = cities[0]?.slug || '';

  return (
    <div className="bg-white border border-[var(--color-border-light)] rounded-2xl p-6 mb-8 shadow-xs">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4 border-b border-[var(--color-surface-muted)] pb-3">
        <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--color-text-on-light)]">
          <span>📍 {country}</span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-brand-light)] text-[var(--color-brand)] border border-[rgba(217,72,41,0.2)]">
            {totalApartments} {totalApartments === 1 ? 'apartment' : 'apartments'}
          </span>
        </h2>
        {exploreSlug && (
          <Link
            href={`/c/furnished-apartments-${exploreSlug}`}
            className="text-sm text-[var(--color-brand)] hover:underline font-medium inline-flex items-center gap-1"
          >
            Explore all in {country} →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5">
        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/c/furnished-apartments-${city.slug}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-white border border-[var(--color-border-light)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] rounded-full text-[var(--color-text-on-light)] transition-all shadow-2xs hover:shadow-xs"
          >
            <span className="font-medium">{city.name}</span>
            <span className="text-[var(--color-text-on-light-muted)] text-xs">
              ({city.propertiesCount})
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
