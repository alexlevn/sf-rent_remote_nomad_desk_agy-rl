'use client';

import React from 'react';
import {
  Building2,
  Users2,
  UserCheck2,
  FileCheck2,
  DollarSign,
  CalendarCheck,
} from 'lucide-react';

export interface AdminKpiStats {
  publishedProperties: number;
  activeHosts: number;
  pendingHosts: number;
  pendingProperties: number;
  totalReservations: number;
  estimatedGmvUSD: number;
  netCommissionUSD: number;
}

interface AdminKpiCardsProps {
  stats: AdminKpiStats;
}

export function AdminKpiCards({ stats }: AdminKpiCardsProps) {
  const cards = [
    {
      title: 'Published Properties',
      value: stats.publishedProperties.toString(),
      icon: Building2,
      subtext: 'Active in search results',
      valueColor: 'text-neutral-900',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Active Hosts',
      value: stats.activeHosts.toString(),
      icon: Users2,
      subtext: 'Verified partners',
      valueColor: 'text-neutral-900',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Pending Host Applicants',
      value: stats.pendingHosts.toString(),
      icon: UserCheck2,
      subtext: 'Applications to review',
      valueColor: stats.pendingHosts > 0 ? 'text-[var(--color-brand)]' : 'text-neutral-900',
      bgColor: 'bg-orange-50',
      iconColor: 'text-[var(--color-brand)]',
      highlight: stats.pendingHosts > 0,
    },
    {
      title: 'Pending Moderation',
      value: stats.pendingProperties.toString(),
      icon: FileCheck2,
      subtext: 'Listings pending review',
      valueColor: stats.pendingProperties > 0 ? 'text-amber-600' : 'text-neutral-900',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      title: 'Total Bookings',
      value: stats.totalReservations.toString(),
      icon: CalendarCheck,
      subtext: 'Completed & active stays',
      valueColor: 'text-neutral-900',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Platform Net Commission (10%)',
      value: `$${Math.round(stats.netCommissionUSD).toLocaleString('en-US')}`,
      icon: DollarSign,
      subtext: `From $${Math.round(stats.estimatedGmvUSD).toLocaleString('en-US')} gross volume`,
      valueColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 md:p-5 rounded-2xl bg-white border ${
              card.highlight
                ? 'border-[var(--color-brand)]/40 shadow-sm'
                : 'border-[var(--color-border-light)]'
            } flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium text-[var(--color-text-on-light-muted)] line-clamp-1">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl ${card.bgColor} ${card.iconColor} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className={`text-2xl md:text-3xl font-bold tracking-tight ${card.valueColor}`}>
                {card.value}
              </div>
              <div className="text-[11px] text-[var(--color-text-on-light-muted)] mt-1 truncate">
                {card.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
