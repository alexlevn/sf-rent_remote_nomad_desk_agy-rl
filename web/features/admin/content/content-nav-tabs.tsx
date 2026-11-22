'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, FileText } from 'lucide-react';

const ACTIVE_TAB =
  'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 border-[var(--color-brand)] text-[var(--color-brand)] cursor-pointer';
const INACTIVE_TAB =
  'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 border-transparent text-neutral-500 hover:text-neutral-900 transition-colors';

interface ContentNavTabsProps {
  active: 'guides' | 'blog';
  activeCount: number;
  // Clicking the active tab while editing returns to the list
  onActiveClick: () => void;
  // Returns false when navigation away must be cancelled (save in flight / unsaved changes)
  canLeave: () => boolean;
}

export function ContentNavTabs({ active, activeCount, onActiveClick, canLeave }: ContentNavTabsProps) {
  const guard = (e: React.MouseEvent) => {
    if (!canLeave()) e.preventDefault();
  };

  const guidesTab =
    active === 'guides' ? (
      <button type="button" onClick={onActiveClick} className={ACTIVE_TAB}>
        <BookOpen className="w-4 h-4" />
        <span>Travel Guides ({activeCount})</span>
      </button>
    ) : (
      <Link href="/admin/guides" onClick={guard} className={INACTIVE_TAB}>
        <BookOpen className="w-4 h-4" />
        <span>Travel Guides</span>
      </Link>
    );

  const blogTab =
    active === 'blog' ? (
      <button type="button" onClick={onActiveClick} className={ACTIVE_TAB}>
        <FileText className="w-4 h-4" />
        <span>Blog Posts ({activeCount})</span>
      </button>
    ) : (
      <Link href="/admin/blog" onClick={guard} className={INACTIVE_TAB}>
        <FileText className="w-4 h-4" />
        <span>Blog Posts</span>
      </Link>
    );

  return (
    <div className="flex items-center gap-2 border-b border-[var(--color-border-light)] pb-px">
      {guidesTab}
      {blogTab}
    </div>
  );
}
