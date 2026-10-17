import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, AdminSystemSettings } from '../types';
import { getAdminSettings, updateAdminSettings, changeAdminCredentials, testAdminStorage } from '../api';
import {
  Moon,
  Sun,
  BookOpen,
  Lock,
  Shield,
  HardDrive,
  Cloud,
  Database,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Loader2,
  X,
  RefreshCw,
  Globe,
  Paperclip,
  FileText,
  FileCode,
  Image,
  Video,
  Music2,
  Archive,
  FileQuestion,
} from 'lucide-react';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdate: (updatedUser: User) => void;
  currentTheme: 'dark' | 'light' | 'sepia';
  onThemeChange: (theme: 'dark' | 'light' | 'sepia') => void;
}

type TabType = 'theme' | 'permissions' | 'oidc' | 'storage' | 'attachments' | 'account';

// Theme option item component (extracted to reduce cognitive complexity)
const ThemeOption: React.FC<{
  value: 'dark' | 'light' | 'sepia';
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  selected: boolean;
  onSelect: (value: 'dark' | 'light' | 'sepia') => void;
  selectedTheme: 'dark' | 'light' | 'sepia';
}> = ({ value, label, icon: Icon, description, selected, selectedTheme, onSelect }) => (
  <div
    onClick={() => onSelect(value)}
    className={`p-3.5 rounded-md border cursor-pointer transition flex flex-col gap-2.5 ${
      selected
        ? 'solid-glass-btn-active border-[var(--sg-btn-active-border)] ring-1 ring-[var(--sg-text)]/20'
        : 'solid-glass-panel hover:border-[var(--sg-btn-border)]'
    }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--sg-text)]" />
        <span className="font-semibold text-xs text-[var(--sg-text)]">{label}</span>
      </div>
      {selected && (
        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded solid-glass-badge">
          Default
        </span>
      )}
    </div>
    <div className="h-10 rounded border p-1.5 flex flex-col justify-between">
      {selectedTheme === 'dark' && (
        <>
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
          <div className="w-20 h-1.5 rounded-full bg-white/10" />
        </>
      )}
      {selectedTheme === 'light' && (
        <>
          <div className="w-12 h-1.5 rounded-full bg-black/20" />
          <div className="w-20 h-1.5 rounded-full bg-black/10" />
        </>
      )}
      {selectedTheme === 'sepia' && (
        <>
          <div className="w-12 h-1.5 rounded-full bg-[#cbba9e]" />
          <div className="w-20 h-1.5 rounded-full bg-[#dfd0b7]" />
        </>
      )}
    </div>
    <p className="text-[11px] text-[var(--sg-text-muted)]">{description}</p>
  </div>
);

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdate,
  currentTheme,
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('theme');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Theme Mode
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | 'sepia'>(currentTheme);

  // 2. Allow Public Creation
  const [allowPublicCreation, setAllowPublicCreation] = useState(false);

  // 3. OIDC Settings
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcProviderName, setOidcProviderName] = useState('Enterprise SSO');
  const [oidcIssuerUrl, setOidcIssuerUrl] = useState('');
  const [oidcClientId, setOidcClientId] = useState('');
  const [oidcClientSecret, setOidcClientSecret] = useState('');
  const [oidcAllowedDomains, setOidcAllowedDomains] = useState('*');
  const [oidcRequireOnly, setOidcRequireOnly] = useState(false);
  const [showOidcSecret, setShowOidcSecret] = useState(false);

  // 4. Storage Driver & Credentials
  const [storageDriver, setStorageDriver] = useState<'local' | 'cloudinary' | 's3'>('local');
  const [cloudName, setCloudName] = useState('');
  const [cloudApiKey, setCloudApiKey] = useState('');
  const [cloudApiSecret, setCloudApiSecret] = useState('');
  const [showCloudSecret, setShowCloudSecret] = useState(false);

  const [s3Bucket, setS3Bucket] = useState('');
  const [s3Region, setS3Region] = useState('us-east-1');
  const [s3AccessKey, setS3AccessKey] = useState('');
  const [s3SecretKey, setS3SecretKey] = useState('');
  const [s3Endpoint, setS3Endpoint] = useState('');
  const [showS3Secret, setShowS3Secret] = useState(false);

  const [testingStorage, setTestingStorage] = useState(false);
  const [storageTestResult, setStorageTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 6. File Type Categories & Max Size
  const [fileTypeCategories, setFileTypeCategories] = useState<{
    documents: boolean;
    code: boolean;
    images: boolean;
    video: boolean;
    audio: boolean;
    archives: boolean;
    other: boolean;
  }>({
    documents: true,
    code: true,
    images: true,
    video: true,
    audio: true,
    archives: true,
    other: true,
  });
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(15);

  // 5. Admin Account Credentials
  const [adminUsername, setAdminUsername] = useState(currentUser.username);
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Fetch current server admin settings on mount
  useEffect(() => {
    if (!isOpen) return;
    setStatusMessage(null);
    setStorageTestResult(null);
    setLoading(true);

    getAdminSettings()
      .then((data: AdminSystemSettings) => {
        if (data.defaultTheme) setSelectedTheme(data.defaultTheme);
        setAllowPublicCreation(Boolean(data.allowAnonymousCreation));
        if (data.storageDriver) setStorageDriver(data.storageDriver);

        if (data.cloudinaryConfig) {
          setCloudName(data.cloudinaryConfig.cloudName || '');
          setCloudApiKey(data.cloudinaryConfig.apiKey || '');
          setCloudApiSecret(data.cloudinaryConfig.apiSecret || '');
        }

        if (data.s3Config) {
          setS3Bucket(data.s3Config.bucketName || '');
          setS3Region(data.s3Config.region || 'us-east-1');
          setS3AccessKey(data.s3Config.accessKeyId || '');
          setS3SecretKey(data.s3Config.secretAccessKey || '');
          setS3Endpoint(data.s3Config.endpoint || '');
        }

        if (data.oidcConfig) {
          setOidcEnabled(Boolean(data.oidcConfig.enabled));
          setOidcProviderName(data.oidcConfig.providerName || 'Enterprise SSO');
          setOidcIssuerUrl(data.oidcConfig.issuerUrl || '');
          setOidcClientId(data.oidcConfig.clientId || '');
          setOidcClientSecret(data.oidcConfig.clientSecret || '');
          setOidcAllowedDomains(data.oidcConfig.allowedDomains || '*');
          setOidcRequireOnly(Boolean(data.oidcConfig.requireOidcOnly));
        }

        if (data.adminUser?.username) {
          setAdminUsername(data.adminUser.username);
        }

        if (data.fileTypeCategories) {
          setFileTypeCategories(data.fileTypeCategories);
        }
        if (data.maxFileSize) {
          setMaxFileSizeMB(Math.round(data.maxFileSize / 1024 / 1024));
        }
      })
      .catch((err) => {
        setStatusMessage({ type: 'error', text: err.message || 'Failed to load settings' });
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Save Settings (Tabs 1-4)
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      await updateAdminSettings({
        defaultTheme: selectedTheme,
        allowAnonymousCreation: allowPublicCreation,
        storageDriver,
        cloudinaryConfig:
          storageDriver === 'cloudinary'
            ? {
                cloudName: cloudName.trim(),
                apiKey: cloudApiKey.trim(),
                apiSecret: cloudApiSecret.trim(),
              }
            : undefined,
        s3Config:
          storageDriver === 's3'
            ? {
                bucketName: s3Bucket.trim(),
                region: s3Region.trim(),
                accessKeyId: s3AccessKey.trim(),
                secretAccessKey: s3SecretKey.trim(),
                endpoint: s3Endpoint.trim() || undefined,
              }
            : undefined,
        oidcConfig: {
          enabled: oidcEnabled,
          providerName: oidcProviderName.trim(),
          issuerUrl: oidcIssuerUrl.trim(),
          clientId: oidcClientId.trim(),
          clientSecret: oidcClientSecret.trim(),
          allowedDomains: oidcAllowedDomains.trim() || '*',
          requireOidcOnly: oidcRequireOnly,
        },
        fileTypeCategories,
        maxFileSize: maxFileSizeMB * 1024 * 1024,
      });

      // Synchronize active theme if updated
      onThemeChange(selectedTheme);
      setStatusMessage({ type: 'success', text: 'System settings saved successfully!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update system settings' });
    } finally {
      setSaving(false);
    }
  };

  // Handle Test Storage Connection
  const handleTestStorage = async () => {
    setTestingStorage(true);
    setStorageTestResult(null);

    try {
      const res = await testAdminStorage({
        driver: storageDriver,
        cloudinaryConfig: {
          cloudName: cloudName.trim(),
          apiKey: cloudApiKey.trim(),
          apiSecret: cloudApiSecret.trim(),
        },
        s3Config: {
          bucketName: s3Bucket.trim(),
          region: s3Region.trim(),
          accessKeyId: s3AccessKey.trim(),
          secretAccessKey: s3SecretKey.trim(),
          endpoint: s3Endpoint.trim(),
        },
      });
      setStorageTestResult(res);
    } catch (err: any) {
      setStorageTestResult({ success: false, message: err.message || 'Storage connection test failed.' });
    } finally {
      setTestingStorage(false);
    }
  };

  // Handle Change Admin Credentials (Tab 5)
  const handleChangeAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newAdminPassword && newAdminPassword !== confirmAdminPassword) {
      setStatusMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newAdminPassword && newAdminPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }

    if (adminUsername.trim().length < 3) {
      setStatusMessage({ type: 'error', text: 'Admin username must be at least 3 characters' });
      return;
    }

    setSaving(true);
    try {
      const res = await changeAdminCredentials({
        currentPassword: currentAdminPassword,
        newUsername: adminUsername.trim(),
        newPassword: newAdminPassword || undefined,
      });

      onUserUpdate(res.user);
      setStatusMessage({ type: 'success', text: res.message || 'Admin account credentials updated successfully!' });
      setCurrentAdminPassword('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update credentials' });
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm text-sm overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[85vh] sm:max-h-[90vh] my-auto rounded-lg solid-glass-panel flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--sg-panel-border)] solid-glass-subbar shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md solid-glass-btn text-[var(--sg-text)]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--sg-text)] flex items-center gap-2">
                <span>Server & Administrator Settings</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded solid-glass-badge font-normal">v0.3.0</span>
              </h2>
              <p className="text-xs text-[var(--sg-text-muted)] font-normal">
                Configure runtime behavior, security permissions, OIDC SSO, storage drivers, and attachment policies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage && (
          <div
            className={`px-5 py-2 text-xs flex items-center gap-2 shrink-0 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-500'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Main Body with Sidebar Tabs */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Navigation Tabs */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-[var(--sg-panel-border)] solid-glass-subbar p-2.5 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition cursor-pointer shrink-0 font-medium ${
                activeTab === 'theme'
                  ? 'solid-glass-btn-active text-[var(--sg-text)]'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>1. Mode & Theme</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('permissions')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition cursor-pointer shrink-0 font-medium ${
                activeTab === 'permissions'
                  ? 'solid-glass-btn-active text-[var(--sg-text)]'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>2. Public Creation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('oidc')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition cursor-pointer shrink-0 font-medium ${
                activeTab === 'oidc'
                  ? 'solid-glass-btn-active text-[var(--sg-text)]'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>3. OIDC Settings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('storage')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition cursor-pointer shrink-0 font-medium ${
                activeTab === 'storage'
                  ? 'solid-glass-btn-active text-[var(--sg-text)]'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>4. Storage Driver</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition cursor-pointer shrink-0 font-medium ${
                activeTab === 'attachments'
                  ? 'solid-glass-btn-active text-[var(--sg-text)]'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>5. Attachments</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition cursor-pointer shrink-0 font-medium ${
                activeTab === 'account'
                  ? 'solid-glass-btn-active text-[var(--sg-text)]'
                  : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>6. Admin Account</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-5 overflow-y-auto">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--sg-text-muted)] font-mono text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--sg-text)]" />
                <span>Loading configuration...</span>
              </div>
            ) : (
              <>
                {/* TAB 1: Theme & Mode */}
                {activeTab === 'theme' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--sg-text)] flex items-center gap-2">
                        <Sun className="w-4 h-4 text-[var(--sg-text-muted)]" />
                        <span>UI Theme Mode Selection</span>
                      </h3>
                      <p className="text-xs text-[var(--sg-text-muted)] mt-0.5">
                        Select the system-wide default theme mode for unauthenticated visitors and new sessions.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <ThemeOption
                        value="dark"
                        label="Dark"
                        icon={Moon}
                        description="Sleek high-contrast dark aesthetic optimized for code reading and low light."
                        selected={selectedTheme === 'dark'}
                        selectedTheme={selectedTheme}
                        onSelect={setSelectedTheme}
                      />
                      <ThemeOption
                        value="light"
                        label="Light"
                        icon={Sun}
                        description="Crisp, clean paper-white aesthetic with sharp dark typography and syntax highlights."
                        selected={selectedTheme === 'light'}
                        selectedTheme={selectedTheme}
                        onSelect={setSelectedTheme}
                      />
                      <ThemeOption
                        value="sepia"
                        label="Sepia"
                        icon={BookOpen}
                        description="Warm warm-paper parchment palette designed to minimize eye fatigue during extended reading."
                        selected={selectedTheme === 'sepia'}
                        selectedTheme={selectedTheme}
                        onSelect={setSelectedTheme}
                      />
                    </div>

                    <div className="p-3 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)] text-xs text-[var(--sg-text-muted)] flex items-start gap-2.5">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--sg-text)] shrink-0" />
                      <span>
                        Note: You can also set this during install via <code className="text-[var(--sg-text)] font-semibold font-mono">DEFAULT_THEME=dark</code> in <code className="font-mono">.env</code> or by running <code className="font-mono">./setup.sh</code>.
                      </span>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveSettings()}
                        disabled={saving}
                        className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Save Default Theme</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: Sticky Creation Permissions */}
                {activeTab === 'permissions' && (
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
                        onClick={() => setAllowPublicCreation(!allowPublicCreation)}
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
                        onClick={() => handleSaveSettings()}
                        disabled={saving}
                        className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Save Permission Settings</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: OIDC Settings */}
                {activeTab === 'oidc' && (
                  <form onSubmit={handleSaveSettings} className="flex flex-col gap-3.5">
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
                        <label className="text-xs text-[var(--sg-text-muted)] font-medium">Provider Name</label>
                        <input
                          type="text"
                          value={oidcProviderName}
                          onChange={(e) => setOidcProviderName(e.target.value)}
                          placeholder="Google / Okta / Azure AD"
                          className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[var(--sg-text-muted)] font-medium">Issuer URL</label>
                        <input
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
                        <label className="text-xs text-[var(--sg-text-muted)] font-medium">Client ID</label>
                        <input
                          type="text"
                          value={oidcClientId}
                          onChange={(e) => setOidcClientId(e.target.value)}
                          placeholder="Enter OAuth Client ID..."
                          className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] text-xs outline-none font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[var(--sg-text-muted)] font-medium">Client Secret</label>
                        <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
                          <input
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
                      <label className="text-xs text-[var(--sg-text-muted)] font-medium">Allowed Email Domains (* for any, or comma separated)</label>
                      <input
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
                )}

                {/* TAB 4: Storage Driver */}
                {activeTab === 'storage' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--sg-text)] flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-[var(--sg-text-muted)]" />
                        <span>Image & Attachment Storage Driver</span>
                      </h3>
                      <p className="text-xs text-[var(--sg-text-muted)] mt-0.5">
                        Choose where screenshots, diagrams, and image attachments uploaded to stickies will be stored.
                      </p>
                    </div>

                    {/* Driver Radio Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div
                        onClick={() => setStorageDriver('local')}
                        className={`p-3.5 rounded-md border cursor-pointer transition flex flex-col gap-2 ${
                          storageDriver === 'local'
                            ? 'solid-glass-btn-active border-[var(--sg-btn-active-border)] ring-1 ring-[var(--sg-text)]/20'
                            : 'solid-glass-panel hover:border-[var(--sg-btn-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-[var(--sg-text)]" />
                            <span className="font-semibold text-xs text-[var(--sg-text)]">Local Disk</span>
                          </div>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded solid-glass-badge">
                            Default
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--sg-text-muted)]">
                          Saves attachments directly to the persistent local disk at <code className="font-mono">./uploads</code>.
                        </p>
                      </div>

                      <div
                        onClick={() => setStorageDriver('cloudinary')}
                        className={`p-3.5 rounded-md border cursor-pointer transition flex flex-col gap-2 ${
                          storageDriver === 'cloudinary'
                            ? 'solid-glass-btn-active border-[var(--sg-btn-active-border)] ring-1 ring-[var(--sg-text)]/20'
                            : 'solid-glass-panel hover:border-[var(--sg-btn-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cloud className="w-4 h-4 text-[var(--sg-text)]" />
                            <span className="font-semibold text-xs text-[var(--sg-text)]">Cloudinary</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[var(--sg-text-muted)]">
                          Uploads directly to Cloudinary global image CDN. Requires Org ID, API Key, and Secret.
                        </p>
                      </div>

                      <div
                        onClick={() => setStorageDriver('s3')}
                        className={`p-3.5 rounded-md border cursor-pointer transition flex flex-col gap-2 ${
                          storageDriver === 's3'
                            ? 'solid-glass-btn-active border-[var(--sg-btn-active-border)] ring-1 ring-[var(--sg-text)]/20'
                            : 'solid-glass-panel hover:border-[var(--sg-btn-border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-[var(--sg-text)]" />
                            <span className="font-semibold text-xs text-[var(--sg-text)]">Amazon S3</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[var(--sg-text-muted)]">
                          Amazon S3 or S3-compatible object storage (MinIO, Cloudflare R2, Wasabi).
                        </p>
                      </div>
                    </div>

                    {/* Dynamic Driver Settings Form */}
                    {storageDriver === 'local' && (
                      <div className="p-3.5 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--sg-text)]">Local Upload Directory</span>
                          <span className="text-xs text-emerald-500 font-mono font-medium">./uploads (Active)</span>
                        </div>
                        <p className="text-xs text-[var(--sg-text-muted)]">
                          Uploaded attachments are stored locally on the server filesystem under <code className="font-mono text-[var(--sg-text)]">./uploads</code> and served via static endpoints with zero-knowledge path traversal protection.
                        </p>
                      </div>
                    )}

                    {storageDriver === 'cloudinary' && (
                      <div className="p-3.5 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex flex-col gap-3">
                        <div className="text-xs font-semibold text-[var(--sg-text)]">Cloudinary Credentials</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1">
                            <label htmlFor="cloudinary-cloud-name" className="text-[11px] text-[var(--sg-text-muted)] font-medium">Org ID / Cloud Name</label>
                            <input
                              id="cloudinary-cloud-name"
                              type="text"
                              value={cloudName}
                              onChange={(e) => setCloudName(e.target.value)}
                              placeholder="e.g. acme-stickies"
                              className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label htmlFor="cloudinary-api-key" className="text-[11px] text-[var(--sg-text-muted)] font-medium">API Key</label>
                            <input
                              id="cloudinary-api-key"
                              type="text"
                              value={cloudApiKey}
                              onChange={(e) => setCloudApiKey(e.target.value)}
                              placeholder="e.g. 123456789012345"
                              className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label htmlFor="cloudinary-api-secret" className="text-[11px] text-[var(--sg-text-muted)] font-medium">API Secret</label>
                            <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
                              <input
                                id="cloudinary-api-secret"
                                type={showCloudSecret ? 'text' : 'password'}
                                value={cloudApiSecret}
                                onChange={(e) => setCloudApiSecret(e.target.value)}
                                placeholder="Enter API secret..."
                                className="w-full bg-transparent px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowCloudSecret(!showCloudSecret)}
                                className="px-2.5 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer"
                              >
                                {showCloudSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {storageDriver === 's3' && (
                      <div className="p-3.5 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex flex-col gap-3">
                        <div className="text-xs font-semibold text-[var(--sg-text)]">Amazon S3 Configuration</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label htmlFor="s3-bucket-name" className="text-[11px] text-[var(--sg-text-muted)] font-medium">Bucket Name</label>
                            <input
                              id="s3-bucket-name"
                              type="text"
                              value={s3Bucket}
                              onChange={(e) => setS3Bucket(e.target.value)}
                              placeholder="my-stickies-bucket"
                              className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label htmlFor="s3-region" className="text-[11px] text-[var(--sg-text-muted)] font-medium">Region</label>
                            <input
                              id="s3-region"
                              type="text"
                              value={s3Region}
                              onChange={(e) => setS3Region(e.target.value)}
                              placeholder="us-east-1"
                              className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label htmlFor="s3-access-key" className="text-[11px] text-[var(--sg-text-muted)] font-medium">AWS Access Key ID</label>
                            <input
                              id="s3-access-key"
                              type="text"
                              value={s3AccessKey}
                              onChange={(e) => setS3AccessKey(e.target.value)}
                              placeholder="AKIAIOSFODNN7EXAMPLE"
                              className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label htmlFor="s3-secret-key" className="text-[11px] text-[var(--sg-text-muted)] font-medium">AWS Secret Access Key</label>
                            <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
                              <input
                                id="s3-secret-key"
                                type={showS3Secret ? 'text' : 'password'}
                                value={s3SecretKey}
                                onChange={(e) => setS3SecretKey(e.target.value)}
                                placeholder="Enter AWS secret access key..."
                                className="w-full bg-transparent px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowS3Secret(!showS3Secret)}
                                className="px-2.5 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer"
                              >
                                {showS3Secret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] text-[var(--sg-text-muted)] font-medium">
                            Custom Endpoint (Optional — for MinIO, Cloudflare R2, Backblaze, Wasabi)
                          </label>
                          <input
                            type="text"
                            value={s3Endpoint}
                            onChange={(e) => setS3Endpoint(e.target.value)}
                            placeholder="https://s3.us-west-000.backblazeb2.com or http://minio:9000"
                            className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {/* Storage Test Result */}
                    {storageTestResult && (
                      <div
                        className={`p-3 rounded-md border text-xs flex items-center gap-2 ${
                          storageTestResult.success
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                        }`}
                      >
                        {storageTestResult.success ? (
                          <Check className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{storageTestResult.message}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={handleTestStorage}
                        disabled={testingStorage}
                        className="px-3.5 py-2 rounded-md solid-glass-btn text-[var(--sg-btn-text)] text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 font-medium"
                      >
                        {testingStorage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>Test Storage Connection</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveSettings()}
                        disabled={saving}
                        className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Save Storage Settings</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 5: Attachments & File Upload Policy */}
                {activeTab === 'attachments' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--sg-text)] flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-[var(--sg-text-muted)]" />
                        <span>Attachment & Upload Settings</span>
                      </h3>
                      <p className="text-xs text-[var(--sg-text-muted)] mt-0.5">
                        Configure allowed file type categories and per-file attachment size limits matching .env specifications.
                      </p>
                    </div>

                    {/* Setting 1: Max Filesize for Attachments */}
                    <div className="p-4 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--sg-text)]">Max Filesize for Attachments</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-black/10 dark:bg-white/10 text-[var(--sg-text-muted)]">
                              MAX_FILE_SIZE
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--sg-text-muted)] mt-0.5">
                            Maximum permitted size for each individual uploaded file attachment.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            value={maxFileSizeMB}
                            onChange={(e) => setMaxFileSizeMB(Math.max(1, Number.parseInt(e.target.value) || 1))}
                            min="1"
                            max="500"
                            step="1"
                            className="solid-glass-input rounded-md px-3 py-1.5 text-[var(--sg-input-text)] outline-none text-xs font-mono w-24 text-right"
                          />
                          <span className="text-xs text-[var(--sg-text-muted)] font-medium">MB</span>
                        </div>
                      </div>

                      {/* Quick presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--sg-panel-border)]/50">
                        <span className="text-[11px] text-[var(--sg-text-muted)] mr-1">Presets:</span>
                        {[5, 10, 15, 25, 50, 100].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setMaxFileSizeMB(size)}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                              maxFileSizeMB === size
                                ? 'solid-glass-btn-active text-[var(--sg-text)] font-semibold ring-1 ring-[var(--sg-text)]/30'
                                : 'solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)]'
                            }`}
                          >
                            {size}MB{size === 15 ? ' (Default)' : ''}
                          </button>
                        ))}
                      </div>

                      <div className="text-[11px] text-[var(--sg-text-muted)] font-mono bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded flex items-center justify-between">
                        <span>Active file size threshold:</span>
                        <span className="text-[var(--sg-text)] font-semibold">
                          {maxFileSizeMB} MB (~{(maxFileSizeMB * 1024 * 1024).toLocaleString()} bytes)
                        </span>
                      </div>
                    </div>

                    {/* Setting 2: Allow Different Types of Attachments (Toggles) */}
                    <div className="p-4 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--sg-text)]">Allow Different Types of Attachments</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-black/10 dark:bg-white/10 text-[var(--sg-text-muted)]">
                              ALLOW_*
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--sg-text-muted)] mt-0.5">
                            Toggle individual file categories on or off. Disabling a category rejects uploads of matching extensions.
                          </p>
                        </div>

                        {/* Bulk actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setFileTypeCategories({
                                documents: true,
                                code: true,
                                images: true,
                                video: true,
                                audio: true,
                                archives: true,
                                other: true,
                              })
                            }
                            className="px-2 py-1 rounded text-[10px] font-medium solid-glass-btn text-[var(--sg-text)] transition cursor-pointer"
                          >
                            Allow All
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFileTypeCategories({
                                documents: false,
                                code: false,
                                images: false,
                                video: false,
                                audio: false,
                                archives: false,
                                other: false,
                              })
                            }
                            className="px-2 py-1 rounded text-[10px] font-medium solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer"
                          >
                            Block All
                          </button>
                        </div>
                      </div>

                      {/* Category Toggles List */}
                      <div className="flex flex-col gap-2 pt-1">
                        {[
                          {
                            key: 'documents',
                            label: 'Documents',
                            envKey: 'ALLOW_DOCUMENTS',
                            icon: <FileText className="w-4 h-4 text-sky-400 shrink-0" />,
                            desc: 'PDF, Word, Text, RTF, ODT, Pages (.pdf, .doc, .docx, .txt, .rtf, .odt, .pages)',
                          },
                          {
                            key: 'code',
                            label: 'Source Code & Scripts',
                            envKey: 'ALLOW_CODE',
                            icon: <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />,
                            desc: 'JS, TS, Python, Rust, Go, Java, C/C++, HTML, CSS, JSON, YAML, Markdown (.js, .ts, .py, etc.)',
                          },
                          {
                            key: 'images',
                            label: 'Images & Photos',
                            envKey: 'ALLOW_IMAGES',
                            icon: <Image className="w-4 h-4 text-amber-400 shrink-0" />,
                            desc: 'Web & bitmap formats (.jpg, .jpeg, .png, .gif, .svg, .webp, .ico, .tiff, .heic)',
                          },
                          {
                            key: 'video',
                            label: 'Video Recordings',
                            envKey: 'ALLOW_VIDEO',
                            icon: <Video className="w-4 h-4 text-indigo-400 shrink-0" />,
                            desc: 'Digital video files (.mp4, .webm, .mkv, .mov, .avi, .flv, .m4v)',
                          },
                          {
                            key: 'audio',
                            label: 'Audio & Music',
                            envKey: 'ALLOW_AUDIO',
                            icon: <Music2 className="w-4 h-4 text-purple-400 shrink-0" />,
                            desc: 'Audio tracks & sound files (.mp3, .wav, .flac, .aac, .ogg, .wma, .m4a)',
                          },
                          {
                            key: 'archives',
                            label: 'Compressed Archives',
                            envKey: 'ALLOW_ARCHIVES',
                            icon: <Archive className="w-4 h-4 text-orange-400 shrink-0" />,
                            desc: 'Compressed file packages (.zip, .tar, .gz, .7z, .rar, .bz2, .xz)',
                          },
                          {
                            key: 'other',
                            label: 'Other Non-Executable Files',
                            envKey: 'ALLOW_OTHER',
                            icon: <FileQuestion className="w-4 h-4 text-teal-400 shrink-0" />,
                            desc: 'Any remaining file formats or extensions not categorized above',
                          },
                        ].map((cat) => {
                          const isEnabled = Boolean(fileTypeCategories[cat.key as keyof typeof fileTypeCategories]);
                          return (
                            <div
                              key={cat.key}
                              onClick={() =>
                                setFileTypeCategories({
                                  ...fileTypeCategories,
                                  [cat.key]: !isEnabled,
                                })
                              }
                              className={`p-3 rounded-md border transition cursor-pointer flex items-center justify-between gap-3 ${
                                isEnabled
                                  ? 'solid-glass-panel border-[var(--sg-btn-active-border)] ring-1 ring-[var(--sg-text)]/10'
                                  : 'solid-glass-panel opacity-65 hover:opacity-90 border-[var(--sg-panel-border)]'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-md bg-black/10 dark:bg-white/10 shrink-0">
                                  {cat.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-[var(--sg-text)] truncate">{cat.label}</span>
                                    <span className="text-[10px] font-mono text-[var(--sg-text-muted)] opacity-75">
                                      {cat.envKey}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[var(--sg-text-muted)] truncate mt-0.5">
                                    {cat.desc}
                                  </p>
                                </div>
                              </div>

                              {/* Toggle switch */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-medium ${isEnabled ? 'text-emerald-500' : 'text-[var(--sg-text-muted)]'}`}>
                                  {isEnabled ? 'Allowed' : 'Blocked'}
                                </span>
                                <div
                                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                                    isEnabled ? 'bg-[var(--sg-btn-primary-bg)]' : 'bg-black/20 dark:bg-white/20'
                                  }`}
                                >
                                  <div
                                    className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                                      isEnabled ? 'left-4.5 shadow-sm' : 'left-0.75'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Security Policy Notice */}
                      <div className="p-3 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)] text-xs text-[var(--sg-text-muted)] flex items-start gap-2.5 mt-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <span className="font-semibold text-[var(--sg-text)]">Security Enforcement</span>
                          <span>
                            Executable files and scripts (<code className="font-mono text-[var(--sg-text)]">.exe, .bat, .cmd, .sh, .jar, .bin, .msi, .ps1</code>) are always blocked at the server level regardless of category toggles.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => handleSaveSettings()}
                        disabled={saving}
                        className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Save Attachment Settings</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 6: Admin Account Credentials */}
                {activeTab === 'account' && (
                  <form onSubmit={handleChangeAdminCredentials} className="flex flex-col gap-3.5">
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
                      <label className="text-xs text-[var(--sg-text-muted)] font-medium">Administrator Username</label>
                      <input
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
                      <label className="text-xs text-[var(--sg-text-muted)] font-medium">Current Administrator Password</label>
                      <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
                        <input
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
                        <label className="text-xs text-[var(--sg-text-muted)] font-medium">New Password (leave blank to keep)</label>
                        <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
                          <input
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
                        <label className="text-xs text-[var(--sg-text-muted)] font-medium">Confirm New Password</label>
                        <input
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
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
