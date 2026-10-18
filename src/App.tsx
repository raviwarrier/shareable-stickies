import React, { useState, useEffect } from 'react';
import { User, Paste } from './types';
import { getCurrentUser, createPaste, getPaste, getAppConfig, updatePasteApi } from './api';
import { encryptClientSide } from './crypto/clientCrypto';
import { encodeStatelessPaste, decodeStatelessPaste, StatelessPasteData } from './crypto/stateless';
import { Header } from './components/Header';
import { EditorPane } from './components/EditorPane';
import { SettingsSidebar } from './components/SettingsSidebar';
import { PasteViewer } from './components/PasteViewer';
import { Dashboard } from './components/Dashboard';
import { PublicStickies } from './components/PublicStickies';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appConfig, setAppConfig] = useState<{ allowAnonymousCreation: boolean } | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [statelessData, setStatelessData] = useState<StatelessPasteData | null>(null);

  // Editor states
  const [pasteMode, setPasteMode] = useState<'database' | 'stateless'>('database');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [syntax, setSyntax] = useState('plaintext');
  const [customSlug, setCustomSlug] = useState('');
  const [expiration, setExpiration] = useState('never');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [password, setPassword] = useState('');
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  // Submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);
  const [lastCreatedSlug, setLastCreatedSlug] = useState<string | null>(null);
  const [editingPaste, setEditingPaste] = useState<Paste | null>(null);

  const handleNewSticky = () => {
    setEditingPaste(null);
    setTitle('');
    setContent('');
    setCustomSlug('');
    setPassword('');
    setAttachments([]);
    setLastCreatedUrl(null);
    setLastCreatedSlug(null);
    setSubmitError(null);
  };

  // Check and parse stateless hash
  const checkHash = () => {
    const hash = window.location.hash;
    if (hash && (hash.startsWith('#s=') || hash.length > 2)) {
      const decoded = decodeStatelessPaste(hash);
      setStatelessData(decoded);
    } else {
      setStatelessData(null);
    }
  };

  // Initialize session, server config, and URL listeners
  useEffect(() => {
    getCurrentUser().then((u) => setUser(u)).catch(() => {});
    getAppConfig().then((cfg) => {
      setAppConfig(cfg);
      if (!localStorage.getItem('app-theme') && cfg.defaultTheme) {
        document.documentElement.dataset.theme = cfg.defaultTheme;
      }
    }).catch(() => {});
    checkHash();

    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      getAppConfig().then((cfg) => setAppConfig(cfg)).catch(() => {});
      checkHash();
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Ensure unauthenticated user on dashboard is redirected to root
  useEffect(() => {
    if (!user && currentPath === '/dashboard') {
      navigate('/');
    }
  }, [user, currentPath]);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    getAppConfig().then((cfg) => setAppConfig(cfg)).catch(() => {});
    checkHash();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit standard database paste (Always zero-knowledge encrypted when password is set)
  const handlePublish = async () => {
    if (!user && appConfig && !appConfig.allowAnonymousCreation) {
      setSubmitError('Creating stickies without signing in is disabled on this server. Please sign in or register using the form above.');
      return;
    }

    if (!content.trim() && attachments.length === 0) {
      setSubmitError('Please enter some text or attach an image.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const isEncrypted = Boolean(password.trim());
      let finalContent = content;

      if (isEncrypted) {
        // Zero-knowledge encryption is always on: AES-GCM encrypted in-browser before sending
        finalContent = await encryptClientSide(content, password.trim());
      }

      // If in edit mode, update the existing paste
      if (editingPaste) {
        const cleanSlug = customSlug.trim();
        const res = await updatePasteApi(editingPaste.id, {
          title: title.trim() || undefined,
          content: finalContent,
          syntax,
          visibility,
          customSlug: cleanSlug && cleanSlug !== editingPaste.slug ? cleanSlug : undefined,
        });

        const fullUrl = `${window.location.origin}/p/${res.slug}`;
        setLastCreatedUrl(fullUrl);
        setLastCreatedSlug(res.slug);
        setEditingPaste(null);
        navigate(`/p/${res.slug}`);
        return;
      }

      const res = await createPaste({
        title: title.trim() || undefined,
        content: finalContent,
        syntax,
        customSlug: customSlug.trim() || undefined,
        expiration,
        password: password.trim() || undefined,
        clientEncrypted: isEncrypted,
        visibility,
        burnAfterReading,
        attachments,
      });

      const fullUrl = `${window.location.origin}${res.shareUrl.startsWith('/') ? '' : '/'}${res.shareUrl}`;
      setLastCreatedUrl(fullUrl);
      setLastCreatedSlug(res.paste.slug);
    } catch (err: any) {
      setSubmitError(err.message || (editingPaste ? 'Failed to update sticky' : 'Failed to create sticky'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate stateless URL fragment paste (Zero backend writes)
  const handleStatelessSubmit = async () => {
    if (attachments.length > 0) {
      setSubmitError('Images cannot be included in stateless stickies because links cannot hold image files. Switch to a regular sticky or remove the attached images to create a link.');
      return;
    }

    if (!content.trim()) {
      setSubmitError('Please enter some text for your stateless sticky.');
      return;
    }

    setSubmitError(null);

    try {
      const isEncrypted = Boolean(password.trim());
      let finalContent = content;

      if (isEncrypted) {
        // Zero-knowledge in-browser encryption
        finalContent = await encryptClientSide(content, password.trim());
      }

      const fragment = encodeStatelessPaste({
        title: title.trim() || 'Stateless Sticky',
        content: finalContent,
        syntax,
        createdAt: Date.now(),
        clientEncrypted: isEncrypted,
      });

      const fullUrl = `${window.location.origin}/${fragment}`;
      setLastCreatedUrl(fullUrl);
      setLastCreatedSlug(null);

      // Copy automatically
      await navigator.clipboard.writeText(fullUrl);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to generate stateless link');
    }
  };

  const handleEditPaste = async (pasteToEdit: Paste) => {
    setEditingPaste(pasteToEdit);
    setTitle(pasteToEdit.title);
    setSyntax(pasteToEdit.syntax);
    setCustomSlug(pasteToEdit.slug);
    setVisibility(pasteToEdit.visibility);
    setPasteMode('database');
    setSubmitError(null);
    setLastCreatedUrl(null);
    setLastCreatedSlug(null);

    if (pasteToEdit.content !== undefined) {
      setContent(pasteToEdit.content);
    } else {
      try {
        const fetched = await getPaste(pasteToEdit.slug);
        if (fetched.paste?.content) {
          setContent(fetched.paste.content);
        }
      } catch (err) {
        console.error('Failed to load paste content for editing:', err);
      }
    }
    navigate('/');
  };

  // Route extraction
  const isPasteView = currentPath.startsWith('/p/');
  const pasteSlug = isPasteView ? currentPath.replace('/p/', '').split('/')[0] : null;
  const isPublicStickiesView = currentPath.startsWith('/public-stickies/');
  const publicUsername = isPublicStickiesView ? currentPath.replace('/public-stickies/', '').split('/')[0] : null;
  const isDashboardView = currentPath === '/dashboard';
  const isStatelessView = !!statelessData;

  const renderMainContent = () => {
    if (isStatelessView) {
      return (
        <PasteViewer
          statelessData={statelessData}
          onNavigate={navigate}
          onEditPaste={handleEditPaste}
          user={user}
        />
      );
    }
    if (isPasteView && pasteSlug) {
      return (
        <PasteViewer
          slug={pasteSlug}
          onNavigate={navigate}
          onEditPaste={handleEditPaste}
          user={user}
        />
      );
    }
    if (isPublicStickiesView && publicUsername) {
      return (
        <PublicStickies
          username={publicUsername}
          currentUser={user}
          onNavigate={navigate}
        />
      );
    }
    if (isDashboardView && user) {
      return (
        <Dashboard
          user={user}
          onNavigate={navigate}
          onEditPaste={handleEditPaste}
        />
      );
    }
    return (
      /* Dual-Pane Editor Workbench (Default / Root view) */
      <div className="flex-1 flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Left Pane: Code / Text Editor & Attachments */}
        <EditorPane
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          syntax={syntax}
          setSyntax={setSyntax}
          attachments={attachments}
          setAttachments={setAttachments}
          showLineNumbers={showLineNumbers}
          setShowLineNumbers={setShowLineNumbers}
          isStatelessMode={pasteMode === 'stateless'}
        />

        {/* Right Pane: Settings, Mode Switcher & Share Actions */}
        <SettingsSidebar
          pasteMode={pasteMode}
          setPasteMode={setPasteMode}
          customSlug={customSlug}
          setCustomSlug={setCustomSlug}
          expiration={expiration}
          setExpiration={setExpiration}
          visibility={visibility}
          setVisibility={setVisibility}
          password={password}
          setPassword={setPassword}
          burnAfterReading={burnAfterReading}
          setBurnAfterReading={setBurnAfterReading}
          onSubmit={handlePublish}
          onStatelessSubmit={handleStatelessSubmit}
          isSubmitting={isSubmitting}
          lastCreatedUrl={lastCreatedUrl}
          lastCreatedSlug={lastCreatedSlug}
          onNavigate={navigate}
          attachmentsCount={attachments.length}
          onClearAttachments={() => setAttachments([])}
          user={user}
          allowAnonymousCreation={appConfig?.allowAnonymousCreation ?? false}
          editingPaste={editingPaste}
          onCancelEdit={handleNewSticky}
        />
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-[var(--sg-bg)] text-[var(--sg-text)] flex flex-col relative solid-glass-grid transition-colors duration-200"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {/* Technical atmospheric ambient lighting for solid-glass refraction (Grayscale / Smoky) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-32 right-1/4 w-[600px] h-[600px] rounded-full bg-white/[0.03] dark:bg-white/[0.04] blur-[140px]" />
        <div className="absolute top-1/3 -left-32 w-[650px] h-[650px] rounded-full bg-slate-400/[0.03] dark:bg-slate-400/[0.04] blur-[160px]" />
        <div className="absolute -bottom-32 right-1/3 w-[650px] h-[650px] rounded-full bg-zinc-400/[0.025] dark:bg-zinc-300/[0.035] blur-[160px]" />
      </div>

      {/* Header with Inline Auth & Operational Explainer */}
      <div className="sticky top-0 z-[100] w-full">
        <Header
          user={user}
          onUserChange={setUser}
          currentPath={currentPath}
          navigate={navigate}
          onNewSticky={handleNewSticky}
        />
      </div>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-3 sm:py-4 md:py-6 flex flex-col relative z-0">
        {submitError && (
          <div className="mb-4 p-3 rounded-lg solid-glass-panel border-rose-500/30 text-rose-400 font-mono text-xs flex items-center justify-between shadow-lg">
            <span>{submitError}</span>
            <button
              onClick={() => setSubmitError(null)}
              className="text-rose-400 hover:text-white text-xs underline cursor-pointer ml-3 font-normal"
            >
              Dismiss
            </button>
          </div>
        )}

        {renderMainContent()}
      </main>

      {/* Footer with Solid Glass Theme Integration */}
      <footer className="solid-glass-subbar border-t border-[var(--sg-panel-border)] text-xs text-[var(--sg-text-muted)] py-3.5 px-4 relative z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-center">
          <span>Your stickies are always encrypted. No one can read or see them, except those you share it with.</span>
        </div>
      </footer>
    </div>
  );
}
