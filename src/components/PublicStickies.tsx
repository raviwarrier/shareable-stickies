import React, { useEffect, useState, useMemo } from 'react';
import { Paste, User } from '../types';
import { getPublicStickiesByUsername, recordCopy } from '../api';
import { highlightCode } from '../utils/syntaxHighlighter';
import {
  Copy,
  ExternalLink,
  Search,
  Check,
  Loader2,
  ArrowLeft,
  ArrowUpDown,
  User as UserIcon,
  AlertTriangle,
} from 'lucide-react';

interface PublicStickiesProps {
  username: string;
  currentUser: User | null;
  onNavigate: (path: string) => void;
}

export const PublicStickies: React.FC<PublicStickiesProps> = ({
  username,
  currentUser,
  onNavigate,
}) => {
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'views' | 'title'>('newest');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    const loadPastes = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicStickiesByUsername(username);
        setPastes(data.pastes);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load public stickies');
      } finally {
        setLoading(false);
      }
    };
    void loadPastes();
  }, [username]);

  const handleCopyLink = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = `${window.location.origin}/p/${slug}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    await recordCopy(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const filteredAndSorted = useMemo(() => {
    let result = pastes.filter((p) => {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.syntax.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'views':
          return b.views - a.views;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'newest':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [pastes, search, sortBy]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-[var(--sg-text-muted)] font-mono text-xs gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--sg-text)]" />
        <span>Loading public stickies for @{username}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 rounded-lg solid-glass-panel border-rose-500/40 font-mono text-xs">
        <div className="flex items-center gap-2 text-rose-500 font-semibold mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Profile Not Found</span>
        </div>
        <p className="text-[var(--sg-text-muted)] mb-4">{error}</p>
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4 text-xs font-mono">
      {/* Public Profile Header */}
      <div className="p-4 rounded-lg solid-glass-panel flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate(currentUser ? '/dashboard' : '/')}
            className="p-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-[var(--sg-text)] flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[var(--sg-text-muted)]" />
              <span>Public Stickies by @{username}</span>
              <span className="text-xs px-2 py-0.5 rounded-md solid-glass-badge font-normal">
                {pastes.length} {pastes.length === 1 ? 'sticky' : 'stickies'}
              </span>
            </h1>
            <p className="text-xs text-[var(--sg-text-muted)] mt-0.5 font-normal">
              Public shareable link: <code className="text-[var(--sg-text)] font-medium">/public-stickies/{username}</code>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box with inside right icon and consistent height */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search public stickies..."
              className="pl-3 pr-8 h-8 rounded-md solid-glass-input text-[var(--sg-input-text)] placeholder-[var(--sg-text-muted)] outline-none text-xs w-44 sm:w-56 font-mono"
            />
            <Search className="w-4 h-4 text-[var(--sg-text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Selector */}
          <div className="h-8 flex items-center gap-1.5 solid-glass-btn rounded-md px-2.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--sg-text-muted)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-[var(--sg-btn-text)] outline-none cursor-pointer text-xs font-mono"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="views">Most Views</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Public Stickies Cards Grid with 10-15 line preview */}
      {filteredAndSorted.length === 0 ? (
        <div className="p-12 text-center rounded-lg solid-glass-panel text-[var(--sg-text-muted)]">
          {search ? 'No stickies match your search.' : `@${username} has no public stickies yet.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredAndSorted.map((item) => {
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
                className="group relative p-3.5 rounded-lg solid-glass-panel border hover:border-[var(--sg-btn-active-border)] transition-all flex flex-col justify-between gap-3 shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => onNavigate(`/p/${item.slug}`)}
                      className="font-semibold text-[var(--sg-text)] truncate text-sm transition flex-1 text-left hover:underline cursor-pointer"
                    >
                      {item.title}
                    </button>
                    <span className="px-2 py-0.5 rounded-md solid-glass-badge font-semibold uppercase text-[11px] shrink-0 font-mono">
                      {item.syntax}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[var(--sg-text-muted)] mb-2 font-normal font-mono">
                    <span className="text-[var(--sg-text)] font-medium">/p/{item.slug}</span>
                    <span>·</span>
                    <span>{dateStr}</span>
                    <span>·</span>
                    <span>{expiryStr}</span>
                  </div>

                  {/* 10-15 lines live preview box */}
                  <div className="rounded-md solid-glass-input p-2.5 max-h-48 overflow-hidden text-xs leading-5 font-mono select-none">
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
                      <span className="text-[var(--sg-text-muted)] italic">No preview available</span>
                    )}
                  </div>
                </div>

                {/* Card Quick Action Bar */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--sg-panel-border)] text-xs font-medium">
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(item.slug, e)}
                    className="flex items-center gap-1 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer"
                    title="Copy relative link"
                  >
                    {copiedSlug === item.slug ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Link
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2.5">
                    <a
                      href={`/raw/${item.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition"
                    >
                      Raw Contents
                    </a>
                    <span className="opacity-30">•</span>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/p/${item.slug}`)}
                      className="text-[var(--sg-text)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
