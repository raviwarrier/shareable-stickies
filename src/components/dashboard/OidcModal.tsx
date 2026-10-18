import React from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, X, Check, Save } from 'lucide-react';

export interface OidcConfigState {
  enabled: boolean;
  providerName: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  allowedDomains: string;
  requireOidcOnly: boolean;
}

interface OidcModalProps {
  isOpen: boolean;
  onClose: () => void;
  oidcConfig: OidcConfigState;
  setOidcConfig: React.Dispatch<React.SetStateAction<OidcConfigState>>;
  oidcSaving: boolean;
  oidcSaveSuccess: boolean;
  onSave: (e: React.FormEvent) => void;
}

export const OidcModal: React.FC<OidcModalProps> = ({
  isOpen,
  onClose,
  oidcConfig,
  setOidcConfig,
  oidcSaving,
  oidcSaveSuccess,
  onSave,
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-mono text-sm">
      <button
        type="button"
        aria-label="Close OIDC modal backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 cursor-default border-0 p-0 m-0 w-full h-full"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="OpenID Connect Authentication Settings"
        className="relative z-10 w-full max-w-xl rounded-lg solid-glass-panel p-5 flex flex-col gap-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--sg-panel-border)]">
          <div className="flex items-center gap-2.5 text-[var(--sg-text)] font-semibold text-base">
            <KeyRound className="w-5 h-5 text-[var(--sg-text-muted)]" />
            <span>OpenID Connect (OIDC) Authentication</span>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        <form onSubmit={onSave} className="flex flex-col gap-3.5">
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
              onClick={onClose}
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
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
