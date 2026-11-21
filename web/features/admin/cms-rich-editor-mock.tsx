'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Quote,
  Code,
  FileCode,
  Eye,
} from 'lucide-react';

export interface CmsRichEditorMockProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: string;
}

export function CmsRichEditorMock({
  value,
  onChange,
  label = 'Article Body (Rich WYSIWYG Editor)',
  placeholder = 'Write article content, headings, lists, links, or embed images...',
  minHeight = '300px',
}: CmsRichEditorMockProps) {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const visualRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef(false);

  // Sync value to contenteditable when switching modes or when value changed externally
  useEffect(() => {
    if (visualRef.current && !isInternalChangeRef.current) {
      if (visualRef.current.innerHTML !== value) {
        visualRef.current.innerHTML = value || '';
      }
    }
    isInternalChangeRef.current = false;
  }, [value, mode]);

  const handleVisualInput = () => {
    if (visualRef.current) {
      const html = visualRef.current.innerHTML;
      isInternalChangeRef.current = true;
      onChange(html);
    }
  };

  const exec = (command: string, cmdValue: string | undefined = undefined) => {
    if (mode !== 'visual') return;
    visualRef.current?.focus();
    // Use document.execCommand for standard browser editing
    document.execCommand(command, false, cmdValue);
    handleVisualInput();
  };

  const handleInsertLink = () => {
    const url = prompt('Enter link URL (e.g. https://example.com or /c/...):', 'https://');
    if (url) {
      exec('createLink', url);
    }
  };

  const handleInsertImage = () => {
    const src = prompt('Enter image URL:', '/seed/guide/placeholder.webp');
    if (src) {
      exec('insertImage', src);
    }
  };

  return (
    <div className="border border-[var(--color-border-light)] rounded-xl overflow-hidden bg-white shadow-2xs">
      {/* Editor Header & Toolbar */}
      <div className="bg-[var(--color-bg-light-alt)] border-b border-[var(--color-border-light)] p-2 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Toolbar Actions (active in visual mode) */}
        <div className="flex flex-wrap items-center gap-1">
          {mode === 'visual' ? (
            <>
              <button
                type="button"
                onClick={() => exec('formatBlock', 'h2')}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Heading 2"
                aria-label="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec('formatBlock', 'h3')}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Heading 3"
                aria-label="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-neutral-300 mx-1" />
              <button
                type="button"
                onClick={() => exec('bold')}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Bold"
                aria-label="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec('italic')}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Italic"
                aria-label="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-neutral-300 mx-1" />
              <button
                type="button"
                onClick={() => exec('insertUnorderedList')}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Bullet List"
                aria-label="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec('insertOrderedList')}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Numbered List"
                aria-label="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-neutral-300 mx-1" />
              <button
                type="button"
                onClick={handleInsertLink}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Insert Link"
                aria-label="Insert Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleInsertImage}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Insert Image"
                aria-label="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec('formatBlock', 'blockquote')}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Blockquote"
                aria-label="Blockquote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exec('formatBlock', 'pre')}
                className="p-1.5 rounded hover:bg-neutral-200 text-neutral-700 transition-colors cursor-pointer"
                title="Code Block"
                aria-label="Code Block"
              >
                <Code className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="text-xs font-medium text-[var(--color-text-on-light-muted)] px-2">
              Raw HTML Source Mode
            </span>
          )}
        </div>

        {/* Right: Mode Switcher (Visual vs HTML) */}
        <div className="flex items-center gap-1 bg-neutral-200 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
              mode === 'visual'
                ? 'bg-white text-[var(--color-text-on-light)] shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('html')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer ${
              mode === 'html'
                ? 'bg-white text-[var(--color-text-on-light)] shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>HTML</span>
          </button>
        </div>
      </div>

      {/* Editor Body Area */}
      <div className="p-4">
        {mode === 'visual' ? (
          <div
            ref={visualRef}
            contentEditable
            onInput={handleVisualInput}
            data-testid="rich-editor-visual"
            className="outline-none text-sm text-[var(--color-text-on-light)] leading-relaxed space-y-4 focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-400 empty:before:pointer-events-none"
            style={{ minHeight }}
            data-placeholder={placeholder}
          />
        ) : (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-testid="rich-editor-html"
            placeholder="<p>Enter raw HTML content here...</p>"
            rows={12}
            className="w-full font-mono text-xs text-neutral-800 bg-neutral-50 p-3 rounded-lg border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)] leading-relaxed resize-y"
            style={{ minHeight }}
          />
        )}
      </div>

      {/* Helper Footer */}
      <div className="px-4 py-2 border-t border-[var(--color-border-light)] bg-neutral-50/50 flex justify-between items-center text-[11px] text-[var(--color-text-on-light-muted)]">
        <span>{label}</span>
        <span>
          {mode === 'visual' ? 'WYSIWYG Mode' : 'Direct HTML Mode'} ·{' '}
          {value ? `${value.length} chars` : 'Empty'}
        </span>
      </div>
    </div>
  );
}
