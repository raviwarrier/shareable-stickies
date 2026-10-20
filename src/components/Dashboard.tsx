import React, { useEffect, useState, useMemo } from 'react';
import { Paste, User } from '../types';
import {
  getUserPastes,
  deletePaste,
  togglePinPaste,
  recordCopy,
} from '../api';
import { PastesContent } from './dashboard/PastesContent';
import {
  FileText,
  Search,
  PlusCircle,
  LayoutGrid,
  List,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

interface DashboardProps {
  user: User;
  onNavigate: (path: string) => void;
  onEditPaste: (paste: Paste) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, onEditPaste }) => {
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'views' | 'copies' | 'title'>('newest');
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchPastes = async () => {
    setLoading(true);
    try {
      const data = await getUserPastes();
      setPastes(data);
    } catch (err) {
      console.error('Failed to load user pastes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPastes();
  }, [user.id, user.role]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    try {
      await deletePaste(id);
      setPastes((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Failed to delete paste:', err);
    }
  };

  const handleTogglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isPinned = await togglePinPaste(id);
      setPastes((prev) =>
        prev
          .map((p) => (p.id === id ? { ...p, pinned: isPinned } : p))
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt)
      );
    } catch (err) {
      console.error('Failed to pin paste:', err);
    }
  };

  const handleCopyLink = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = `${window.location.origin}/p/${slug}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    void recordCopy(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const filteredAndSorted = useMemo(() => {
    const q = search.toLowerCase();
    const result = pastes.filter((p) => {
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.syntax.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return b.pinned ? 1 : -1;
      }
      switch (sortBy) {
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'views':
          return b.views - a.views;
        case 'copies':
          return b.copyCount - a.copyCount;
        case 'title':
          return a.title.localeCompare(b.title);
        case 'newest':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [pastes, search, sortBy]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-4 text-sm w-full">
      {/* Main Pastes Header Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-lg solid-glass-panel shadow-md">
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--sg-text-muted)]" />
            <h1 className="text-base font-semibold text-[var(--sg-text)]">My Stickies</h1>
            <span className="text-xs px-2 py-0.5 rounded-full solid-glass-badge font-mono">
              {filteredAndSorted.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md solid-glass-btn-primary font-medium transition cursor-pointer text-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Sticky</span>
          </button>
        </div>

        {/* Filters, Search & View Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-[var(--sg-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search stickies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full solid-glass-input rounded-md pl-8 pr-3 py-1 text-xs outline-none h-8"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center rounded-md solid-glass-input h-8 px-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--sg-text-muted)] mr-1.5" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-[var(--sg-input-text)] text-xs font-mono"
            >
              <option value="newest" className="bg-[var(--sg-card-bg)] text-[var(--sg-text)]">Newest</option>
              <option value="oldest" className="bg-[var(--sg-card-bg)] text-[var(--sg-text)]">Oldest</option>
              <option value="views" className="bg-[var(--sg-card-bg)] text-[var(--sg-text)]">Most Views</option>
              <option value="copies" className="bg-[var(--sg-card-bg)] text-[var(--sg-text)]">Most Copies</option>
              <option value="title" className="bg-[var(--sg-card-bg)] text-[var(--sg-text)]">Title</option>
            </select>
          </div>

          {/* Layout Toggle: Grid or List */}
          <div className="flex items-center rounded-md solid-glass-input p-0.5 h-8">
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`p-1 rounded transition cursor-pointer ${
                viewLayout === 'grid'
                  ? 'solid-glass-btn-active text-[var(--sg-text)]'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('list')}
              className={`p-1 rounded transition cursor-pointer ${
                viewLayout === 'list'
                  ? 'solid-glass-btn-active text-[var(--sg-text)]'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
              }`}
              title="Table / List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* My Public Stickies Link */}
          <button
            type="button"
            onClick={() => onNavigate(`/public-stickies/${user.username}`)}
            className="h-8 flex items-center gap-1.5 px-3 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer text-xs font-medium"
            title="View your public stickies"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--sg-text-muted)]" />
            <span>Public Stickies</span>
          </button>
        </div>
      </div>

      {/* Pastes Display: Grid or Table List */}
      <PastesContent
        loading={loading}
        pastes={filteredAndSorted}
        search={search}
        viewLayout={viewLayout}
        copiedSlug={copiedSlug}
        deleteConfirmId={deleteConfirmId}
        onNavigate={onNavigate}
        onEditPaste={onEditPaste}
        onCopyLink={handleCopyLink}
        onTogglePin={handleTogglePin}
        onDelete={handleDelete}
      />
    </div>
  );
};
