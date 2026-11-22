'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Youtube, { isValidYoutubeUrl } from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaLibraryModal } from '@/features/media/media-library-modal';

export interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: string;
  testIdPrefix?: string;
  editorId?: string;
}

type EditorMode = 'visual' | 'html';
type InlineDialogType = 'link' | 'youtube' | null;

function isSafeLinkUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^(https?:\/\/|mailto:|\/|#)/i.test(trimmed);
}

export function TiptapEditor({
  value,
  onChange,
  label = 'Rich Content Editor',
  placeholder = 'Write content, headings, lists, links, tables, or embed media...',
  minHeight = '300px',
  testIdPrefix = 'rich-editor',
  editorId,
}: TiptapEditorProps) {
  const [mode, setMode] = useState<EditorMode>('visual');
  const [activeDialog, setActiveDialog] = useState<InlineDialogType>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [dialogInput, setDialogInput] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);

  const isSyncingFromPropRef = useRef(false);
  const lastEmittedHtmlRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    // Tiptap v3 defaults to false; true keeps toolbar active/disabled states in sync with selection
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        link: false,
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        allowBase64: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({
        nocookie: true,
        width: 640,
        height: 360,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        ...(editorId ? { id: editorId } : {}),
        class: 'tiptap-content outline-none text-sm text-[var(--color-text-on-light)] focus:outline-none',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (isSyncingFromPropRef.current) return;
      const html = currentEditor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChangeRef.current(html);
    },
  });

  // Sync external prop changes (e.g. loading a different record or editing in HTML mode)
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedHtmlRef.current) return;

    if (mode === 'visual') {
      isSyncingFromPropRef.current = true;
      editor.commands.setContent(value || '', { emitUpdate: false });
      isSyncingFromPropRef.current = false;
    }
  }, [editor, value, mode]);

  const openDialog = (type: Exclude<InlineDialogType, null>) => {
    setIsMediaModalOpen(false);
    setDialogError(null);
    if (type === 'link') {
      const existingHref = (editor?.getAttributes('link').href as string | undefined) ?? '';
      setDialogInput(existingHref);
    } else {
      setDialogInput('');
    }
    setActiveDialog(type);
  };

  const closeDialog = (restoreFocus = false) => {
    setActiveDialog(null);
    setDialogInput('');
    setDialogError(null);
    if (restoreFocus) {
      editor?.chain().focus().run();
    }
  };

  const handleApplyDialog = () => {
    if (!editor || !activeDialog) return;
    const trimmed = dialogInput.trim();

    if (activeDialog === 'link') {
      if (!trimmed) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        closeDialog();
        return;
      }
      if (!isSafeLinkUrl(trimmed)) {
        setDialogError('Enter a valid URL starting with https://, http://, mailto:, /, or #.');
        return;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
      closeDialog();
      return;
    }

    if (activeDialog === 'youtube') {
      if (!trimmed || !isValidYoutubeUrl(trimmed)) {
        setDialogError('Enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...).');
        return;
      }
      editor.chain().focus().setYoutubeVideo({ src: trimmed }).run();
      closeDialog();
    }
  };

  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyDialog();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDialog(true);
    }
  };

  const handleModeSwitch = (nextMode: EditorMode) => {
    if (nextMode === mode) return;
    closeDialog();
    setIsMediaModalOpen(false);
    setMode(nextMode);
  };

  const handleRawHtmlChange = (nextHtml: string) => {
    lastEmittedHtmlRef.current = null;
    onChange(nextHtml);
  };

  const toolbarBtnClass = (isActive = false, disabled = false) =>
    cn(
      'flex items-center justify-center min-h-10 min-w-10 sm:min-h-0 sm:min-w-0 p-2 sm:p-1.5 rounded transition-colors cursor-pointer',
      isActive
        ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
        : 'text-[var(--color-text-on-light)] hover:bg-[var(--color-surface-muted)]',
      disabled && 'opacity-40 cursor-not-allowed'
    );

  const isInTable = editor?.isActive('table') ?? false;

  return (
    <div className="border border-[var(--color-border-light)] rounded-xl overflow-hidden bg-[var(--color-bg-light-surface)] shadow-2xs">
      {/* Header & Toolbar */}
      <div className="bg-[var(--color-bg-light-alt)] border-b border-[var(--color-border-light)] p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {mode === 'visual' ? (
            <>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className={toolbarBtnClass(editor?.isActive('heading', { level: 2 }))}
                title="Heading 2"
                aria-label="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                className={toolbarBtnClass(editor?.isActive('heading', { level: 3 }))}
                title="Heading 3"
                aria-label="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-[var(--color-border-light)] mx-1" />

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={toolbarBtnClass(editor?.isActive('bold'))}
                title="Bold"
                aria-label="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={toolbarBtnClass(editor?.isActive('italic'))}
                title="Italic"
                aria-label="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-[var(--color-border-light)] mx-1" />

              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className={toolbarBtnClass(editor?.isActive('bulletList'))}
                title="Bullet List"
                aria-label="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className={toolbarBtnClass(editor?.isActive('orderedList'))}
                title="Numbered List"
                aria-label="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-[var(--color-border-light)] mx-1" />

              <button
                type="button"
                onClick={() => openDialog('link')}
                className={toolbarBtnClass(editor?.isActive('link') || activeDialog === 'link')}
                title="Link"
                aria-label="Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                className={toolbarBtnClass(editor?.isActive('blockquote'))}
                title="Blockquote"
                aria-label="Blockquote"
              >
                <Quote className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-[var(--color-border-light)] mx-1" />

              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                className={toolbarBtnClass(editor?.isActive({ textAlign: 'left' }))}
                title="Align Left"
                aria-label="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                className={toolbarBtnClass(editor?.isActive({ textAlign: 'center' }))}
                title="Align Center"
                aria-label="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                className={toolbarBtnClass(editor?.isActive({ textAlign: 'right' }))}
                title="Align Right"
                aria-label="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-[var(--color-border-light)] mx-1" />

              <button
                type="button"
                onClick={() =>
                  editor
                    ?.chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                }
                className={toolbarBtnClass(isInTable)}
                title="Insert Table"
                aria-label="Insert Table"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().addRowAfter().run()}
                disabled={!isInTable}
                className={toolbarBtnClass(false, !isInTable)}
                title="Add Row"
                aria-label="Add Row"
              >
                <Rows2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
                disabled={!isInTable}
                className={toolbarBtnClass(false, !isInTable)}
                title="Add Column"
                aria-label="Add Column"
              >
                <Columns2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().deleteTable().run()}
                disabled={!isInTable}
                className={toolbarBtnClass(false, !isInTable)}
                title="Delete Table"
                aria-label="Delete Table"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-[var(--color-border-light)] mx-1" />

              <button
                type="button"
                onClick={() => {
                  closeDialog();
                  setIsMediaModalOpen(true);
                }}
                className={toolbarBtnClass(isMediaModalOpen)}
                title="Insert Image"
                aria-label="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => openDialog('youtube')}
                className={toolbarBtnClass(activeDialog === 'youtube')}
                title="Embed YouTube"
                aria-label="Embed YouTube"
              >
                <YoutubeIcon className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-[var(--color-border-light)] mx-1" />

              <button
                type="button"
                onClick={() => editor?.chain().focus().undo().run()}
                disabled={!editor?.can().undo()}
                className={toolbarBtnClass(false, !editor?.can().undo())}
                title="Undo"
                aria-label="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => editor?.chain().focus().redo().run()}
                disabled={!editor?.can().redo()}
                className={toolbarBtnClass(false, !editor?.can().redo())}
                title="Redo"
                aria-label="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="text-xs font-medium text-[var(--color-text-on-light-muted)] px-2">
              Raw HTML Source Mode
            </span>
          )}
        </div>

        {/* Mode Switcher (Editor vs HTML) */}
        <div
          className="flex items-center gap-1 bg-[var(--color-surface-muted)] p-0.5 rounded-lg text-xs font-semibold"
          role="tablist"
          aria-label="Editor mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'visual'}
            onClick={() => handleModeSwitch('visual')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer',
              mode === 'visual'
                ? 'bg-[var(--color-bg-light-surface)] text-[var(--color-text-on-light)] shadow-2xs'
                : 'text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)]'
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'html'}
            onClick={() => handleModeSwitch('html')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer',
              mode === 'html'
                ? 'bg-[var(--color-bg-light-surface)] text-[var(--color-text-on-light)] shadow-2xs'
                : 'text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)]'
            )}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>HTML</span>
          </button>
        </div>
      </div>

      {/* Inline Dialog Panel (Link / YouTube) — one dialog at a time, no window.prompt */}
      {mode === 'visual' && activeDialog && (
        <div
          className="px-4 py-3 bg-[var(--color-bg-light)] border-b border-[var(--color-border-light)] space-y-2"
          data-testid={`${testIdPrefix}-inline-dialog`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={`${testIdPrefix}-dialog-input`}
              className="text-xs font-semibold text-[var(--color-text-on-light)] min-w-24"
            >
              {activeDialog === 'link' ? 'Link URL' : 'YouTube URL'}
            </label>
            <input
              id={`${testIdPrefix}-dialog-input`}
              type="text"
              value={dialogInput}
              onChange={(e) => {
                setDialogInput(e.target.value);
                if (dialogError) setDialogError(null);
              }}
              onKeyDown={handleDialogKeyDown}
              placeholder={
                activeDialog === 'link'
                  ? 'https://example.com or /c/madrid (leave empty to remove)'
                  : 'https://www.youtube.com/watch?v=...'
              }
              autoFocus
              className="flex-1 min-w-52 px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] text-[var(--color-text-on-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
            />
            <button
              type="button"
              onClick={handleApplyDialog}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-brand)] text-[var(--color-brand-text)] hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => closeDialog(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border-light)] bg-[var(--color-bg-light-surface)] text-[var(--color-text-on-light-muted)] hover:text-[var(--color-text-on-light)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
          {dialogError && (
            <p className="text-xs text-[var(--color-error)]" role="alert">
              {dialogError}
            </p>
          )}
        </div>
      )}

      {/* Editor Body */}
      <div className="p-4">
        {mode === 'visual' ? (
          <div
            data-testid={`${testIdPrefix}-visual`}
            className="cursor-text"
            style={{ minHeight }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                editor?.chain().focus().run();
              }
            }}
          >
            <EditorContent editor={editor} />
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => handleRawHtmlChange(e.target.value)}
            data-testid={`${testIdPrefix}-html`}
            placeholder="<p>Enter raw HTML content here...</p>"
            rows={12}
            className="w-full font-mono text-xs text-[var(--color-text-on-light)] bg-[var(--color-bg-light)] p-3 rounded-lg border border-[var(--color-border-light)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] leading-relaxed resize-y"
            style={{ minHeight }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[var(--color-border-light)] bg-[var(--color-bg-light)] flex justify-between items-center text-[11px] text-[var(--color-text-on-light-muted)]">
        <span>{label}</span>
        <span>
          {mode === 'visual' ? 'WYSIWYG Mode' : 'Direct HTML Mode'} ·{' '}
          {value ? `${value.length} chars` : 'Empty'}
        </span>
      </div>

      <MediaLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => {
          setIsMediaModalOpen(false);
          editor?.chain().focus().run();
        }}
        onSelect={(items) => {
          const first = items[0];
          if (first && editor) {
            editor
              .chain()
              .focus()
              .setImage({
                src: first.url,
                alt: first.alt || undefined,
              })
              .run();
          }
          setIsMediaModalOpen(false);
        }}
        multiple={false}
        allowUrlTab={true}
        initialTab="upload"
        title="Insert Image"
      />
    </div>
  );
}
