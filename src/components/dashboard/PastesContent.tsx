import React from 'react';
import { Paste } from '../../types';
import { highlightCode } from '../../utils/syntaxHighlighter';
import {
  Pin,
  Trash2,
  Copy,
  Eye,
  Lock,
  Flame,
  Check,
  PlusCircle,
  Loader2,
  Edit3,
} from 'lucide-react';

interface PastesContentProps {
  loading: boolean;
  pastes: Paste[];
  search: string;
  viewLayout: 'grid' | 'list';
  copiedSlug: string | null;
  deleteConfirmId: string | null;
  onNavigate: (path: string) => void;
  onEditPaste: (paste: Paste) => void;
  onCopyLink: (slug: string, e: React.MouseEvent) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

export const PastesContent: React.FC<PastesContentProps> = ({
  loading,
  pastes,
  search,
  viewLayout,
  copiedSlug,
  deleteConfirmId,
  onNavigate,
  onEditPaste,
  onCopyLink,
  onTogglePin,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 text-[var(--sg-text-muted)] gap-3 font-mono text-xs">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--sg-text)]" />
        <span>Loading sticky records...</span>
      </div>
    );
  }

  if (pastes.length === 0) {
    const emptyMessage = search
      ? 'No stickies match your filter.'
      : 'You have not created any stickies yet. Click the New Sticky button above to create your first one.';

    return (
      <div className="p-12 text-center rounded-lg solid-glass-panel text-[var(--sg-text)] flex flex-col items-center justify-center gap-3 shadow-lg">
        <p className="text-sm leading-relaxed max-w-lg font-normal text-[var(--sg-text-muted)]">
          {emptyMessage}
        </p>
        {!search && (
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="mt-2 flex items-center gap-2 px-3.5 py-2 rounded-md solid-glass-btn-primary font-medium transition cursor-pointer text-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Your First Sticky</span>
          </button>
        )}
      </div>
    );
  }

