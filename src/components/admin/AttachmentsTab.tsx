import React from 'react';
import {
  Paperclip,
  FileText,
  FileCode,
  Image,
  Video,
  Music2,
  Archive,
  FileQuestion,
  AlertTriangle,
  Loader2,
  Check,
} from 'lucide-react';
import { FileTypeCategories } from '../../types';

interface AttachmentsTabProps {
  fileTypeCategories: FileTypeCategories;
  setFileTypeCategories: (categories: FileTypeCategories) => void;
  maxFileSizeMB: number;
  setMaxFileSizeMB: (size: number) => void;
  onSave: () => void;
  saving: boolean;
}

export const AttachmentsTab: React.FC<AttachmentsTabProps> = ({
  fileTypeCategories,
  setFileTypeCategories,
  maxFileSizeMB,
  setMaxFileSizeMB,
  onSave,
  saving,
}) => {
  const categoriesList: Array<{
    key: keyof FileTypeCategories;
    label: string;
    envKey: string;
    icon: React.ReactNode;
    desc: string;
  }> = [
    {
      key: 'documents',
      label: 'Document Files',
      envKey: 'ALLOW_DOCUMENTS',
      icon: <FileText className="w-4 h-4 text-blue-400 shrink-0" />,
      desc: 'PDFs, Word docs, plain text, RTF, and OpenDocument (.pdf, .doc, .docx, .txt, .rtf, .odt)',
    },
    {
      key: 'code',
      label: 'Source Code & Scripts',
      envKey: 'ALLOW_CODE',
      icon: <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />,
      desc: 'Source files & configs (.js, .ts, .py, .java, .cpp, .html, .css, .json, .yaml, .md, .sql)',
    },
    {
      key: 'images',
      label: 'Visual Images & Diagrams',
      envKey: 'ALLOW_IMAGES',
      icon: <Image className="w-4 h-4 text-purple-400 shrink-0" />,
      desc: 'Screenshots, photos, and vector graphics (.png, .jpg, .jpeg, .gif, .webp, .svg, .bmp)',
    },
    {
      key: 'video',
      label: 'Video Recordings',
      envKey: 'ALLOW_VIDEO',
      icon: <Video className="w-4 h-4 text-rose-400 shrink-0" />,
      desc: 'Screen recordings & video clips (.mp4, .webm, .mov, .mkv, .avi)',
    },
    {
      key: 'audio',
      label: 'Audio Clips & Voice Notes',
      envKey: 'ALLOW_AUDIO',
      icon: <Music2 className="w-4 h-4 text-amber-400 shrink-0" />,
      desc: 'Audio clips and voice recordings (.mp3, .wav, .ogg, .m4a, .flac)',
    },
    {
      key: 'archives',
      label: 'Compressed Archives',
      envKey: 'ALLOW_ARCHIVES',
      icon: <Archive className="w-4 h-4 text-orange-400 shrink-0" />,
      desc: 'Compressed file packages (.zip, .tar, .gz, .7z, .rar, .bz2, .xz)',
    },
    {
      key: 'other',
      label: 'Other Non-Executable Files',
      envKey: 'ALLOW_OTHER',
      icon: <FileQuestion className="w-4 h-4 text-teal-400 shrink-0" />,
      desc: 'Any remaining file formats or extensions not categorized above',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--sg-text)] flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-[var(--sg-text-muted)]" />
          <span>Attachment & Upload Settings</span>
        </h3>
        <p className="text-xs text-[var(--sg-text-muted)] mt-0.5">
          Configure allowed file type categories and per-file attachment size limits matching .env specifications.
        </p>
      </div>

      {/* Setting 1: Max Filesize for Attachments */}
      <div className="p-4 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--sg-text)]">Max Filesize for Attachments</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-black/10 dark:bg-white/10 text-[var(--sg-text-muted)]">
                MAX_FILE_SIZE
              </span>
            </div>
            <p className="text-[11px] text-[var(--sg-text-muted)] mt-0.5">
              Maximum permitted size for each individual uploaded file attachment.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              value={maxFileSizeMB}
              onChange={(e) => setMaxFileSizeMB(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
              min="1"
              max="500"
              step="1"
              className="solid-glass-input rounded-md px-3 py-1.5 text-[var(--sg-input-text)] outline-none text-xs font-mono w-24 text-right"
            />
            <span className="text-xs text-[var(--sg-text-muted)] font-medium">MB</span>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--sg-panel-border)]/50">
          <span className="text-[11px] text-[var(--sg-text-muted)] mr-1">Presets:</span>
          {[5, 10, 15, 25, 50, 100].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setMaxFileSizeMB(size)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                maxFileSizeMB === size
                  ? 'solid-glass-btn-active text-[var(--sg-text)] font-semibold ring-1 ring-[var(--sg-text)]/30'
                  : 'solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
              }`}
            >
              {size}MB{size === 15 ? ' (Default)' : ''}
            </button>
          ))}
        </div>

        <div className="text-[11px] text-[var(--sg-text-muted)] font-mono bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between">
          <span>Active file size threshold:</span>
          <span className="text-[var(--sg-text)] font-semibold">
            {maxFileSizeMB} MB (~{(maxFileSizeMB * 1024 * 1024).toLocaleString()} bytes)
          </span>
        </div>
      </div>

      {/* Setting 2: Allowed File Categories */}
      <div className="p-4 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-[var(--sg-text)]">Allowed File Type Categories</span>
            <p className="text-[11px] text-[var(--sg-text-muted)] mt-0.5">
              Toggle which categories of files visitors and authenticated users can attach to stickies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setFileTypeCategories({
                  documents: true,
                  code: true,
                  images: true,
                  video: true,
                  audio: true,
                  archives: true,
                  other: true,
                })
              }
              className="text-[11px] px-2 py-1 rounded solid-glass-btn text-[var(--sg-text)] hover:underline cursor-pointer"
            >
              Enable All
            </button>
            <button
              type="button"
              onClick={() =>
                setFileTypeCategories({
                  documents: false,
                  code: false,
                  images: false,
                  video: false,
                  audio: false,
                  archives: false,
                  other: false,
                })
              }
              className="text-[11px] px-2 py-1 rounded solid-glass-btn text-[var(--sg-text-muted)] hover:text-rose-400 hover:underline cursor-pointer"
            >
              Disable All
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {categoriesList.map((cat) => {
            const isEnabled = Boolean(fileTypeCategories[cat.key]);
            return (
              <button
                type="button"
                key={cat.key}
                onClick={() =>
                  setFileTypeCategories({
                    ...fileTypeCategories,
                    [cat.key]: !isEnabled,
                  })
                }
                className={`p-3 rounded-md border transition cursor-pointer flex items-center justify-between gap-3 text-left w-full ${
                  isEnabled
                    ? 'solid-glass-panel border-[var(--sg-btn-active-border)] ring-1 ring-[var(--sg-text)]/10'
                    : 'solid-glass-panel opacity-65 hover:opacity-90 border-[var(--sg-panel-border)]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded-md bg-black/10 dark:bg-white/10 shrink-0">
                    {cat.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[var(--sg-text)] truncate">{cat.label}</span>
                      <span className="text-[10px] font-mono text-[var(--sg-text-muted)] opacity-75">
                        {cat.envKey}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--sg-text-muted)] truncate mt-0.5">
                      {cat.desc}
                    </p>
                  </div>
                </div>

                {/* Toggle switch */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-medium ${isEnabled ? 'text-emerald-500' : 'text-[var(--sg-text-muted)]'}`}>
                    {isEnabled ? 'Allowed' : 'Blocked'}
                  </span>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      isEnabled ? 'bg-[var(--sg-btn-primary-bg)]' : 'bg-black/20 dark:bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                        isEnabled ? 'left-4.5 shadow-sm' : 'left-0.75'
                      }`}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Security Policy Notice */}
        <div className="p-3 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)] text-xs text-[var(--sg-text-muted)] flex items-start gap-2.5 mt-1">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5 text-[11px]">
            <span className="font-semibold text-[var(--sg-text)]">Security Enforcement</span>
            <span>
              Executable files and scripts (<code className="font-mono text-[var(--sg-text)]">.exe, .bat, .cmd, .sh, .jar, .bin, .msi, .ps1</code>) are always blocked at the server level regardless of category toggles.
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save Attachment Settings</span>
        </button>
      </div>
    </div>
  );
};
