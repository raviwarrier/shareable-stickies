import React from 'react';
import { KeyRound, Eye, EyeOff, AlertTriangle, Loader2, Check } from 'lucide-react';

interface AccountTabProps {
  adminUsername: string;
  setAdminUsername: (u: string) => void;
  currentAdminPassword: string;
  setCurrentAdminPassword: (p: string) => void;
  newAdminPassword: string;
  setNewAdminPassword: (p: string) => void;
  confirmAdminPassword: string;
  setConfirmAdminPassword: (p: string) => void;
  showCurrentPassword: boolean;
  setShowCurrentPassword: (v: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
}

export const AccountTab: React.FC<AccountTabProps> = ({
  adminUsername,
  setAdminUsername,
  currentAdminPassword,
  setCurrentAdminPassword,
  newAdminPassword,
  setNewAdminPassword,
  confirmAdminPassword,
  setConfirmAdminPassword,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  onSubmit,
  saving,
}) => {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--sg-text)] flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[var(--sg-text-muted)]" />
          <span>Change Administrator Username & Password</span>
        </h3>
        <p className="text-xs text-[var(--sg-text-muted)] mt-0.5">
          Update the master administrator credentials for this Shareable Stickies server instance.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="admin-username-input" className="text-xs text-[var(--sg-text-muted)] font-medium">Administrator Username</label>
        <input
          id="admin-username-input"
          type="text"
          value={adminUsername}
          onChange={(e) => setAdminUsername(e.target.value)}
          placeholder="admin"
          className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
          required
        />
        <span className="text-[11px] text-[var(--sg-text-muted)] opacity-80">
          Changing your username will update existing past stickies and active sessions.
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="current-admin-pwd-input" className="text-xs text-[var(--sg-text-muted)] font-medium">Current Administrator Password</label>
        <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
          <input
            id="current-admin-pwd-input"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentAdminPassword}
            onChange={(e) => setCurrentAdminPassword(e.target.value)}
            placeholder="Enter current password..."
            className="w-full bg-transparent px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="px-2.5 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer"
          >
            {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="new-admin-pwd-input" className="text-xs text-[var(--sg-text-muted)] font-medium">New Password (leave blank to keep)</label>
          <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
            <input
              id="new-admin-pwd-input"
              type={showNewPassword ? 'text' : 'password'}
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              placeholder="Enter new password..."
              className="w-full bg-transparent px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="px-2.5 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer"
            >
              {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirm-admin-pwd-input" className="text-xs text-[var(--sg-text-muted)] font-medium">Confirm New Password</label>
          <input
            id="confirm-admin-pwd-input"
            type={showNewPassword ? 'text' : 'password'}
            value={confirmAdminPassword}
            onChange={(e) => setConfirmAdminPassword(e.target.value)}
            placeholder="Re-enter new password..."
            className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
          />
        </div>
      </div>

      <div className="p-3 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)] text-xs text-[var(--sg-text-muted)] flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-[var(--sg-text)] shrink-0 mt-0.5" />
        <span>
          Make sure to store your new credentials securely. You can also re-configure administrator
          credentials anytime in the shell via <code className="font-mono text-[var(--sg-text)] font-semibold">./setup.sh</code> or via <code className="font-mono text-[var(--sg-text)] font-semibold">ADMIN_PASSWORD</code> in <code className="font-mono">.env</code>.
        </span>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Update Admin Credentials</span>
        </button>
      </div>
    </form>
  );
};
