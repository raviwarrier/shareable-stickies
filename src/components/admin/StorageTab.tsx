import React from 'react';
import { HardDrive, Cloud, Database, Eye, EyeOff, Check, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { StorageDriverType } from '../../types';

interface StorageTabProps {
  storageDriver: StorageDriverType;
  setStorageDriver: (driver: StorageDriverType) => void;
  cloudName: string;
  setCloudName: (v: string) => void;
  cloudApiKey: string;
  setCloudApiKey: (v: string) => void;
  cloudApiSecret: string;
  setCloudApiSecret: (v: string) => void;
  showCloudSecret: boolean;
  setShowCloudSecret: (v: boolean) => void;
  s3Bucket: string;
  setS3Bucket: (v: string) => void;
  s3Region: string;
  setS3Region: (v: string) => void;
  s3AccessKey: string;
  setS3AccessKey: (v: string) => void;
  s3SecretKey: string;
  setS3SecretKey: (v: string) => void;
  s3Endpoint: string;
  setS3Endpoint: (v: string) => void;
  showS3Secret: boolean;
  setShowS3Secret: (v: boolean) => void;
  onTestStorage: () => void;
  testingStorage: boolean;
  storageTestResult: { success: boolean; message: string } | null;
  onSave: () => void;
  saving: boolean;
}

export const StorageTab: React.FC<StorageTabProps> = ({
  storageDriver,
  setStorageDriver,
  cloudName,
  setCloudName,
  cloudApiKey,
  setCloudApiKey,
  cloudApiSecret,
  setCloudApiSecret,
  showCloudSecret,
  setShowCloudSecret,
  s3Bucket,
  setS3Bucket,
  s3Region,
  setS3Region,
  s3AccessKey,
  setS3AccessKey,
  s3SecretKey,
  setS3SecretKey,
  s3Endpoint,
  setS3Endpoint,
  showS3Secret,
  setShowS3Secret,
  onTestStorage,
  testingStorage,
  storageTestResult,
  onSave,
  saving,
}) => {
  return (
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
        <button
          type="button"
          onClick={() => setStorageDriver('local')}
          className={`p-3.5 rounded-md border cursor-pointer transition flex flex-col gap-2 text-left w-full ${
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
        </button>

        <button
          type="button"
          onClick={() => setStorageDriver('cloudinary')}
          className={`p-3.5 rounded-md border cursor-pointer transition flex flex-col gap-2 text-left w-full ${
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
        </button>

        <button
          type="button"
          onClick={() => setStorageDriver('s3')}
          className={`p-3.5 rounded-md border cursor-pointer transition flex flex-col gap-2 text-left w-full ${
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
        </button>
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
            <label htmlFor="s3-endpoint" className="text-[11px] text-[var(--sg-text-muted)] font-medium">
              Custom Endpoint (Optional — for MinIO, Cloudflare R2, Backblaze, Wasabi)
            </label>
            <input
              id="s3-endpoint"
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
          onClick={onTestStorage}
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
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save Storage Settings</span>
        </button>
      </div>
    </div>
  );
};
