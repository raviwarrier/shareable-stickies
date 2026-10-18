import React from 'react';
import { Globe, Eye, EyeOff, Loader2, Check } from 'lucide-react';

interface OidcTabProps {
  oidcEnabled: boolean;
  setOidcEnabled: (v: boolean) => void;
  oidcProviderName: string;
  setOidcProviderName: (v: string) => void;
  oidcIssuerUrl: string;
  setOidcIssuerUrl: (v: string) => void;
  oidcClientId: string;
  setOidcClientId: (v: string) => void;
  oidcClientSecret: string;
  setOidcClientSecret: (v: string) => void;
  oidcAllowedDomains: string;
  setOidcAllowedDomains: (v: string) => void;
  oidcRequireOnly: boolean;
  setOidcRequireOnly: (v: boolean) => void;
  showOidcSecret: boolean;
  setShowOidcSecret: (v: boolean) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
}

export const OidcTab: React.FC<OidcTabProps> = ({
  oidcEnabled,
  setOidcEnabled,
  oidcProviderName,
  setOidcProviderName,
  oidcIssuerUrl,
  setOidcIssuerUrl,
  oidcClientId,
  setOidcClientId,
  oidcClientSecret,
  setOidcClientSecret,
  oidcAllowedDomains,
  setOidcAllowedDomains,
  oidcRequireOnly,
  setOidcRequireOnly,
  showOidcSecret,
  setShowOidcSecret,
  onSave,
  saving,
}) => {
  return (
    <form onSubmit={onSave} className="flex flex-col gap-3.5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--sg-text)] flex items-center gap-2">
          <Globe className="w-4 h-4 text-[var(--sg-text-muted)]" />
          <span>OpenID Connect (OIDC) Single Sign-On</span>
        </h3>
        <p className="text-xs text-[var(--sg-text-muted)] mt-0.5">
          Connect with enterprise identity providers like Google Workspace, Okta, Authentik, or Keycloak.
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="p-3.5 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-[var(--sg-text)]">Enable OIDC Single Sign-On</span>
          <span className="text-[11px] text-[var(--sg-text-muted)]">Shows SSO login button on top navigation</span>
        </div>
        <button
          type="button"
          onClick={() => setOidcEnabled(!oidcEnabled)}
          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer border border-[var(--sg-panel-border)] ${
            oidcEnabled ? 'solid-glass-btn-primary' : 'solid-glass-btn'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${
              oidcEnabled
                ? 'translate-x-5 bg-[var(--sg-btn-primary-text)]'
                : 'translate-x-0 bg-[var(--sg-text-muted)]'
            }`}
          />
        </button>
      </div>

      {/* Provider Name & Issuer URL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="oidc-provider-name" className="text-xs text-[var(--sg-text-muted)] font-medium">Provider Name</label>
          <input
            id="oidc-provider-name"
            type="text"
            value={oidcProviderName}
            onChange={(e) => setOidcProviderName(e.target.value)}
            placeholder="Google / Okta / Azure AD"
            className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="oidc-issuer-url" className="text-xs text-[var(--sg-text-muted)] font-medium">Issuer URL</label>
          <input
            id="oidc-issuer-url"
            type="text"
            value={oidcIssuerUrl}
            onChange={(e) => setOidcIssuerUrl(e.target.value)}
            placeholder="https://accounts.google.com"
            className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
          />
        </div>
      </div>

      {/* Client ID & Secret */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="oidc-client-id" className="text-xs text-[var(--sg-text-muted)] font-medium">Client ID</label>
          <input
            id="oidc-client-id"
            type="text"
            value={oidcClientId}
            onChange={(e) => setOidcClientId(e.target.value)}
            placeholder="Enter OAuth Client ID..."
            className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="oidc-client-secret" className="text-xs text-[var(--sg-text-muted)] font-medium">Client Secret</label>
          <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
            <input
              id="oidc-client-secret"
              type={showOidcSecret ? 'text' : 'password'}
              value={oidcClientSecret}
              onChange={(e) => setOidcClientSecret(e.target.value)}
              placeholder="Enter Client Secret..."
              className="w-full bg-transparent px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => setShowOidcSecret(!showOidcSecret)}
              className="px-2.5 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer"
            >
              {showOidcSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Allowed Domains & Require OIDC Only */}
      <div className="flex flex-col gap-1">
        <label htmlFor="oidc-allowed-domains" className="text-xs text-[var(--sg-text-muted)] font-medium">
          Allowed Email Domains (* for any, or comma separated)
        </label>
        <input
          id="oidc-allowed-domains"
          type="text"
          value={oidcAllowedDomains}
          onChange={(e) => setOidcAllowedDomains(e.target.value)}
          placeholder="* or company.com, team.org"
          className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
        />
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)]">
        <input
          type="checkbox"
          id="requireOidc"
          checked={oidcRequireOnly}
          onChange={(e) => setOidcRequireOnly(e.target.checked)}
          className="rounded border-[var(--sg-input-border)] bg-[var(--sg-input-bg)] text-[var(--sg-text)] cursor-pointer"
        />
        <label htmlFor="requireOidc" className="text-xs text-[var(--sg-text)] cursor-pointer font-medium">
          Require OIDC Single Sign-On only (disables standard password registration)
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save OIDC Configuration</span>
        </button>
      </div>
    </form>
  );
};