  if (viewLayout === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {pastes.map((item) => {
          const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });
          const expiryStr = item.expiresAt
            ? new Date(item.expiresAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })
            : 'never';

          return (
            <div
              key={item.id}
              className={`group relative p-3.5 rounded-lg solid-glass-panel border transition-all flex flex-col justify-between gap-3 shadow-md hover:border-[var(--sg-btn-active-border)] ${
                item.pinned ? 'ring-1 ring-[var(--sg-text)]/30' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.pinned && <Pin className="w-3.5 h-3.5 text-[var(--sg-text)] fill-current shrink-0" />}
                    <button
                      type="button"
                      onClick={() => onNavigate(`/p/${item.slug}`)}
                      className="font-semibold text-[var(--sg-text)] truncate text-sm transition text-left hover:underline cursor-pointer"
                    >
                      {item.title}
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPaste(item);
                      }}
                      className="p-1 rounded solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer"
                      title="Edit in workbench"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => onTogglePin(item.id, e)}
                      className={`p-1 rounded transition cursor-pointer ${
                        item.pinned ? 'solid-glass-btn-active text-[var(--sg-text)]' : 'solid-glass-btn text-[var(--sg-text-muted)]'
                      }`}
                      title={item.pinned ? 'Unpin paste' : 'Pin paste'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => onDelete(item.id, e)}
                      className={`p-1 rounded transition cursor-pointer flex items-center gap-1 ${
                        deleteConfirmId === item.id
                          ? 'bg-rose-500/20 border border-rose-500/50 text-rose-500 px-1.5'
                          : 'solid-glass-btn text-[var(--sg-text-muted)] hover:text-rose-500'
                      }`}
                      title={deleteConfirmId === item.id ? 'Click again to confirm delete' : 'Delete paste'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deleteConfirmId === item.id && <span className="text-[10px]">Confirm?</span>}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-[var(--sg-text-muted)] mb-2 font-mono">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/p/${item.slug}`)}
                    className="text-[var(--sg-text)] font-medium hover:underline cursor-pointer"
                  >
                    /p/{item.slug}
                  </button>
                  <span>·</span>
                  <span>{dateStr}</span>
                  <span>·</span>
                  <span>{expiryStr}</span>
                </div>


                {/* 10-15 lines live preview box */}
                <div className="rounded-md solid-glass-input p-2.5 max-h-44 overflow-hidden text-xs leading-5 font-mono select-none my-1">
                  {item.preview ? (
                    <pre className={`language-${item.syntax} !bg-transparent !p-0 !m-0 !overflow-hidden`}>
                      <code
                        className={`language-${item.syntax}`}
                        dangerouslySetInnerHTML={{
                          __html: highlightCode(item.preview, item.syntax),
                        }}
                      />
                    </pre>
                  ) : (
                    <span className="text-[var(--sg-text-muted)] italic text-xs">No preview available</span>
                  )}
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--sg-panel-border)] text-xs font-mono">
                <span className="px-1.5 py-0.5 rounded solid-glass-badge uppercase text-[11px] font-medium">
                  {item.syntax}
                </span>

                <span className="px-1.5 py-0.5 rounded solid-glass-badge capitalize text-[11px]">
                  {item.visibility}
                </span>

                {item.hasPassword && (
                  <span className="px-1.5 py-0.5 rounded solid-glass-badge flex items-center gap-1 text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-[var(--sg-text-muted)]" /> Pass
                  </span>
                )}

                {item.burnAfterReading && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-1 text-[11px]">
                    <Flame className="w-3.5 h-3.5" /> Burn
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2.5 text-[var(--sg-text-muted)] text-[11px]">
                  <span className="flex items-center gap-1" title="View Count">
                    <Eye className="w-3.5 h-3.5" /> {item.views}
                  </span>
                  <span className="flex items-center gap-1" title="Copy Count">
                    <Copy className="w-3.5 h-3.5" /> {item.copyCount}
                  </span>
                </div>
              </div>

              {/* Quick Action Footer */}
              <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[var(--sg-panel-border)] text-xs">
                <button
                  type="button"
                  onClick={(e) => onCopyLink(item.slug, e)}
                  className="flex items-center gap-1 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer text-xs"
                >
                  {copiedSlug === item.slug ? (
                    <span className="text-emerald-500 flex items-center gap-1 font-medium">
                      <Check className="w-3.5 h-3.5" /> Copied
                    </span>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </>
                  )}
                </button>

                <a
                  href={`/raw/${item.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition text-xs"
                >
                  Raw Contents
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* Table / List View */
  return (
    <div className="rounded-lg solid-glass-panel overflow-hidden shadow-xl text-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[var(--sg-panel-border)] solid-glass-subbar text-[var(--sg-text-muted)] text-xs font-semibold">
            <th className="py-2.5 px-3.5">Title & Link</th>
            <th className="py-2.5 px-3.5">Syntax</th>
            <th className="py-2.5 px-3.5">Visibility</th>
            <th className="py-2.5 px-3.5">Views</th>
            <th className="py-2.5 px-3.5">Copies</th>
            <th className="py-2.5 px-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--sg-panel-border)]">
          {pastes.map((item) => {
            const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            const expiryStr = item.expiresAt
              ? new Date(item.expiresAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : 'never';

            return (
              <tr
                key={item.id}
                className="hover:bg-black/5 dark:hover:bg-white/5 transition group"
              >
                <td className="py-2.5 px-3.5">
                  <div className="flex items-center gap-2">
                    {item.pinned && <Pin className="w-3.5 h-3.5 text-[var(--sg-text)] fill-current shrink-0" />}
                    <button
                      type="button"
                      onClick={() => onNavigate(`/p/${item.slug}`)}
                      className="font-medium text-[var(--sg-text)] transition truncate max-w-[220px] sm:max-w-[340px] text-left hover:underline cursor-pointer"
                    >
                      {item.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/p/${item.slug}`)}
                      className="text-xs text-[var(--sg-text-muted)] font-mono hover:underline cursor-pointer"
                    >
                      /p/{item.slug} · {dateStr} · {expiryStr}
                    </button>
                  </div>
                </td>

                <td className="py-2.5 px-3.5">
                  <span className="px-1.5 py-0.5 rounded solid-glass-badge uppercase text-[11px] font-medium font-mono">
                    {item.syntax}
                  </span>
                </td>
                <td className="py-2.5 px-3.5">
                  <span className="text-[var(--sg-text-muted)] capitalize text-xs">{item.visibility}</span>
                  {item.burnAfterReading && <span className="ml-1 text-rose-500 font-semibold text-xs">(Burn)</span>}
                </td>
                <td className="py-2.5 px-3.5 text-[var(--sg-text-muted)] text-xs">{item.views}</td>
                <td className="py-2.5 px-3.5 text-[var(--sg-text-muted)] text-xs">{item.copyCount}</td>
                <td className="py-2.5 px-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => onCopyLink(item.slug, e)}
                      className="p-1 rounded solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer"
                      title="Copy link"
                    >
                      {copiedSlug === item.slug ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPaste(item);
                      }}
                      className="p-1 rounded solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer"
                      title="Edit sticky"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onTogglePin(item.id, e)}
                      className={`p-1 rounded transition cursor-pointer ${
                        item.pinned ? 'solid-glass-btn-active text-[var(--sg-text)]' : 'solid-glass-btn text-[var(--sg-text-muted)]'
                      }`}
                      title="Pin sticky"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onDelete(item.id, e)}
                      className="p-1 rounded solid-glass-btn text-[var(--sg-text-muted)] hover:text-rose-500 transition cursor-pointer"
                      title="Delete sticky"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
