'use client';

import React, { useState, useMemo } from 'react';
import { BuilderHardwarePicker } from './builder-hardware-picker';
import { BuilderSummaryCard, type SummaryBreakdownItem } from './builder-summary-card';
import type { WorkstationComponentOption, WorkstationData } from '@/lib/types';

const FALLBACK_PRO_PRICE_EUR = 150;

interface WorkstationBuilderContainerProps {
  workstationData: WorkstationData;
}

function getDefaultOptionId(options: WorkstationComponentOption[]): string {
  const included = options.find((opt) => opt.isIncluded || opt.pricePerMonth === 0);
  return included?.id ?? options[0]?.id ?? '';
}

function getUpgradeOptionId(options: WorkstationComponentOption[]): string {
  const paid = options.find((opt) => opt.pricePerMonth > 0);
  return paid?.id ?? options[options.length - 1]?.id ?? '';
}

export function WorkstationBuilderContainer({ workstationData }: WorkstationBuilderContainerProps) {
  const { components, addons } = workstationData;
  const proPkg = workstationData.packages.find((p) => p.slug === 'pro-upgrade' || p.id === 'pro');
  const proPriceEUR = proPkg ? Math.round(proPkg.pricePerMonth / 100) : FALLBACK_PRO_PRICE_EUR;

  const defaultMonitor = getDefaultOptionId(components.monitor);
  const defaultChair = getDefaultOptionId(components.chair);
  const defaultDesk = getDefaultOptionId(components.desk);
  const defaultKm = getDefaultOptionId(components.keyboardMouse);

  const proMonitor = getUpgradeOptionId(components.monitor);
  const proChair = getUpgradeOptionId(components.chair);
  const proDesk = getUpgradeOptionId(components.desk);
  const proKm = getUpgradeOptionId(components.keyboardMouse);

  const [selectedMonitor, setSelectedMonitor] = useState<string>(defaultMonitor);
  const [selectedChair, setSelectedChair] = useState<string>(defaultChair);
  const [selectedDesk, setSelectedDesk] = useState<string>(defaultDesk);
  const [selectedKeyboardMouse, setSelectedKeyboardMouse] = useState<string>(defaultKm);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleReset = () => {
    setSelectedMonitor(defaultMonitor);
    setSelectedChair(defaultChair);
    setSelectedDesk(defaultDesk);
    setSelectedKeyboardMouse(defaultKm);
    setSelectedAddons([]);
  };

  const handleApplyProPreset = () => {
    setSelectedMonitor(proMonitor);
    setSelectedChair(proChair);
    setSelectedDesk(proDesk);
    setSelectedKeyboardMouse(proKm);
    setSelectedAddons([]);
  };

  const { breakdownItems, totalUpgradeEUR, isProPreset } = useMemo(() => {
    const items: SummaryBreakdownItem[] = [];

    const mon = components.monitor.find((m) => m.id === selectedMonitor);
    if (mon && mon.pricePerMonth > 0) {
      items.push({ name: mon.name, priceEUR: mon.pricePerMonth / 100 });
    }

    const chair = components.chair.find((c) => c.id === selectedChair);
    if (chair && chair.pricePerMonth > 0) {
      items.push({ name: chair.name, priceEUR: chair.pricePerMonth / 100 });
    }

    const desk = components.desk.find((d) => d.id === selectedDesk);
    if (desk && desk.pricePerMonth > 0) {
      items.push({ name: desk.name, priceEUR: desk.pricePerMonth / 100 });
    }

    const km = components.keyboardMouse.find((k) => k.id === selectedKeyboardMouse);
    if (km && km.pricePerMonth > 0) {
      items.push({ name: km.name, priceEUR: km.pricePerMonth / 100 });
    }

    for (const addonId of selectedAddons) {
      const add = addons.find((a) => a.id === addonId);
      if (add) {
        items.push({ name: add.name, priceEUR: add.pricePerMonth / 100 });
      }
    }

    const matchesProPreset =
      selectedMonitor === proMonitor &&
      selectedChair === proChair &&
      selectedDesk === proDesk &&
      selectedKeyboardMouse === proKm &&
      selectedAddons.length === 0;

    let total = items.reduce((acc, curr) => acc + curr.priceEUR, 0);
    if (matchesProPreset && total !== proPriceEUR) {
      const adjustment = proPriceEUR - total;
      items.push({
        name: `${proPkg?.name || 'Pro Upgrade'} bundle adjustment`,
        priceEUR: adjustment,
      });
      total = proPriceEUR;
    }

    return {
      breakdownItems: items,
      totalUpgradeEUR: Math.round(total * 100) / 100,
      isProPreset: matchesProPreset,
    };
  }, [
    components,
    addons,
    selectedMonitor,
    selectedChair,
    selectedDesk,
    selectedKeyboardMouse,
    selectedAddons,
    proMonitor,
    proChair,
    proDesk,
    proKm,
    proPriceEUR,
    proPkg?.name,
  ]);

  const destinationUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('workstation', totalUpgradeEUR > 0 ? 'custom' : 'comfort');
    if (selectedMonitor && selectedMonitor !== defaultMonitor) {
      params.set('monitor', selectedMonitor);
    }
    if (selectedChair && selectedChair !== defaultChair) {
      params.set('chair', selectedChair);
    }
    if (selectedDesk && selectedDesk !== defaultDesk) {
      params.set('desk', selectedDesk);
    }
    if (selectedKeyboardMouse && selectedKeyboardMouse !== defaultKm) {
      params.set('km', selectedKeyboardMouse);
    }
    if (selectedAddons.length > 0) {
      params.set('addons', selectedAddons.join(','));
    }
    if (totalUpgradeEUR > 0) {
      params.set('upgradeMonthlyEUR', String(totalUpgradeEUR));
    }
    return `/c/furnished-apartments-madrid?${params.toString()}`;
  }, [
    selectedMonitor,
    selectedChair,
    selectedDesk,
    selectedKeyboardMouse,
    selectedAddons,
    defaultMonitor,
    defaultChair,
    defaultDesk,
    defaultKm,
    totalUpgradeEUR,
  ]);

  return (
    <div className="flex flex-col lg:flex-row gap-10 items-start">
      <div className="flex-1 w-full min-w-0">
        <BuilderHardwarePicker
          components={components}
          addons={addons}
          selectedMonitor={selectedMonitor}
          onSelectMonitor={setSelectedMonitor}
          selectedChair={selectedChair}
          onSelectChair={setSelectedChair}
          selectedDesk={selectedDesk}
          onSelectDesk={setSelectedDesk}
          selectedKeyboardMouse={selectedKeyboardMouse}
          onSelectKeyboardMouse={setSelectedKeyboardMouse}
          selectedAddons={selectedAddons}
          onToggleAddon={handleToggleAddon}
        />
      </div>

      <div className="w-full lg:w-[360px] shrink-0">
        <BuilderSummaryCard
          totalUpgradeEUR={totalUpgradeEUR}
          breakdownItems={breakdownItems}
          destinationUrl={destinationUrl}
          onReset={handleReset}
          onApplyProPreset={handleApplyProPreset}
          proPriceEUR={proPriceEUR}
          isProPreset={isProPreset}
        />
      </div>
    </div>
  );
}
