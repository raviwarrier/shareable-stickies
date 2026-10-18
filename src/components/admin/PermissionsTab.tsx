import React from 'react';
import { Lock, Loader2, Check } from 'lucide-react';

interface PermissionsTabProps {
  allowPublicCreation: boolean;
  onTogglePublicCreation: () => void;
  onSave: () => void;
  saving: boolean;
}

export const PermissionsTab: React.FC<PermissionsTabProps> = ({
  allowPublicCreation,
  onTogglePublicCreation,
  onSave,
  saving,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--sg-text)] flex items-center gap-2">
          <Lock className="w-4 h-4 text-[var(--sg-text-muted)]" />
          <span>Public Creation Permissions</span>
        </h3>
        <p className="text-xs text-[var(--sg-text-muted)] mt-0.5">
          Control whether anonymous (guest) visitors can publish stickies without signing in.
        </p>
      </div>

      <div className="p-4 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--sg-text)]">Allow public creation of stickies</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                allowPublicCreation
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : 'solid-glass-badge'
              }`}
            >
              {allowPublicCreation ? 'Enabled (Open)' : 'Off (Default: Protected)'}
            </span>
          </div>
          <p className="text-xs text-[var(--sg-text-muted)] leading-relaxed max-w-xl">
            {allowPublicCreation
              ? 'Unauthenticated guest visitors are permitted to publish public and unlisted stickies.'
              : 'Sign-in is strictly enforced. Anonymous visitors will be prompted to sign in or register before creating stickies.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onTogglePublicCreation}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 border border-[var(--sg-panel-border)] ${
            allowPublicCreation ? 'solid-glass-btn-primary' : 'solid-glass-btn'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${
              allowPublicCreation
                ? 'translate-x-5 bg-[var(--sg-btn-primary-text)]'
                : 'translate-x-0 bg-[var(--sg-text-muted)]'
            }`}
          />
        </button>
      </div>

      <div className="p-3 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)] text-xs text-[var(--sg-text-muted)] flex items-start gap-2.5">
        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--sg-text)] shrink-0" />
        <span>
          Can also be configured during install via <code className="text-[var(--sg-text)] font-semibold font-mono">ALLOW_ANONYMOUS_CREATION=false</code> (default: off).
        </span>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save Permissions</span>
        </button>
      </div>
    </div>
  );
};
