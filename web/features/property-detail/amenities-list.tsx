import React from 'react';
import {
  Wifi,
  Monitor,
  Utensils,
  Shirt,
  Sun,
  Dog,
  Waves,
  Dumbbell,
  Wind,
  Flame,
  KeyRound,
  ShieldAlert,
  Building,
} from 'lucide-react';
import type { Property } from '@/lib/types';

interface AmenitiesListProps {
  property: Property;
}

export function AmenitiesList({ property }: AmenitiesListProps) {
  const allAmenities = [
    {
      label: `High-Speed Fiber WiFi (${property.workstation?.wifiSpeed || 600} Mbps)`,
      icon: Wifi,
      available: true,
    },
    {
      label: 'Dedicated Workstation (Monitor, Desk, Ergonomic Chair)',
      icon: Monitor,
      available: property.workstation?.hasWorkstation ?? true,
    },
    {
      label: 'Fully Equipped Gourmet Kitchen',
      icon: Utensils,
      available: property.kitchen,
    },
    {
      label: 'In-Unit Washer & Dryer',
      icon: Shirt,
      available: property.laundry,
    },
    {
      label: 'Private Balcony with City Views',
      icon: Sun,
      available: property.balcony,
    },
    {
      label: 'Outdoor Terrace',
      icon: Sun,
      available: property.terrace,
    },
    {
      label: 'Pet Friendly Residence',
      icon: Dog,
      available: property.petFriendly,
    },
    {
      label: 'Swimming Pool Access',
      icon: Waves,
      available: property.pool,
    },
    {
      label: 'Fitness Center / Private Gym',
      icon: Dumbbell,
      available: property.gym,
    },
    {
      label: 'Air Conditioning & Climate Control',
      icon: Wind,
      available: true,
    },
    {
      label: 'Radiant Central Heating',
      icon: Flame,
      available: true,
    },
    {
      label: 'Elevator & Direct Lift Access',
      icon: Building,
      available: true,
    },
    {
      label: 'Smart Keyless Entry / Self Check-in',
      icon: KeyRound,
      available: true,
    },
    {
      label: 'Smoke & Carbon Monoxide Detectors',
      icon: ShieldAlert,
      available: true,
    },
  ];

  const activeAmenities = allAmenities.filter((a) => a.available);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-[var(--color-text-on-light)] mb-4">
        What This Place Offers
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {activeAmenities.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-white border border-[var(--color-border-light)] rounded-xl text-sm text-[var(--color-text-on-light)] shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-light-alt)] flex items-center justify-center shrink-0 text-[var(--color-brand)]">
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-medium">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
