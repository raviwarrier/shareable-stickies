import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { highlightCode } from '../utils/syntaxHighlighter';
import { AdminSettingsModal } from './AdminSettingsModal';
import {
  FileText,
  Pin,
  Trash2,
  Copy,
  ExternalLink,
  Eye,
  Search,
  Lock,
  Flame,
  Check,
  PlusCircle,
  Loader2,
  Edit3,
  LayoutGrid,
  List,
  Shield,
  ToggleLeft,
  ToggleRight,
  ArrowUpDown,
  Settings,
  X,
  KeyRound,
  Save,
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

  // Server Admin Settings (Togglable: allow creation of stickies without signing in, default off)
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [adminSettings, setAdminSettings] = useState<{ allowAnonymousCreation: boolean }>({
    allowAnonymousCreation: false,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsNotification, setSettingsNotification] = useState<string | null>(null);

  // Requirement 14: OIDC Configuration modal & state
  const [showOidcModal, setShowOidcModal] = useState(false);
  const [oidcConfig, setOidcConfig] = useState({
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
    fetchPastes();
    fetchAdminData();
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
    recordCopy(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleToggleDemoUser = async () => {
    if (!adminStats) return;
    setAdminLoading(true);
    try {
      const newState = await toggleAdminDemo(!adminStats.demoEnabled);
      setAdminStats((prev) => (prev ? { ...prev, demoEnabled: newState } : null));
      fetchPastes();
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
    let result = pastes.filter((p) => {
      const q = search.toLowerCase();
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
        <div className="p-4 rounded-lg solid-glass-panel flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md solid-glass-btn text-[var(--sg-text)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-[var(--sg-text)] flex items-center gap-2">
                <span>Instance Administration</span>
                <span className="text-xs px-2 py-0.5 rounded-md solid-glass-badge uppercase font-normal">
                  Admin
                </span>
              </div>
              <div className="text-xs text-[var(--sg-text-muted)] mt-1 flex flex-wrap items-center gap-3 font-normal">
                <span>
                  Total Stored Pastes: <span className="text-[var(--sg-text)] font-semibold">{adminStats.totalPastes}</span>
                </span>
                <span>•</span>
                <span>
                  Active Users: <span className="text-[var(--sg-text)] font-semibold">{adminStats.totalUsers}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 p-2 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)]">
            {/* Full Admin Settings Modal Button */}
            <button
              type="button"
              onClick={() => setShowAdminSettingsModal(true)}
              className="px-3 py-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer flex items-center gap-2 text-xs font-medium"
              title="Open Server & Admin Settings Modal (Mode, Public Creation, OIDC, Storage, Credentials)"
            >
              <Settings className="w-4 h-4 text-[var(--sg-text-muted)]" />
              <span>Admin Settings</span>
            </button>

            {/* OIDC Config Trigger Button */}
            <button
              type="button"
              onClick={() => setShowOidcModal(true)}
              className="px-3 py-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer flex items-center gap-2 text-xs font-medium"
              title="Configure OpenID Connect / SSO authentication"
            >
              <KeyRound className="w-4 h-4 text-[var(--sg-text-muted)]" />
              <span>Configure OIDC</span>
            </button>

            {/* Toggle Demo User */}
            <div className="flex items-center gap-2 border-l border-[var(--sg-panel-border)] pl-2.5">
              <div className="text-left hidden sm:block">
                <div className="text-xs text-[var(--sg-text-muted)] font-medium">
                  {adminStats.demoEnabled ? 'Active' : 'Disabled'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleDemoUser}
                disabled={adminLoading}
                className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 font-medium text-xs ${
                  adminStats.demoEnabled
                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                    : 'solid-glass-btn text-[var(--sg-text)]'
                }`}
              >
                {adminLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : adminStats.demoEnabled ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-rose-400" />
                    <span>Disable Demo</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-[var(--sg-text-muted)]" />
                    <span>Enable Demo</span>
                  </>
                )}
              </button>
            </div>

            {/* Togglable Anonymous Sticky Creation Setting */}
            <div className="flex items-center gap-2 border-l border-[var(--sg-panel-border)] pl-2.5">
              <div className="text-left hidden sm:block">
                <div className="text-xs text-[var(--sg-text-muted)] font-medium">
                  {adminSettings.allowAnonymousCreation ? 'Guests Allowed' : 'Sign-in Required'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAnonymousCreation}
                disabled={settingsLoading}
                className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 font-medium text-xs ${
                  adminSettings.allowAnonymousCreation
                    ? 'solid-glass-btn-active text-[var(--sg-text)]'
                    : 'solid-glass-btn text-[var(--sg-btn-text)]'
                }`}
                title="Togglable setting: Allow creating stickies without signing in (Default: Off)"
              >
                {settingsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : adminSettings.allowAnonymousCreation ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-[var(--sg-text)]" />
                    <span>Without Sign-in: ON</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-[var(--sg-text-muted)]" />
                    <span>Without Sign-in: OFF (Default)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {settingsNotification && (
            <div className="w-full mt-2 p-2.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{settingsNotification}</span>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Header Bar with Solid Glass */}
      <div className="p-4 rounded-lg solid-glass-panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-base md:text-lg font-semibold text-[var(--sg-text)] flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[var(--sg-text-muted)]" />
            My Stickies ({pastes.length})
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box with inside right icon and consistent height */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stickies..."
              className="pl-3 pr-8 h-8 rounded-md solid-glass-input text-[var(--sg-input-text)] placeholder-[var(--sg-text-muted)] outline-none text-xs w-40 sm:w-56 font-mono"
            />
            <Search className="w-4 h-4 text-[var(--sg-text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Selector */}
          <div className="h-8 flex items-center gap-1.5 solid-glass-btn rounded-md px-2.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--sg-text-muted)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-[var(--sg-btn-text)] outline-none cursor-pointer text-xs font-medium font-mono"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="views">Most Views</option>
              <option value="copies">Most Copies</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          {/* Grid vs List View toggle */}
          <div className="h-8 flex items-center rounded-md solid-glass-btn p-0.5">
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewLayout === 'grid' ? 'solid-glass-btn-active' : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('list')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewLayout === 'list' ? 'solid-glass-btn-active' : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
              }`}
              title="Table view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* My Public Stickies Link */}
          <button
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
      {loading ? (
        <div className="flex items-center justify-center p-16 text-[var(--sg-text-muted)] gap-3 font-mono text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--sg-text)]" />
          <span>Loading sticky records...</span>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        /* Requirement 15: Rephrased Empty State Message */
        <div className="p-12 text-center rounded-lg solid-glass-panel text-[var(--sg-text)] flex flex-col items-center justify-center gap-3 shadow-lg">
          <p className="text-sm leading-relaxed max-w-lg font-normal text-[var(--sg-text-muted)]">
            {search
              ? 'No stickies match your filter.'
              : 'You have not created any stickies yet. Click the New Sticky button above to create your first one.'}
          </p>
          {!search && (
            <button
              onClick={() => onNavigate('/')}
              className="mt-2 flex items-center gap-2 px-3.5 py-2 rounded-md solid-glass-btn-primary font-medium transition cursor-pointer text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Sticky</span>
            </button>
          )}
        </div>
      ) : viewLayout === 'grid' ? (
        /* GRID VIEW with 10-15 lines live preview and elevated contrast */
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
                onClick={() => onNavigate(`/p/${item.slug}`)}
                className={`group relative p-3.5 rounded-lg solid-glass-panel border transition-all flex flex-col justify-between gap-3 cursor-pointer shadow-md hover:border-[var(--sg-btn-active-border)] ${
                  item.pinned ? 'ring-1 ring-[var(--sg-text)]/30' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.pinned && <Pin className="w-3.5 h-3.5 text-[var(--sg-text)] fill-current shrink-0" />}
                      <h2 className="font-semibold text-[var(--sg-text)] truncate text-sm transition">
                        {item.title}
                      </h2>
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
                        onClick={(e) => handleTogglePin(item.id, e)}
                        className={`p-1 rounded transition cursor-pointer ${
                          item.pinned ? 'solid-glass-btn-active text-[var(--sg-text)]' : 'solid-glass-btn text-[var(--sg-text-muted)]'
                        }`}
                        title={item.pinned ? 'Unpin paste' : 'Pin paste'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
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
                    <span className="text-[var(--sg-text)] font-medium">/p/{item.slug}</span>
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
                      <Lock className="w-3 h-3 text-[var(--sg-text-muted)]" /> Pass
                    </span>
                  )}

                  {item.burnAfterReading && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center gap-1 text-[11px]">
                      <Flame className="w-3 h-3" /> Burn
                    </span>
                  )}

                  <div className="ml-auto flex items-center gap-2.5 text-[var(--sg-text-muted)] text-[11px]">
                    <span className="flex items-center gap-1" title="View Count">
                      <Eye className="w-3 h-3" /> {item.views}
                    </span>
                    <span className="flex items-center gap-1" title="Copy Count">
                      <Copy className="w-3 h-3" /> {item.copyCount}
                    </span>
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[var(--sg-panel-border)] text-xs">
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(item.slug, e)}
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
      ) : (
        /* TABLE / LIST VIEW */
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
                  <tr
                    key={item.id}
                    onClick={() => onNavigate(`/p/${item.slug}`)}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer group"
                  >
                    <td className="py-2.5 px-3.5">
                      <div className="flex items-center gap-2">
                        {item.pinned && <Pin className="w-3.5 h-3.5 text-[var(--sg-text)] fill-current shrink-0" />}
                        <span className="font-medium text-[var(--sg-text)] transition truncate max-w-[220px] sm:max-w-[340px]">
                          {item.title}
                        </span>
                        <span className="text-xs text-[var(--sg-text-muted)] font-mono">
                          /p/{item.slug} · {dateStr} · {expiryStr}
                        </span>
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
                    <div className="flex items-center justify-end gap-1.5" role="button" tabIndex={0} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}>
                      <button
                        type="button"
                        onClick={(e) => handleCopyLink(item.slug, e)}
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
                        onClick={() => onEditPaste(item)}
                        className="p-1 rounded solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer"
                        title="Edit sticky"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(item.id, e)}
                        className={`p-1 rounded transition cursor-pointer ${
                          item.pinned ? 'solid-glass-btn-active text-[var(--sg-text)]' : 'solid-glass-btn text-[var(--sg-text-muted)]'
                        }`}
                        title="Pin sticky"
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
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
      )}

      {/* Requirement 14: OpenID Connect (OIDC) Configuration Modal */}
      {showOidcModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowOidcModal(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm font-mono text-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-lg solid-glass-panel p-5 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sg-panel-border)]">
              <div className="flex items-center gap-2.5 text-[var(--sg-text)] font-semibold text-base">
                <KeyRound className="w-5 h-5 text-[var(--sg-text-muted)]" />
                <span>OpenID Connect (OIDC) Authentication</span>
              </div>
              <button
                type="button"
                onClick={() => setShowOidcModal(false)}
                className="p-1 rounded solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--sg-text-muted)] leading-relaxed font-normal">
              Configure OIDC to control who can sign up and log in using an enterprise identity provider (Okta, Keycloak, Authentik, etc.).
            </p>

            {oidcSaveSuccess && (
              <div className="p-2.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>OIDC configuration successfully saved to instance settings.</span>
              </div>
            )}

            <form onSubmit={handleSaveOidc} className="flex flex-col gap-3.5">
              {/* Enable OIDC Toggle */}
              <div className="flex items-center justify-between p-3 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)]">
                <div>
                  <div className="text-xs font-semibold text-[var(--sg-text)]">Enable OIDC SSO</div>
                  <div className="text-[11px] text-[var(--sg-text-muted)] font-normal">Allow users to log in with OpenID Connect</div>
                </div>
                <input
                  type="checkbox"
                  checked={oidcConfig.enabled}
                  onChange={(e) => setOidcConfig({ ...oidcConfig, enabled: e.target.checked })}
                  className="rounded border-[var(--sg-input-border)] bg-[var(--sg-input-bg)] text-[var(--sg-text)] focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>

              {/* Provider Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--sg-text-muted)]" htmlFor="oidc-provider-name">Provider Name / Preset</label>
                <input
                  id="oidc-provider-name"
                  type="text"
                  value={oidcConfig.providerName}
                  onChange={(e) => setOidcConfig({ ...oidcConfig, providerName: e.target.value })}
                  placeholder="e.g. Okta, Keycloak, Authentik, GitLab"
                  className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
                />
              </div>

              {/* Issuer URL */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--sg-text-muted)]" htmlFor="oidc-issuer-url">Issuer URL / Discovery Endpoint</label>
                <input
                  id="oidc-issuer-url"
                  type="text"
                  value={oidcConfig.issuerUrl}
                  onChange={(e) => setOidcConfig({ ...oidcConfig, issuerUrl: e.target.value })}
                  placeholder="https://sso.yourcompany.com or https://auth.company.org"
                  className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
                />
              </div>

              {/* Client ID & Secret Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[var(--sg-text-muted)]" htmlFor="oidc-client-id">Client ID</label>
                  <input
                    id="oidc-client-id"
                    type="text"
                    value={oidcConfig.clientId}
                    onChange={(e) => setOidcConfig({ ...oidcConfig, clientId: e.target.value })}
                    placeholder="OAuth2 Client ID"
                    className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-[var(--sg-text-muted)]" htmlFor="oidc-client-secret">Client Secret</label>
                  <input
                    id="oidc-client-secret"
                    type="password"
                    value={oidcConfig.clientSecret}
                    onChange={(e) => setOidcConfig({ ...oidcConfig, clientSecret: e.target.value })}
                    placeholder="OAuth2 Client Secret"
                    className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
                  />
                </div>
              </div>

              {/* Allowed Email Domains */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--sg-text-muted)] flex items-center justify-between" htmlFor="oidc-allowed-domains">
                  <span>Allowed Email Domains</span>
                  <span className="text-[11px] text-[var(--sg-text-muted)] opacity-70">* for all domains</span>
                </label>
                <input
                  id="oidc-allowed-domains"
                  type="text"
                  value={oidcConfig.allowedDomains}
                  onChange={(e) => setOidcConfig({ ...oidcConfig, allowedDomains: e.target.value })}
                  placeholder="company.com, engineering.org, or *"
                  className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
                />
              </div>

              {/* Enforce OIDC Only Toggle */}
              <div className="flex items-center justify-between p-3 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)]">
                <div>
                  <div className="text-xs font-semibold text-[var(--sg-text)]">Enforce OIDC Only</div>
                  <div className="text-[11px] text-[var(--sg-text-muted)]">Disable username/password registration for new users</div>
                </div>
                <input
                  type="checkbox"
                  checked={oidcConfig.requireOidcOnly}
                  onChange={(e) => setOidcConfig({ ...oidcConfig, requireOidcOnly: e.target.checked })}
                  className="rounded border-[var(--sg-input-border)] bg-[var(--sg-input-bg)] text-[var(--sg-text)] focus:ring-0 cursor-pointer h-4 w-4"
                />
              </div>

              {/* Redirect URI Notice */}
              <div className="p-2.5 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)] text-xs text-[var(--sg-text-muted)]">
                <span>Configured Callback URI: </span>
                <code className="text-[var(--sg-text)] font-semibold select-all font-mono">/api/auth/oidc/callback</code>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOidcModal(false)}
                  className="px-3.5 py-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={oidcSaving}
                  className="px-4 py-1.5 rounded-md solid-glass-btn-primary text-xs font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{oidcSaving ? 'Saving...' : 'Save OIDC Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

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
