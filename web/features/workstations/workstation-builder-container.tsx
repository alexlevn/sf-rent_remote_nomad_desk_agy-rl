'use client';

import React, { useState, useMemo } from 'react';
import { BuilderHardwarePicker } from './builder-hardware-picker';
import { BuilderSummaryCard, type SummaryBreakdownItem } from './builder-summary-card';
import type { WorkstationData } from '@/lib/types';

interface WorkstationBuilderContainerProps {
  workstationData: WorkstationData;
}

export function WorkstationBuilderContainer({ workstationData }: WorkstationBuilderContainerProps) {
  const { components, addons } = workstationData;

  // Initial baseline selection (Comfort Base defaults)
  const [selectedMonitor, setSelectedMonitor] = useState<string>('mon-ultrawide');
  const [selectedChair, setSelectedChair] = useState<string>('chair-ergo');
  const [selectedDesk, setSelectedDesk] = useState<string>('desk-std');
  const [selectedKeyboardMouse, setSelectedKeyboardMouse] = useState<string>('km-none');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Toggle accessory add-on
  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  // Reset all to Comfort Base (zero extra cost)
  const handleReset = () => {
    setSelectedMonitor('mon-ultrawide');
    setSelectedChair('chair-ergo');
    setSelectedDesk('desk-std');
    setSelectedKeyboardMouse('km-none');
    setSelectedAddons([]);
  };

  // Apply full Pro Upgrade preset (Standing Desk + Aeron + 4K Ultrawide + MX Master = €150/mo)
  const handleApplyProPreset = () => {
    setSelectedMonitor('mon-4k-ultrawide');
    setSelectedChair('chair-aeron');
    setSelectedDesk('desk-standing');
    setSelectedKeyboardMouse('km-mx');
    setSelectedAddons([]);
  };

  // Compute breakdown line items and total additional EUR cost realtime
  const { breakdownItems, totalUpgradeEUR } = useMemo(() => {
    const items: SummaryBreakdownItem[] = [];

    // Check Monitor
    const mon = components.monitor.find((m) => m.id === selectedMonitor);
    if (mon && mon.pricePerMonth > 0) {
      items.push({
        name: mon.id === 'mon-4k-ultrawide' ? '4K UHD Ultrawide Monitor' : mon.name,
        priceEUR: Math.round(mon.pricePerMonth / 100),
      });
    }

    // Check Chair
    const chair = components.chair.find((c) => c.id === selectedChair);
    if (chair && chair.pricePerMonth > 0) {
      items.push({
        name: chair.id === 'chair-aeron' ? 'Herman Miller Aeron' : chair.name,
        priceEUR: Math.round(chair.pricePerMonth / 100),
      });
    }

    // Check Desk
    const desk = components.desk.find((d) => d.id === selectedDesk);
    if (desk && desk.pricePerMonth > 0) {
      items.push({
        name: desk.id === 'desk-standing' ? 'Standing Desk (Motorized)' : desk.name,
        priceEUR: Math.round(desk.pricePerMonth / 100),
      });
    }

    // Check Keyboard & Mouse
    const km = components.keyboardMouse.find((k) => k.id === selectedKeyboardMouse);
    if (km && km.pricePerMonth > 0) {
      items.push({
        name: km.id === 'km-mx' ? 'Logitech MX Master 3S Bundle' : km.name,
        priceEUR: Math.round(km.pricePerMonth / 100),
      });
    }

    // Check Addons
    for (const addonId of selectedAddons) {
      const add = addons.find((a) => a.id === addonId);
      if (add) {
        items.push({
          name: add.name,
          priceEUR: Math.round(add.pricePerMonth / 100),
        });
      }
    }

    const total = items.reduce((acc, curr) => acc + curr.priceEUR, 0);

    return {
      breakdownItems: items,
      totalUpgradeEUR: total,
    };
  }, [
    components,
    addons,
    selectedMonitor,
    selectedChair,
    selectedDesk,
    selectedKeyboardMouse,
    selectedAddons,
  ]);

  // Construct query string for AC-BUILD-2 CTA redirect
  const destinationUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('workstation', totalUpgradeEUR > 0 ? 'custom' : 'comfort');
    if (selectedMonitor && selectedMonitor !== 'mon-ultrawide') {
      params.set('monitor', selectedMonitor);
    }
    if (selectedChair && selectedChair !== 'chair-ergo') {
      params.set('chair', selectedChair);
    }
    if (selectedDesk && selectedDesk !== 'desk-std') {
      params.set('desk', selectedDesk);
    }
    if (selectedKeyboardMouse && selectedKeyboardMouse !== 'km-none') {
      params.set('km', selectedKeyboardMouse);
    }
    if (selectedAddons.length > 0) {
      params.set('addons', selectedAddons.join(','));
    }
    if (totalUpgradeEUR > 0) {
      params.set('upgradeMonthlyEUR', totalUpgradeEUR.toString());
    }
    return `/c/furnished-apartments-madrid?${params.toString()}`;
  }, [
    selectedMonitor,
    selectedChair,
    selectedDesk,
    selectedKeyboardMouse,
    selectedAddons,
    totalUpgradeEUR,
  ]);

  return (
    <div className="flex flex-col lg:flex-row gap-10 items-start">
      {/* Left Column: Interactive Hardware Options */}
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

      {/* Right Column: Sticky Summary Card */}
      <div className="w-full lg:w-[360px] shrink-0">
        <BuilderSummaryCard
          totalUpgradeEUR={totalUpgradeEUR}
          breakdownItems={breakdownItems}
          destinationUrl={destinationUrl}
          onReset={handleReset}
          onApplyProPreset={handleApplyProPreset}
        />
      </div>
    </div>
  );
}
