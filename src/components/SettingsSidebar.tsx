import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { validateCustomSlug } from '../api';
import { QRCodeModal } from './QRCodeModal';
import { generatePassphrase, generateSlug } from '../utils/passphraseGenerator';
import {
  Link,
  Clock,
  Eye,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  Zap,
  Database,
  QrCode,
  Shuffle,
  Key,
  Check,
  AlertTriangle,
  EyeOff,
} from 'lucide-react';

interface SettingsSidebarProps {
  pasteMode: 'database' | 'stateless';
  setPasteMode: (mode: 'database' | 'stateless') => void;
  customSlug: string;
  setCustomSlug: (slug: string) => void;
  expiration: string;
  setExpiration: (exp: string) => void;
  visibility: 'public' | 'unlisted' | 'private';
  setVisibility: (vis: 'public' | 'unlisted' | 'private') => void;
  password: string;
  setPassword: (pwd: string) => void;
  burnAfterReading: boolean;
  setBurnAfterReading: (burn: boolean) => void;
  onSubmit: () => void;
  onStatelessSubmit: () => void;
  isSubmitting: boolean;
  lastCreatedUrl: string | null;
  lastCreatedSlug: string | null;
  onNavigate: (path: string) => void;
  attachmentsCount?: number;
  onClearAttachments?: () => void;
  user?: User | null;
  allowAnonymousCreation?: boolean;
  editingPaste?: any;
  onCancelEdit?: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  pasteMode,
  setPasteMode,
  customSlug,
  setCustomSlug,
  expiration,
  setExpiration,
  visibility,
  setVisibility,
  password,
  setPassword,
  burnAfterReading,
  setBurnAfterReading,
  onSubmit,
  onStatelessSubmit,
  isSubmitting,
  lastCreatedUrl,
  lastCreatedSlug,
  onNavigate,
  attachmentsCount = 0,
  onClearAttachments,
  user,
  allowAnonymousCreation = false,
  editingPaste,
  onCancelEdit,
}) => {
  const [slugValidation, setSlugValidation] = useState<{
    valid?: boolean;
    message?: string;
    checking?: boolean;
  }>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassphrase, setCopiedPassphrase] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Live slug validation debounced
  useEffect(() => {
    if (pasteMode !== 'database' || !customSlug.trim()) {
      setSlugValidation({});
      return;
    }

    // When editing, reusing the current sticky's own slug is always valid!
    if (editingPaste && customSlug.trim().toLowerCase() === editingPaste.slug.toLowerCase()) {
      setSlugValidation({
        valid: true,
        message: 'Reusing current sticky slug',
        checking: false,
      });
      return;
    }

    const regex = /^[a-zA-Z0-9_-]+$/;
    if (!regex.test(customSlug.trim())) {
      setSlugValidation({
        valid: false,
        message: 'Only letters, numbers, hyphens, and underscores allowed',
        checking: false,
      });
      return;
    }
    if (customSlug.trim().length < 3 || customSlug.trim().length > 64) {
      setSlugValidation({
        valid: false,
        message: 'Must be between 3 and 64 characters',
        checking: false,
      });
      return;
    }

    setSlugValidation({ checking: true });
    const timer = setTimeout(async () => {
      const result = await validateCustomSlug(customSlug.trim(), editingPaste?.id);
      setSlugValidation({
        valid: result.valid,
        message: result.message,
        checking: false,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [customSlug, pasteMode, editingPaste]);

  const fullShareUrl = lastCreatedUrl
    ? lastCreatedUrl.startsWith('http://') || lastCreatedUrl.startsWith('https://')
      ? lastCreatedUrl
      : `${window.location.origin}${lastCreatedUrl.startsWith('/') ? '' : '/'}${lastCreatedUrl}`
    : '';

  const handleCopyLink = async () => {
    if (!fullShareUrl) return;
    await navigator.clipboard.writeText(fullShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyPassphrase = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopiedPassphrase(true);
    setTimeout(() => setCopiedPassphrase(false), 2000);
  };

  const handleGenerateSlug = () => {
    const slug = generateSlug();
    setCustomSlug(slug);
  };

  const handleGeneratePassword = () => {
    const pass = generatePassphrase();
    setPassword(pass);
    setShowPassword(true);
  };

  const hasStatelessImageConflict = pasteMode === 'stateless' && attachmentsCount > 0;

  return (
    <div className="w-full lg:w-88 flex flex-col gap-3 font-mono text-sm">
      {/* Active Edit Mode Banner */}
      {editingPaste && (
        <div className="p-3 rounded-lg solid-glass-panel border-sky-500/40 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 animate-pulse" />
            <span className="truncate">
              Editing: <strong className="text-[var(--sg-text)] font-mono">/p/{editingPaste.slug}</strong>
            </span>
          </div>
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-2 py-1 rounded-md solid-glass-btn text-xs text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] shrink-0 transition cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>
      )}

      {/* Mode Switcher: Regular Sticky vs Stateless Sticky */}
      <div className="p-1 rounded-md solid-glass-panel grid grid-cols-2 gap-1 text-sm">
        <button
          type="button"
          onClick={() => setPasteMode('database')}
          className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 transition cursor-pointer font-medium text-xs sm:text-sm ${
            pasteMode === 'database'
              ? 'solid-glass-btn-active text-[var(--sg-text)]'
              : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Regular Sticky</span>
        </button>

        <button
          type="button"
          onClick={() => setPasteMode('stateless')}
          className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 transition cursor-pointer font-medium text-xs sm:text-sm ${
            pasteMode === 'stateless'
              ? 'solid-glass-btn-active text-[var(--sg-text)]'
              : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Stateless Sticky</span>
        </button>
      </div>

      {/* Paste Configuration Card */}
      <div className="p-4 rounded-lg solid-glass-panel flex flex-col gap-3.5">
        {/* Database Specific: Custom link */}
        {pasteMode === 'database' ? (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[var(--sg-text)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Link className="w-4 h-4 text-[var(--sg-text-muted)]" />
                  Custom link
                </span>
                <span className="solid-glass-badge text-xs font-normal px-2 py-0.5 rounded shadow-xs">
                  Optional
                </span>
              </label>

              <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="custom-link-name"
                  className="w-full bg-transparent px-3.5 py-2.5 text-[var(--sg-input-text)] outline-none text-sm placeholder-[var(--sg-text-muted)] font-mono"
                />
                <button
                  type="button"
                  onClick={handleGenerateSlug}
                  className="px-3.5 py-2.5 text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/10 border-l border-[var(--sg-panel-border)] transition cursor-pointer flex items-center gap-1.5 text-xs font-medium shrink-0"
                  title="Generate random custom link"
                >
                  <Shuffle className="w-4 h-4 text-[var(--sg-text-muted)]" />
                  <span>Generate</span>
                </button>
              </div>

              {customSlug.trim() && (
                <div className="flex items-center gap-1.5 text-xs mt-0.5">
                  {slugValidation.checking ? (
                    <span className="text-[var(--sg-text-muted)] flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking availability...
                    </span>
                  ) : slugValidation.valid ? (
                    <span className="text-emerald-500 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Available link
                    </span>
                  ) : (
                    <span className="text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> {slugValidation.message}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Expiration option */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[var(--sg-text)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--sg-text-muted)]" />
                This self destructs
              </span>
              <select
                value={burnAfterReading ? 'burn' : expiration}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'burn') {
                    setBurnAfterReading(true);
                    setExpiration('burn');
                  } else {
                    setBurnAfterReading(false);
                    setExpiration(val);
                  }
                }}
                className="w-full solid-glass-input text-[var(--sg-input-text)] rounded-md px-3 py-2 outline-none text-sm cursor-pointer"
              >
                <option value="never">Never</option>
                <option value="burn">After Reading</option>
                <option value="10m">in 10 Minutes</option>
                <option value="1h">in 1 Hour</option>
                <option value="1d">in 1 Day</option>
                <option value="7d">in 7 Days</option>
                <option value="30d">in 30 Days</option>
              </select>
            </div>

            {/* Visibility options */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[var(--sg-text)] flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--sg-text-muted)]" />
                Who can see this?
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'public', label: 'Everyone' },
                  { key: 'unlisted', label: 'Anyone with Link' },
                  { key: 'private', label: 'Only Me' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVisibility(key as any)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setVisibility(key as any); }}
                    tabIndex={0}
                    className={`py-2 px-1.5 rounded-md text-center transition cursor-pointer text-xs ${
                      visibility === key
                        ? 'solid-glass-btn-active text-[var(--sg-text)]'
                        : 'solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Stateless Mode Explainer */
          <div className="p-3 rounded-md solid-glass-badge text-xs leading-relaxed">
            <span className="font-semibold text-[var(--sg-text)]">Stateless sticky:</span> Content is encoded directly into the shareable link fragment (<code>/#s=...</code>). No files or text are stored on any database.
          </div>
        )}

        {/* Password to access link */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[var(--sg-text)] flex items-center justify-between" htmlFor="password-input">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--sg-text-muted)]" />
              Password to access link
            </span>
            <span className="solid-glass-badge text-xs font-normal px-2 py-0.5 rounded shadow-xs">
              Optional
            </span>
          </label>

          <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter or generate password..."
              className="w-full bg-transparent px-3.5 py-2.5 text-[var(--sg-input-text)] outline-none text-sm placeholder-[var(--sg-text-muted)] font-mono"
            />
            {/* Password visibility toggle icon button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="px-2.5 py-2 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer flex items-center justify-center shrink-0"
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* Passphrase Copy Button */}
            {password && (
              <button
                type="button"
                onClick={handleCopyPassphrase}
                className="px-3 py-2.5 text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/10 border-l border-[var(--sg-panel-border)] transition cursor-pointer flex items-center justify-center text-xs font-medium shrink-0"
                title={copiedPassphrase ? 'Password copied to clipboard' : 'Copy password to clipboard'}
                aria-label={copiedPassphrase ? 'Password copied to clipboard' : 'Copy password to clipboard'}
              >
                {copiedPassphrase ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4 text-[var(--sg-text-muted)]" />
                )}
              </button>
            )}

            {/* Passphrase Generate Button */}
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="px-3 py-2.5 text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/10 border-l border-[var(--sg-panel-border)] transition cursor-pointer flex items-center justify-center text-xs font-medium shrink-0"
              title="Generate random secure password"
              aria-label="Generate random secure password"
            >
              <Key className="w-4 h-4 text-[var(--sg-text-muted)]" />
            </button>
          </div>
        </div>

        {/* Notice if creation requires signing in */}
        {pasteMode === 'database' && !user && allowAnonymousCreation === false && (
          <div className="p-3 rounded-md solid-glass-badge text-xs leading-relaxed flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[var(--sg-text-muted)] shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 flex-1">
              <span className="font-semibold text-[var(--sg-text)]">Sign-in required</span>
              <span className="font-normal text-[var(--sg-text-muted)]">
                Creation of stickies without signing in is disabled on this server. Please sign in or register above to publish regular stickies, or switch to a Stateless Sticky.
              </span>
            </div>
          </div>
        )}

        {/* Notice if user has attached images in Stateless mode */}
        {hasStatelessImageConflict && (
          <div className="p-3 rounded-md solid-glass-badge text-xs leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--sg-text-muted)] shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="font-normal text-[var(--sg-text)]">
                Images cannot be included in stateless stickies because links cannot hold image files. Switch to a regular sticky or remove the attached images to create a link.
              </span>
              {onClearAttachments && (
                <button
                  type="button"
                  onClick={onClearAttachments}
                  className="self-start text-[var(--sg-text)] hover:underline text-xs cursor-pointer font-medium"
                >
                  Remove attached images
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Action Button */}
        {pasteMode === 'database' ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={
              isSubmitting ||
              (customSlug.trim() !== '' && slugValidation.valid === false)
            }
            className="w-full mt-2 py-2.5 px-4 rounded-md solid-glass-btn-primary text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{editingPaste ? 'Saving sticky...' : 'Creating sticky...'}</span>
              </>
            ) : (
              <span>{editingPaste ? 'Save sticky' : 'Create sticky'}</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onStatelessSubmit}
            disabled={hasStatelessImageConflict || isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-md solid-glass-btn-primary text-sm font-medium transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            <span>Generate stateless sticky</span>
          </button>
        )}
      </div>

      {/* Shareable Link Result Box */}
      {lastCreatedUrl && (
        <div className="p-4 rounded-lg solid-glass-panel border-emerald-500/30 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between text-xs text-emerald-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {pasteMode === 'database' ? 'Sticky created' : 'Stateless sticky ready'}
            </span>
            <span className="text-[var(--sg-text-muted)] font-normal">Shareable link</span>
          </div>

          <div className="flex items-center gap-1.5 solid-glass-input rounded-md p-2">
            <code className="text-[var(--sg-text)] flex-1 truncate text-xs select-all font-mono">
              {fullShareUrl}
            </code>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1.5 rounded-md solid-glass-btn transition cursor-pointer flex items-center gap-1 text-xs font-medium"
              title="Copy full link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {lastCreatedSlug ? (
              <button
                type="button"
                onClick={() => onNavigate(`/p/${lastCreatedSlug}`)}
                className="flex-1 py-2 px-3 rounded-md solid-glass-btn-primary text-center transition flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open View</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(lastCreatedUrl)}
                className="flex-1 py-2 px-3 rounded-md solid-glass-btn-primary text-center transition flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Link</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="py-2 px-3 rounded-md solid-glass-btn text-center transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Show QR Code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR</span>
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {fullShareUrl && (
        <QRCodeModal
          url={fullShareUrl}
          title={customSlug || 'Shareable Sticky'}
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
        />
      )}
    </div>
  );
};
