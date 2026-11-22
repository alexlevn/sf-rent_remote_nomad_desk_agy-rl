'use client';

import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Columns2,
  Eye,
  FileCode,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Rows2,
  Table as TableIcon,
  Trash2,
  Undo2,
  Video as YoutubeIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type EditorMode = 'visual' | 'html';
export type InlineDialogType = 'link' | 'youtube' | null;

interface ToolbarButton {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

function toolbarBtnClass(isActive = false, disabled = false) {
  return cn(
    'flex items-center justify-center min-h-10 min-w-10 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded transition-colors cursor-pointer',
    isActive
      ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
      : 'text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)]',
    disabled && 'opacity-40 cursor-not-allowed',
  );
}

interface TiptapToolbarProps {
  editor: Editor | null;
  activeDialog: InlineDialogType;
  isMediaModalOpen: boolean;
  onOpenDialog: (type: Exclude<InlineDialogType, null>) => void;
  onOpenMedia: () => void;
}

export function TiptapToolbar({ editor, activeDialog, isMediaModalOpen, onOpenDialog, onOpenMedia }: TiptapToolbarProps) {
  const run = (fn: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => () => {
    if (editor) fn(editor.chain().focus()).run();
  };
  const isActive = (nameOrAttrs: string | Record<string, unknown>, attrs?: Record<string, unknown>) => {
    if (!editor) return false;
    return typeof nameOrAttrs === 'string' ? editor.isActive(nameOrAttrs, attrs) : editor.isActive(nameOrAttrs);
  };
  const isInTable = isActive('table');
  const canUndo = editor?.can().undo() ?? false;
  const canRedo = editor?.can().redo() ?? false;

  const groups: ToolbarButton[][] = [
    [
      { label: 'Heading 2', icon: Heading2, onClick: run((c) => c.toggleHeading({ level: 2 })), isActive: isActive('heading', { level: 2 }) },
      { label: 'Heading 3', icon: Heading3, onClick: run((c) => c.toggleHeading({ level: 3 })), isActive: isActive('heading', { level: 3 }) },
    ],
    [
      { label: 'Bold', icon: Bold, onClick: run((c) => c.toggleBold()), isActive: isActive('bold') },
      { label: 'Italic', icon: Italic, onClick: run((c) => c.toggleItalic()), isActive: isActive('italic') },
    ],
    [
      { label: 'Bullet List', icon: List, onClick: run((c) => c.toggleBulletList()), isActive: isActive('bulletList') },
      { label: 'Numbered List', icon: ListOrdered, onClick: run((c) => c.toggleOrderedList()), isActive: isActive('orderedList') },
    ],
    [
      { label: 'Link', icon: LinkIcon, onClick: () => onOpenDialog('link'), isActive: isActive('link') || activeDialog === 'link' },
      { label: 'Blockquote', icon: Quote, onClick: run((c) => c.toggleBlockquote()), isActive: isActive('blockquote') },
    ],
    [
      { label: 'Align Left', icon: AlignLeft, onClick: run((c) => c.setTextAlign('left')), isActive: isActive({ textAlign: 'left' }) },
      { label: 'Align Center', icon: AlignCenter, onClick: run((c) => c.setTextAlign('center')), isActive: isActive({ textAlign: 'center' }) },
      { label: 'Align Right', icon: AlignRight, onClick: run((c) => c.setTextAlign('right')), isActive: isActive({ textAlign: 'right' }) },
    ],
    [
      {
        label: 'Insert Table',
        icon: TableIcon,
        onClick: run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })),
        isActive: isInTable,
      },
      { label: 'Add Row', icon: Rows2, onClick: run((c) => c.addRowAfter()), disabled: !isInTable },
      { label: 'Add Column', icon: Columns2, onClick: run((c) => c.addColumnAfter()), disabled: !isInTable },
      { label: 'Delete Table', icon: Trash2, onClick: run((c) => c.deleteTable()), disabled: !isInTable },
    ],
    [
      { label: 'Insert Image', icon: ImageIcon, onClick: onOpenMedia, isActive: isMediaModalOpen },
      { label: 'Embed YouTube', icon: YoutubeIcon, onClick: () => onOpenDialog('youtube'), isActive: activeDialog === 'youtube' },
    ],
    [
      { label: 'Undo', icon: Undo2, onClick: run((c) => c.undo()), disabled: !canUndo },
      { label: 'Redo', icon: Redo2, onClick: run((c) => c.redo()), disabled: !canRedo },
    ],
  ];

  return (
    <>
      {groups.map((group, groupIdx) => (
        <React.Fragment key={group[0].label}>
          {groupIdx > 0 && <div className="h-4 w-px bg-[var(--color-border-light)] mx-1" />}
          {group.map(({ label, icon: Icon, onClick, isActive: active, disabled }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              disabled={disabled}
              className={toolbarBtnClass(active, disabled)}
              title={label}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </React.Fragment>
      ))}
    </>
  );
}

const MODE_OPTIONS: ReadonlyArray<{ mode: EditorMode; label: string; icon: LucideIcon }> = [
  { mode: 'visual', label: 'Editor', icon: Eye },
  { mode: 'html', label: 'HTML', icon: FileCode },
];

export function EditorModeSwitcher({ mode, onChange }: { mode: EditorMode; onChange: (mode: EditorMode) => void }) {
  return (
    <div
      className="flex items-center gap-1 bg-[var(--color-surface-muted)] p-0.5 rounded-lg text-xs font-semibold"
      role="tablist"
      aria-label="Editor mode"
    >
      {MODE_OPTIONS.map(({ mode: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={mode === option}
          onClick={() => onChange(option)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer',
            mode === option
              ? 'bg-[var(--color-bg-light-surface)] text-[var(--color-text-on-light)] shadow-2xs'
              : 'text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)]',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
