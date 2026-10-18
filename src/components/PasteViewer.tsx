import React, { useEffect, useState, useMemo } from 'react';
import { Paste, User } from '../types';
import { getPaste, recordCopy } from '../api';
import { decryptClientSide, isClientEncrypted } from '../crypto/clientCrypto';
import { StatelessPasteData } from '../crypto/stateless';
import { QRCodeModal } from './QRCodeModal';
import { highlightCode } from '../utils/syntaxHighlighter';
import {
  Copy,
  Download,
  FileCode,
  Flame,
  Lock,
  ArrowLeft,
  Check,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Zap,
  Eye,
  QrCode,
  Image as ImageIcon,
  Edit3,
  Link as LinkIcon,
} from 'lucide-react';

interface PasteViewerProps {
  slug?: string;
  statelessData?: StatelessPasteData | null;
  onNavigate: (path: string) => void;
  onEditPaste?: (paste: Paste) => void;
  user?: User | null;
}

const EXTENSION_MAP: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  powershell: 'ps1',
  html: 'html',
  css: 'css',
  json: 'json',
  markdown: 'md',
  yaml: 'yaml',
  sql: 'sql',
  bash: 'sh',
  cpp: 'cpp',
  csharp: 'cs',
  java: 'java',
  rust: 'rs',
  go: 'go',
  php: 'php',
  ruby: 'rb',
  csv: 'csv',
  diff: 'diff',
  plaintext: 'txt',
};

