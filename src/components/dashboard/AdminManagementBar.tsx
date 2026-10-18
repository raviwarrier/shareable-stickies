import React from 'react';
import {
  Shield,
  Settings,
  KeyRound,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Check,
} from 'lucide-react';

interface AdminStats {
  totalPastes: number;
  totalUsers: number;
  demoEnabled: boolean;
}

interface AdminSettings {
  allowAnonymousCreation: boolean;
}

interface AdminManagementBarProps {
  adminStats: AdminStats | null;
  adminLoading: boolean;
  adminSettings: AdminSettings;
  settingsLoading: boolean;
  settingsNotification: string | null;
  onOpenAdminSettings: () => void;
  onOpenOidcModal: () => void;
  onToggleDemoUser: () => void;
  onToggleAnonymousCreation: () => void;
}

export const AdminManagementBar: React.FC<AdminManagementBarProps> = ({
  adminStats,
  adminLoading,
  adminSettings,
  settingsLoading,
  settingsNotification,
  onOpenAdminSettings,
  onOpenOidcModal,
  onToggleDemoUser,
  onToggleAnonymousCreation,
}) => {
  if (!adminStats) return null;

  const renderDemoButtonContent = () => {
    if (adminLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (adminStats.demoEnabled) {
      return (
        <>
          <ToggleRight className="w-4 h-4 text-rose-400" />
          <span>Disable Demo</span>
        </>
      );
    }
    return (
      <>
        <ToggleLeft className="w-4 h-4 text-[var(--sg-text-muted)]" />
        <span>Enable Demo</span>
      </>
    );
  };

  const renderAnonymousToggleContent = () => {
    if (settingsLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (adminSettings.allowAnonymousCreation) {
      return (
        <>
          <ToggleRight className="w-4 h-4 text-[var(--sg-text)]" />
          <span>Without Sign-in: ON</span>
        </>
      );
    }
    return (
      <>
        <ToggleLeft className="w-4 h-4 text-[var(--sg-text-muted)]" />
        <span>Without Sign-in: OFF (Default)</span>
      </>
    );
  };

  return (
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
          onClick={onOpenAdminSettings}
          className="px-3 py-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer flex items-center gap-2 text-xs font-medium"
          title="Open Server & Admin Settings Modal (Mode, Public Creation, OIDC, Storage, Credentials)"
        >
          <Settings className="w-4 h-4 text-[var(--sg-text-muted)]" />
          <span>Admin Settings</span>
        </button>

        {/* OIDC Config Trigger Button */}
        <button
          type="button"
          onClick={onOpenOidcModal}
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
            onClick={onToggleDemoUser}
            disabled={adminLoading}
            className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 font-medium text-xs ${
              adminStats.demoEnabled
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                : 'solid-glass-btn text-[var(--sg-text)]'
            }`}
          >
            {renderDemoButtonContent()}
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
            onClick={onToggleAnonymousCreation}
            disabled={settingsLoading}
            className={`px-2.5 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 font-medium text-xs ${
              adminSettings.allowAnonymousCreation
                ? 'solid-glass-btn-active text-[var(--sg-text)]'
                : 'solid-glass-btn text-[var(--sg-btn-text)]'
            }`}
            title="Togglable setting: Allow creating stickies without signing in (Default: Off)"
          >
            {renderAnonymousToggleContent()}
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
  );
};
