import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, AdminSystemSettings, AppTheme, StorageDriverType, FileTypeCategories } from '../types';
import { getAdminSettings, updateAdminSettings, changeAdminCredentials, testAdminStorage } from '../api';
import { Shield, X, Loader2, Check, AlertTriangle } from 'lucide-react';
import { AdminSidebar, TabType } from './admin/AdminSidebar';
import { ThemeTab } from './admin/ThemeTab';
import { PermissionsTab } from './admin/PermissionsTab';
import { OidcTab } from './admin/OidcTab';
import { StorageTab } from './admin/StorageTab';
import { AttachmentsTab } from './admin/AttachmentsTab';
import { AccountTab } from './admin/AccountTab';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUserUpdate: (updatedUser: User) => void;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

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
  const [selectedTheme, setSelectedTheme] = useState<AppTheme>(currentTheme);

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
  const [storageDriver, setStorageDriver] = useState<StorageDriverType>('local');
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

  // 5. File Type Categories & Max Size
  const [fileTypeCategories, setFileTypeCategories] = useState<FileTypeCategories>({
    documents: true,
    code: true,
    images: true,
    video: true,
    audio: true,
    archives: true,
    other: true,
  });
  const [maxFileSizeMB, setMaxFileSizeMB] = useState(15);

  // 6. Admin Account Credentials
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
        setAllowPublicCreation(!!data.allowAnonymousCreation);
        if (data.storageDriver) setStorageDriver(data.storageDriver);
        if (data.cloudinaryConfig) {
          setCloudName(data.cloudinaryConfig.cloudName || '');
          setCloudApiKey(data.cloudinaryConfig.apiKey || '');
        }
        if (data.s3Config) {
          setS3Bucket(data.s3Config.bucketName || '');
          setS3Region(data.s3Config.region || 'us-east-1');
          setS3AccessKey(data.s3Config.accessKeyId || '');
          setS3Endpoint(data.s3Config.endpoint || '');
        }
        if (data.oidcConfig) {
          setOidcEnabled(!!data.oidcConfig.enabled);
          setOidcProviderName(data.oidcConfig.providerName || 'Enterprise SSO');
          setOidcIssuerUrl(data.oidcConfig.issuerUrl || '');
          setOidcClientId(data.oidcConfig.clientId || '');
          setOidcAllowedDomains(data.oidcConfig.allowedDomains || '*');
          setOidcRequireOnly(!!data.oidcConfig.requireOidcOnly);
        }
        if (data.fileTypeCategories) {
          setFileTypeCategories(data.fileTypeCategories);
        }
        if (data.maxFileSize) {
          setMaxFileSizeMB(Math.round(data.maxFileSize / (1024 * 1024)) || 15);
        }
      })
      .catch((err) => {
        setStatusMessage({ type: 'error', text: err.message || 'Failed to fetch settings' });
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Handle Save System Settings
  const handleSaveSettings = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      await updateAdminSettings({
        defaultTheme: selectedTheme,
        allowAnonymousCreation: allowPublicCreation,
        storageDriver,
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
        oidcConfig: {
          enabled: oidcEnabled,
          providerName: oidcProviderName.trim(),
          issuerUrl: oidcIssuerUrl.trim(),
          clientId: oidcClientId.trim(),
          clientSecret: oidcClientSecret.trim(),
          allowedDomains: oidcAllowedDomains.trim(),
          requireOidcOnly: oidcRequireOnly,
        },
        fileTypeCategories,
        maxFileSize: maxFileSizeMB * 1024 * 1024,
      });

      onThemeChange(selectedTheme);
      setStatusMessage({ type: 'success', text: 'System settings saved and applied successfully!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save settings' });
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

  // Handle Change Admin Credentials
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

  if (!isOpen) return null;

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-[var(--sg-text-muted)] font-mono text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--sg-text)]" />
          <span>Loading configuration...</span>
        </div>
      );
    }

    switch (activeTab) {
      case 'theme':
        return (
          <ThemeTab
            selectedTheme={selectedTheme}
            onSelectTheme={setSelectedTheme}
            onSave={handleSaveSettings}
            saving={saving}
          />
        );
      case 'permissions':
        return (
          <PermissionsTab
            allowPublicCreation={allowPublicCreation}
            onTogglePublicCreation={() => setAllowPublicCreation(!allowPublicCreation)}
            onSave={handleSaveSettings}
            saving={saving}
          />
        );
      case 'oidc':
        return (
          <OidcTab
            oidcEnabled={oidcEnabled}
            setOidcEnabled={setOidcEnabled}
            oidcProviderName={oidcProviderName}
            setOidcProviderName={setOidcProviderName}
            oidcIssuerUrl={oidcIssuerUrl}
            setOidcIssuerUrl={setOidcIssuerUrl}
            oidcClientId={oidcClientId}
            setOidcClientId={setOidcClientId}
            oidcClientSecret={oidcClientSecret}
            setOidcClientSecret={setOidcClientSecret}
            oidcAllowedDomains={oidcAllowedDomains}
            setOidcAllowedDomains={setOidcAllowedDomains}
            oidcRequireOnly={oidcRequireOnly}
            setOidcRequireOnly={setOidcRequireOnly}
            showOidcSecret={showOidcSecret}
            setShowOidcSecret={setShowOidcSecret}
            onSave={(e) => {
              e.preventDefault();
              handleSaveSettings();
            }}
            saving={saving}
          />
        );
      case 'storage':
        return (
          <StorageTab
            storageDriver={storageDriver}
            setStorageDriver={setStorageDriver}
            cloudName={cloudName}
            setCloudName={setCloudName}
            cloudApiKey={cloudApiKey}
            setCloudApiKey={setCloudApiKey}
            cloudApiSecret={cloudApiSecret}
            setCloudApiSecret={setCloudApiSecret}
            showCloudSecret={showCloudSecret}
            setShowCloudSecret={setShowCloudSecret}
            s3Bucket={s3Bucket}
            setS3Bucket={setS3Bucket}
            s3Region={s3Region}
            setS3Region={setS3Region}
            s3AccessKey={s3AccessKey}
            setS3AccessKey={setS3AccessKey}
            s3SecretKey={s3SecretKey}
            setS3SecretKey={setS3SecretKey}
            s3Endpoint={s3Endpoint}
            setS3Endpoint={setS3Endpoint}
            showS3Secret={showS3Secret}
            setShowS3Secret={setShowS3Secret}
            onTestStorage={handleTestStorage}
            testingStorage={testingStorage}
            storageTestResult={storageTestResult}
            onSave={handleSaveSettings}
            saving={saving}
          />
        );
      case 'attachments':
        return (
          <AttachmentsTab
            fileTypeCategories={fileTypeCategories}
            setFileTypeCategories={setFileTypeCategories}
            maxFileSizeMB={maxFileSizeMB}
            setMaxFileSizeMB={setMaxFileSizeMB}
            onSave={handleSaveSettings}
            saving={saving}
          />
        );
      case 'account':
        return (
          <AccountTab
            adminUsername={adminUsername}
            setAdminUsername={setAdminUsername}
            currentAdminPassword={currentAdminPassword}
            setCurrentAdminPassword={setCurrentAdminPassword}
            newAdminPassword={newAdminPassword}
            setNewAdminPassword={setNewAdminPassword}
            confirmAdminPassword={confirmAdminPassword}
            setConfirmAdminPassword={setConfirmAdminPassword}
            showCurrentPassword={showCurrentPassword}
            setShowCurrentPassword={setShowCurrentPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            onSubmit={handleChangeAdminCredentials}
            saving={saving}
          />
        );
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm text-sm overflow-y-auto">
      <button
        type="button"
        aria-label="Close admin settings"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 cursor-default border-0 p-0 m-0 w-full h-full"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Server & Administrator Settings"
        className="relative z-10 w-full max-w-4xl max-h-[85vh] sm:max-h-[90vh] my-auto rounded-lg solid-glass-panel flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
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
              </h2>
              <p className="text-xs text-[var(--sg-text-muted)] font-normal">
                Configure runtime behavior, security permissions, OIDC SSO, storage drivers, and attachment policies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition cursor-pointer"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message Notification Bar */}
        {statusMessage && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center gap-2 border-b shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
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
          <AdminSidebar activeTab={activeTab} onSelectTab={setActiveTab} />

          {/* Tab Content Panel */}
          <div className="flex-1 p-5 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