export const PasteViewer: React.FC<PasteViewerProps> = ({
  slug,
  statelessData,
  onNavigate,
  onEditPaste,
  user,
}) => {
  const [paste, setPaste] = useState<Paste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [burnedNotice, setBurnedNotice] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const handleCopyLink = async () => {
    let url = window.location.href;
    if (paste?.slug && !statelessData) {
      url = `${window.location.origin}/p/${paste.slug}`;
    }
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Client-side zero-knowledge decryption state
  const [isClientEnc, setIsClientEnc] = useState(false);
  const [clientDecryptedContent, setClientDecryptedContent] = useState<string | null>(null);
  const [clientPassphrase, setClientPassphrase] = useState('');
  const [clientDecryptError, setClientDecryptError] = useState<string | null>(null);

  // If stateless data is provided directly
  useEffect(() => {
    if (statelessData) {
      const isEnc = isClientEncrypted(statelessData.content);
      setIsClientEnc(isEnc);
      setPaste({
        id: 'stateless',
        slug: 'stateless',
        title: statelessData.title,
        syntax: statelessData.syntax,
        content: statelessData.content,
        clientEncrypted: isEnc,
        hasPassword: false,
        visibility: 'unlisted',
        burnAfterReading: false,
        burnViewed: false,
        createdAt: statelessData.createdAt,
        expiresAt: null,
        expirationOption: 'never',
        views: 1,
        copyCount: 0,
        attachments: [],
        pinned: false,
      });
      setLoading(false);
      return;
    }

    if (slug) {
      fetchPasteData();
    }
  }, [slug, statelessData]);

  const handleClientSideDecryption = async (paste: Paste, pwd?: string) => {
    if (!paste.content) return;
    const isEnc = paste.clientEncrypted || isClientEncrypted(paste.content);
    if (!isEnc) return;
    setIsClientEnc(true);
    if (pwd) {
      try {
        const plain = await decryptClientSide(paste.content, pwd);
        setClientDecryptedContent(plain);
      } catch {
        // User needs to provide decryption passphrase
      }
    }
  };

  const fetchPasteData = async (pwd?: string) => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    setPasswordError(null);
    try {
      const res = await getPaste(slug, { password: pwd });
      setPaste(res.paste);
      if (res.requiresPassword) {
        setRequiresPassword(true);
      } else {
        setRequiresPassword(false);
        await handleClientSideDecryption(res.paste, pwd);
        if (res.paste.burnAfterReading || res.paste.isBurnedNow) {
          setBurnedNotice(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load paste');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    try {
      await fetchPasteData(passwordInput.trim());
    } catch (err: any) {
      setPasswordError(err.message || 'Incorrect password');
    }
  };

  const handleClientDecrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientPassphrase.trim() || !paste?.content) return;
    setClientDecryptError(null);
    try {
      const plaintext = await decryptClientSide(paste.content, clientPassphrase.trim());
      setClientDecryptedContent(plaintext);
    } catch (err: any) {
      setClientDecryptError(err.message || 'Incorrect decryption passphrase');
    }
  };

  const activeContent = clientDecryptedContent !== null ? clientDecryptedContent : paste?.content;

  const handleCopy = async () => {
    if (!activeContent) return;
    await navigator.clipboard.writeText(activeContent);
    setCopied(true);
    if (slug) {
      recordCopy(slug);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeContent || !paste) return;
    const ext = EXTENSION_MAP[paste.syntax] || 'txt';
    const filename = `${paste.slug || 'sticky'}.${ext}`;
    const blob = new Blob([activeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lineNumbersText = useMemo(() => {
    if (!activeContent) return '1';
    const count = activeContent.split('\n').length;
    return Array.from({ length: count }, (_, i) => i + 1).join('\n');
  }, [activeContent]);

  const formattedDate = useMemo(() => {
    if (!paste?.createdAt) return '';
    return new Date(paste.createdAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [paste?.createdAt]);

  const formattedExpiry = useMemo(() => {
    if (!paste || statelessData) return 'never';
    if (!paste.expiresAt || paste.expirationOption === 'never') return 'never';
    return new Date(paste.expiresAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [paste?.expiresAt, paste?.expirationOption, statelessData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-[var(--sg-text-muted)] font-mono text-xs gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--sg-text)]" />
        <span>Fetching sticky {slug ? `/p/${slug}` : 'payload'}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-8 p-5 rounded-lg solid-glass-panel border-rose-500/40 font-mono text-xs">
        <div className="flex items-center gap-2 text-rose-500 font-semibold mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Notice</span>
        </div>
        <p className="text-[var(--sg-text-muted)] mb-4">{error}</p>
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
      </div>
    );
  }

  // Server password protection prompt
  if (requiresPassword) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 rounded-lg solid-glass-panel font-mono text-sm shadow-xl">
        <div className="flex items-center gap-2 text-[var(--sg-text)] font-semibold mb-2 text-base">
          <Lock className="w-5 h-5 text-[var(--sg-text-muted)]" />
          <span>Password Protected Sticky</span>
        </div>
        <p className="text-[var(--sg-text-muted)] text-xs mb-4 font-normal">
          This paste requires an access passphrase to view.
        </p>

        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter passphrase..."
            className="w-full solid-glass-input rounded-md px-3.5 py-2.5 text-[var(--sg-input-text)] outline-none text-sm placeholder-[var(--sg-text-muted)] font-mono"
          />
          {passwordError && <p className="text-rose-500 text-xs font-normal">{passwordError}</p>}
          <div className="flex items-center justify-between gap-2 mt-1">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="px-3.5 py-2 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer text-xs font-normal"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md solid-glass-btn-primary font-medium transition cursor-pointer text-xs"
            >
              Unlock Sticky
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!paste) return null;

  const canShareLink = Boolean(statelessData || paste.visibility === 'public' || paste.visibility === 'unlisted');

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto">
      {/* Burn Alert Banner */}
      {burnedNotice && (
        <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/30 font-mono text-xs text-rose-500 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500 shrink-0" />
            <span>
              <strong>Burn-After-Reading Triggered:</strong> This sticky has been atomically destroyed from the server database. Save your copy now.
            </span>
          </div>
          <button
            onClick={handleDownload}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 rounded-md text-[11px] shrink-0 font-mono transition cursor-pointer"
          >
            Download Now
          </button>
        </div>
      )}

      {/* Stateless Link Banner */}
      {statelessData && (
        <div className="p-2.5 rounded-md solid-glass-badge font-mono text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--sg-text-muted)] shrink-0" />
            <span className="text-[var(--sg-text)]">
              <strong>Stateless Link:</strong> This note was decoded directly from the URL hash fragment. Zero bytes are stored on any server.
            </span>
          </div>
        </div>
      )}

      {/* Sticky Meta Header */}
      <div className="p-4 rounded-lg solid-glass-panel font-mono text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (user) {
                onNavigate('/dashboard');
              } else if (window.history.length > 1) {
                window.history.back();
              } else {
                onNavigate('/');
              }
            }}
            className="p-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer"
            title={user ? 'Back to My Stickies' : 'Back'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold text-[var(--sg-text)]">{paste.title}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-md solid-glass-badge font-semibold uppercase">
                {paste.syntax}
              </span>
              {statelessData ? (
                <span className="text-xs px-2 py-0.5 rounded-md solid-glass-badge font-normal flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Stateless
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-md solid-glass-badge font-normal capitalize">
                  {paste.visibility}
                </span>
              )}
              {paste.hasPassword && (
                <span className="text-xs px-2 py-0.5 rounded-md solid-glass-badge font-medium flex items-center gap-1 text-rose-500">
                  <Lock className="w-3.5 h-3.5" /> Password Protected
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--sg-text-muted)] flex flex-wrap items-center gap-3 mt-1.5 font-normal">
              {!statelessData && (
                <>
                  <span>Slug: <code className="text-[var(--sg-text)] font-medium">/p/{paste.slug}</code></span>
                  <span className="opacity-40">â€¢</span>
                </>
              )}
              <span>Created {formattedDate}</span>
              <span className="opacity-40">â€¢</span>
              <span>Expires {formattedExpiry}</span>
              {paste.authorUsername && (
                <>
                  <span className="opacity-40">â€¢</span>
                  <span>by @{paste.authorUsername}</span>
                </>
              )}
              {!statelessData && (
                <>
                  <span className="opacity-40">â€¢</span>
                  <span className="flex items-center gap-1" title="View Count">
                    <Eye className="w-3.5 h-3.5 text-[var(--sg-text-muted)]" /> {paste.views} views
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls: Right aligned, icon-only buttons with tooltips, 2-4px bigger icons */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Copy Link button: available for public and unlisted stickies, hidden for private stickies */}
          {canShareLink && (
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer flex items-center justify-center"
              title={copiedLink ? 'Link Copied' : 'Copy Link'}
              aria-label={copiedLink ? 'Link Copied' : 'Copy Link'}
            >
              {copiedLink ? <Check className="w-[18px] h-[18px] text-emerald-500" /> : <LinkIcon className="w-[18px] h-[18px] text-[var(--sg-text-muted)]" />}
            </button>
          )}

          <button
            onClick={() => setQrModalOpen(true)}
            className="p-2 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer flex items-center justify-center"
            title="QR Code"
            aria-label="QR Code"
          >
            <QrCode className="w-[18px] h-[18px] text-[var(--sg-text-muted)]" />
          </button>

          <button
            onClick={handleCopy}
            className="p-2 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer flex items-center justify-center"
            title={copied ? 'Copied' : 'Copy Content'}
            aria-label={copied ? 'Copied' : 'Copy Content'}
          >
            {copied ? <Check className="w-[18px] h-[18px] text-emerald-500" /> : <Copy className="w-[18px] h-[18px] text-[var(--sg-text-muted)]" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-2 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer flex items-center justify-center"
            title="Download"
            aria-label="Download"
          >
            <Download className="w-[18px] h-[18px] text-[var(--sg-text-muted)]" />
          </button>

          {onEditPaste && (
            <button
              onClick={() => onEditPaste(paste)}
              className="p-2 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer flex items-center justify-center"
              title="Edit"
              aria-label="Edit"
            >
              <Edit3 className="w-[18px] h-[18px] text-[var(--sg-text-muted)]" />
            </button>
          )}

          {!statelessData && (
            <a
              href={`/raw/${paste.slug}`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition flex items-center justify-center"
              title="Raw Contents"
              aria-label="Raw Contents"
            >
              <FileCode className="w-[18px] h-[18px] text-[var(--sg-text-muted)]" />
            </a>
          )}
        </div>
      </div>

      {/* Client-side decryption form â€” shown to ALL users (owner and non-owner) */}
      {isClientEnc && clientDecryptedContent === null && (
        <div className="p-6 rounded-lg solid-glass-panel border-emerald-500/30 font-mono text-xs flex flex-col gap-3 max-w-xl mx-auto my-6">
          <div className="flex items-center gap-2 text-emerald-500 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Client-Side Zero-Knowledge Encryption</span>
          </div>
          <p className="text-[var(--sg-text-muted)] text-xs leading-relaxed font-normal">
            This sticky was encrypted client-side when it was created. The server only holds ciphertext. Enter the passphrase to decrypt locally in your browser.
          </p>

          <form onSubmit={handleClientDecrypt} className="flex flex-col gap-3 mt-1">
            <input
              type="password"
              value={clientPassphrase}
              onChange={(e) => setClientPassphrase(e.target.value)}
              placeholder="Enter decryption passphrase..."
              className="w-full solid-glass-input rounded-md px-3.5 py-2.5 text-[var(--sg-input-text)] outline-none text-sm placeholder-[var(--sg-text-muted)] font-mono"
            />
            {clientDecryptError && <p className="text-rose-500 text-xs font-normal">{clientDecryptError}</p>}
            <button
              type="submit"
              className="py-2.5 px-5 rounded-md solid-glass-btn-primary text-sm font-medium transition cursor-pointer self-start shadow-md"
            >
              Decrypt in Browser
            </button>
          </form>
        </div>
      )}

      {/* Main Content Viewer with Line Numbers â€” only when not (encrypted and undecrypted) */}
      {(isClientEnc === false || clientDecryptedContent !== null) && (
        <div className="rounded-lg solid-glass-panel overflow-hidden flex min-h-[420px]">
          {/* Line numbers gutter */}
          <div
            className="w-14 select-none py-4 text-right pr-3 font-mono text-sm text-[var(--sg-text-muted)] border-r border-[var(--sg-panel-border)] bg-black/10 dark:bg-black/20 leading-7 whitespace-pre"
            aria-hidden="true"
          >
            {lineNumbersText}
          </div>

          {/* Code / Text Container with Syntax Highlighting */}
          <div className="flex-1 p-5 overflow-x-auto font-mono text-sm md:text-base leading-7 select-text">
            <pre className={`language-${paste.syntax} !bg-transparent !p-0 !m-0`}>
              <code
                className={`language-${paste.syntax}`}
                dangerouslySetInnerHTML={{
                  __html: highlightCode(activeContent || '', paste.syntax),
                }}
              />
            </pre>
          </div>
        </div>
      )}

      {/* Attachments Section */}
      {paste.attachments && paste.attachments.length > 0 && (
        <div className="p-4 rounded-lg solid-glass-panel font-mono text-xs">
          <div className="flex items-center justify-between mb-3 text-[var(--sg-text)] font-semibold">
            <span className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[var(--sg-text-muted)]" />
              Attachments ({paste.attachments.length} {paste.attachments.length === 1 ? 'file' : 'files'})
            </span>
            <span className="text-xs text-[var(--sg-text-muted)] font-medium">Stored attachments</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {paste.attachments.map((att) => (
              <div
                key={att.id}
                className="group relative p-2 rounded-md solid-glass-btn flex flex-col gap-2 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setSelectedImage(att.url)}
                  className="w-full text-left cursor-pointer focus:outline-none flex flex-col gap-2"
                >
                  <img
                    src={att.url}
                    alt={att.originalName}
                    className="w-full h-28 object-cover group-hover:scale-105 transition rounded"
                  />
                  <span className="truncate text-[var(--sg-text)] font-medium block" title={att.originalName}>
                    {att.originalName}
                  </span>
                </button>
                <div className="flex items-center justify-end">
                  <a
                    href={att.url}
                    download={att.originalName}
                    className="p-1 rounded-md solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer"
                    title="Download image"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <button
          onClick={() => setSelectedImage(null)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedImage(null); }}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          type="button"
        >
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-full max-h-full rounded-md border border-[var(--sg-panel-border)] shadow-2xl object-contain"
          />
        </button>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        url={statelessData ? window.location.href : `${window.location.origin}/p/${slug}`}
        title={paste.title}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};

