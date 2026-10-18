import React, { useRef, useMemo, useState } from 'react';
import { marked } from 'marked';
import { Paperclip, X, Image as ImageIcon, Hash, Columns, Eye, Edit3, ChevronDown } from 'lucide-react';
import { highlightCode } from '../utils/syntaxHighlighter';

// Alphabetically sorted file types (Requirement 4)
export const SYNTAX_OPTIONS = [
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'cpp', label: 'C / C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'css', label: 'CSS' },
  { value: 'csv', label: 'CSV' },
  { value: 'diff', label: 'Diff / Patch' },
  { value: 'go', label: 'Go' },
  { value: 'html', label: 'HTML' },
  { value: 'xml', label: 'XML' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'php', label: 'PHP' },
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'powershell', label: 'PowerShell (.ps1)' },
  { value: 'python', label: 'Python' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'toml', label: 'TOML' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'yaml', label: 'YAML' },
];

interface EditorPaneProps {
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  syntax: string;
  setSyntax: (syntax: string) => void;
  attachments: File[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  showLineNumbers: boolean;
  setShowLineNumbers: (show: boolean) => void;
  isStatelessMode?: boolean;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  title,
  setTitle,
  content,
  setContent,
  syntax,
  setSyntax,
  attachments,
  setAttachments,
  showLineNumbers,
  setShowLineNumbers,
  isStatelessMode = false,
}) => {
  const [editorViewMode, setEditorViewMode] = useState<'edit' | 'split' | 'preview'>('edit');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineGutterRef = useRef<HTMLDivElement>(null);

  // Line count computation
  const lineCount = useMemo(() => {
    return content.split('\n').length;
  }, [content]);

  // Real-time metrics
  const metrics = useMemo(() => {
    const bytes = new Blob([content]).size;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return {
      bytes,
      words,
      chars: content.length,
    };
  }, [content]);

  // Render markdown HTML
  const renderedMarkdown = useMemo(() => {
    if (!content) return '';
    try {
      return marked.parse(content, { breaks: true, gfm: true }) as string;
    } catch {
      return content;
    }
  }, [content]);

  // Synchronize scroll between gutter and textarea
  const handleScroll = () => {
    if (textareaRef.current && lineGutterRef.current) {
      lineGutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Tab key handling inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Attachment handler — allows all non-executable files
  const EXECUTABLE_EXTENSIONS = new Set([
    '.exe', '.msi', '.bat', '.cmd', '.com', '.scr', '.ps1', '.psm1', '.psd1',
    '.vbs', '.vbe', '.js', '.jse', '.wsf', '.wsh', '.hta', '.cpl', '.jar',
    '.app', '.deb', '.rpm', '.dmg', '.pkg', '.run', '.bin', '.sh', '.cgi',
    '.fcgi', '.is', '.msu', '.gadget', '.inf', '.reg', '.scf', '.lnk',
  ]);

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || isStatelessMode) return;
    const newFiles: File[] = [];

    for (const file of files) {
      const dotIdx = file.name.lastIndexOf('.');
      const ext = dotIdx >= 0 ? file.name.toLowerCase().substring(dotIdx) : '';
      if (!ext || !EXECUTABLE_EXTENSIONS.has(ext)) {
        newFiles.push(file);
      }
    }

    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const removeAttachment = (fileName: string) => {
    setAttachments((prev) => prev.filter((f) => f.name !== fileName));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderPreviewPane = () => {
    if (syntax === 'markdown') {
      return (
        <div
          className="prose prose-invert prose-base max-w-none prose-pre:bg-black/20 prose-pre:border prose-pre:border-[var(--sg-panel-border)] prose-a:text-sky-500"
          dangerouslySetInnerHTML={{ __html: renderedMarkdown || '<p class="text-[var(--sg-text-muted)] font-mono text-sm">Markdown preview empty</p>' }}
        />
      );
    }
    return (
      <div className="font-mono text-sm md:text-base leading-7 select-text overflow-x-auto">
        <pre className={`language-${syntax} !bg-transparent !p-0 !m-0`}>
          <code
            className={`language-${syntax}`}
            dangerouslySetInnerHTML={{
              __html: highlightCode(content, syntax) || '<span class="text-[var(--sg-text-muted)]">Preview empty</span>',
            }}
          />
        </pre>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 solid-glass-panel rounded-lg overflow-hidden transition-all duration-200">
      {/* Editor Top Bar - Solid Glass */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--sg-panel-border)] bg-black/5 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Sticky title..."
            className="w-full bg-transparent border-0 text-base md:text-lg font-mono text-[var(--sg-text)] placeholder-[var(--sg-text-muted)] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-sm font-mono">
          {/* Alphabetically sorted syntax selector: matched rounded-md corners */}
          <div className="relative flex items-center">
            <select
              value={syntax}
              onChange={(e) => setSyntax(e.target.value)}
              className="h-8 pl-2.5 pr-7 rounded-md solid-glass-input text-[var(--sg-input-text)] outline-none text-xs font-mono cursor-pointer appearance-none"
            >
              {SYNTAX_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--sg-text-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Attach images trigger (disabled when in Stateless Sticky mode) */}
          <button
            type="button"
            onClick={() => {
              if (isStatelessMode) return;
              fileInputRef.current?.click();
            }}
            disabled={isStatelessMode}
            className={`h-8 flex items-center gap-1.5 px-2.5 rounded-md border transition text-xs font-normal ${
              isStatelessMode
                ? 'opacity-40 cursor-not-allowed solid-glass-btn'
                : 'solid-glass-btn cursor-pointer'
            }`}
            title={
              isStatelessMode
                ? 'Images cannot be added to a stateless sticky. Switch to regular sticky to attach images.'
                : 'Attach images'
            }
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attachments ({attachments.length})</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=""
            multiple
            disabled={isStatelessMode}
            className="hidden"
            onChange={(e) => {
              handleFilesAdded(e.target.files);
              e.target.value = '';
            }}
          />

          {/* Line number gutter toggle: Icon only, rounded like edit/split/preview buttons */}
          {editorViewMode !== 'preview' && (
            <button
              type="button"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              className={`h-8 w-8 rounded-md flex items-center justify-center transition cursor-pointer text-xs ${
                showLineNumbers
                  ? 'solid-glass-btn-active text-[var(--sg-text)] font-medium'
                  : 'solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
              }`}
              title="Toggle line numbers"
              aria-label="Toggle line numbers"
            >
              <Hash className="w-4 h-4" />
            </button>
          )}

          {/* View Mode Toggle: Edit | Split | Preview (Far right of row, icon only, spaced by gap-2) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditorViewMode('edit')}
              className={`h-8 w-8 rounded-md flex items-center justify-center transition cursor-pointer text-xs ${
                editorViewMode === 'edit'
                  ? 'solid-glass-btn-active text-[var(--sg-text)] font-medium'
                  : 'solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
              }`}
              title="Edit Mode"
              aria-label="Edit Mode"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditorViewMode('split')}
              className={`h-8 w-8 rounded-md flex items-center justify-center transition cursor-pointer text-xs ${
                editorViewMode === 'split'
                  ? 'solid-glass-btn-active text-[var(--sg-text)] font-medium'
                  : 'solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
              }`}
              title="Split Mode"
              aria-label="Split Mode"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditorViewMode('preview')}
              className={`h-8 w-8 rounded-md flex items-center justify-center transition cursor-pointer text-xs ${
                editorViewMode === 'preview'
                  ? 'solid-glass-btn-active text-[var(--sg-text)] font-medium'
                  : 'solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
              }`}
              title="Preview Mode"
              aria-label="Preview Mode"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Body Area: Single, Split, or Preview with smoky translucent glass feel */}
      <div className="flex-1 relative flex min-h-[420px] md:min-h-[520px] bg-black/10 dark:bg-black/20">
        {/* Editor Pane (shown in 'edit' or 'split') */}
        {editorViewMode !== 'preview' && (
          <div className={`flex flex-1 relative ${editorViewMode === 'split' ? 'border-r border-[var(--sg-panel-border)]' : ''}`}>
            {showLineNumbers && (
              <div
                ref={lineGutterRef}
                className="w-14 select-none py-4 text-right pr-3 font-mono text-sm text-[var(--sg-text-muted)] border-r border-[var(--sg-panel-border)] bg-black/10 dark:bg-black/25 overflow-hidden leading-7 font-medium"
                aria-hidden="true"
              >
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={`line-${i}`}>{i + 1}</div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              placeholder="Paste, write code, or drop text here..."
              spellCheck={false}
              className="flex-1 bg-transparent p-4 font-mono text-sm md:text-base text-[var(--sg-text)] placeholder-[var(--sg-text-muted)] outline-none resize-none leading-7 overflow-y-auto selection:bg-white/20 dark:selection:bg-white/20 light:selection:bg-black/15"
            />
          </div>
        )}

            {editorViewMode !== 'edit' && (
              <div className="flex-1 p-5 overflow-y-auto bg-black/5 dark:bg-black/15 text-[var(--sg-text)] font-sans text-sm md:text-base">
                {renderPreviewPane()}
              </div>
            )}
      </div>

      {/* Attachment Preview Strip */}
      {attachments.length > 0 && (
        <div className="p-3 border-t border-[var(--sg-panel-border)] bg-black/5 dark:bg-white/[0.02]">
          <div className="text-xs md:text-sm font-mono text-[var(--sg-text)] mb-2 flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[var(--sg-text-muted)]" />
              Attached Files ({attachments.length} {attachments.length === 1 ? 'file' : 'files'})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {attachments.map((file) => {
              const previewUrl = URL.createObjectURL(file);
              return (
                <div
                  key={file.name}
                  className="group relative flex items-center gap-2 p-2 rounded-md solid-glass-btn text-xs font-mono overflow-hidden"
                >
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-10 h-10 object-cover rounded-md bg-black/40 border border-[var(--sg-panel-border)] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[var(--sg-text)] text-xs font-medium">{file.name}</p>
                    <p className="text-xs text-[var(--sg-text-muted)] font-normal">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(file.name)}
                    className="p-1 rounded-md hover:bg-white/10 text-[var(--sg-text-muted)] hover:text-rose-500 transition cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor Status Metrics Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--sg-panel-border)] bg-black/5 dark:bg-white/[0.02] text-xs md:text-sm font-mono text-[var(--sg-text-muted)] font-normal">
        <div className="flex items-center gap-4">
          <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
          <span>{metrics.words} words</span>
          <span>{metrics.chars} chars ({metrics.bytes} B)</span>
        </div>
        <div className="flex items-center gap-2">
          <span>UTF-8</span>
          <span className="text-[var(--sg-text-muted)] opacity-50">•</span>
          <span className="text-[var(--sg-text)] font-semibold capitalize">{syntax}</span>
        </div>
      </div>
    </div>
  );
};
