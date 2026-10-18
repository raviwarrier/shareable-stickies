import React, { useEffect, useState, useMemo } from 'react';
import { Paste, User } from '../types';
import {
  getUserPastes,
  deletePaste,
  togglePinPaste,
  recordCopy,
  getAdminStats,
  toggleAdminDemo,
  getAdminOidcConfig,
  saveAdminOidcConfig,
  getAdminSettings,
  updateAdminSettings,
} from '../api';
import { AdminSettingsModal } from './AdminSettingsModal';
import { AdminManagementBar } from './dashboard/AdminManagementBar';
import { PastesContent } from './dashboard/PastesContent';
import { OidcModal, OidcConfigState } from './dashboard/OidcModal';
import {
  FileText,
  Search,
  ExternalLink,
  PlusCircle,
  LayoutGrid,
  List,
  ArrowUpDown,
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

  // Admin stats
  const [adminStats, setAdminStats] = useState<{
    totalPastes: number;
    totalUsers: number;
    demoEnabled: boolean;
  } | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Server Admin Settings
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [adminSettings, setAdminSettings] = useState<{ allowAnonymousCreation: boolean }>({
    allowAnonymousCreation: false,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsNotification, setSettingsNotification] = useState<string | null>(null);

  // OIDC Configuration modal & state
  const [showOidcModal, setShowOidcModal] = useState(false);
  const [oidcConfig, setOidcConfig] = useState<OidcConfigState>({
    enabled: false,
    providerName: 'Custom OIDC / SSO',
    issuerUrl: '',
    clientId: '',
    clientSecret: '',
    allowedDomains: '*',
    requireOidcOnly: false,
  });
  const [oidcSaving, setOidcSaving] = useState(false);
  const [oidcSaveSuccess, setOidcSaveSuccess] = useState(false);

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

  const fetchAdminData = async () => {
    if (user.role !== 'admin') return;
    try {
      const [stats, oidc, settings] = await Promise.all([
        getAdminStats(),
        getAdminOidcConfig().catch(() => null),
        getAdminSettings().catch(() => ({ allowAnonymousCreation: false })),
      ]);
      setAdminStats(stats);
      if (oidc) setOidcConfig(oidc);
      if (settings) setAdminSettings(settings);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    void fetchPastes();
    void fetchAdminData();
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

  const handleToggleDemoUser = async () => {
    if (!adminStats) return;
    setAdminLoading(true);
    try {
      const newState = await toggleAdminDemo(!adminStats.demoEnabled);
      setAdminStats((prev) => (prev ? { ...prev, demoEnabled: newState } : null));
      await fetchPastes();
    } catch (err) {
      console.error('Failed to toggle demo user:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleToggleAnonymousCreation = async () => {
    setSettingsLoading(true);
    try {
      const updated = await updateAdminSettings({
        allowAnonymousCreation: !adminSettings.allowAnonymousCreation,
      });
      setAdminSettings(updated);
      setSettingsNotification(
        updated.allowAnonymousCreation
          ? 'Sticky creation without signing in is now ALLOWED on this server.'
          : 'Sticky creation without signing in is now DISABLED (Sign-in required).'
      );
      setTimeout(() => setSettingsNotification(null), 4000);
    } catch (err: any) {
      console.error('Failed to update admin settings:', err);
      setSettingsNotification('Failed to update server setting.');
      setTimeout(() => setSettingsNotification(null), 4000);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveOidc = async (e: React.FormEvent) => {
    e.preventDefault();
    setOidcSaving(true);
    setOidcSaveSuccess(false);
    try {
      const saved = await saveAdminOidcConfig(oidcConfig);
      setOidcConfig(saved);
      setOidcSaveSuccess(true);
      setTimeout(() => setOidcSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save OIDC config:', err);
    } finally {
      setOidcSaving(false);
    }
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
      {/* Admin Management Section (Visible only to Admin users) */}
      {user.role === 'admin' && adminStats && (
        <AdminManagementBar
          adminStats={adminStats}
          adminLoading={adminLoading}
          adminSettings={adminSettings}
          settingsLoading={settingsLoading}
          settingsNotification={settingsNotification}
          onOpenAdminSettings={() => setShowAdminSettingsModal(true)}
          onOpenOidcModal={() => setShowOidcModal(true)}
          onToggleDemoUser={handleToggleDemoUser}
          onToggleAnonymousCreation={handleToggleAnonymousCreation}
        />
      )}

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

      {/* OIDC Configuration Modal */}
      <OidcModal
        isOpen={showOidcModal}
        onClose={() => setShowOidcModal(false)}
        oidcConfig={oidcConfig}
        setOidcConfig={setOidcConfig}
        oidcSaving={oidcSaving}
        oidcSaveSuccess={oidcSaveSuccess}
        onSave={handleSaveOidc}
      />

      {/* Admin Settings Modal */}
      {user.role === 'admin' && (
        <AdminSettingsModal
          isOpen={showAdminSettingsModal}
          onClose={() => setShowAdminSettingsModal(false)}
          currentUser={user}
          onUserUpdate={() => {}}
          currentTheme={((typeof document !== 'undefined' && document.documentElement.dataset.theme) as any) || 'dark'}
          onThemeChange={(newTheme) => {
            if (typeof document !== 'undefined') {
              document.documentElement.dataset.theme = newTheme;
              localStorage.setItem('app-theme', newTheme);
            }
          }}
        />
      )}
    </div>
  );
};
