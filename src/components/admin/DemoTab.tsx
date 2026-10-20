import React from 'react';
import { Sparkles, Loader2, ToggleLeft, ToggleRight, Check, AlertCircle, Info } from 'lucide-react';

interface DemoTabProps {
  demoEnabled: boolean;
  onToggleDemo: () => void;
  loading: boolean;
}

export const DemoTab: React.FC<DemoTabProps> = ({
  demoEnabled,
  onToggleDemo,
  loading,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--sg-text)] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--sg-text-muted)]" />
          <span>Demo Options & Sample Content</span>
        </h3>
        <p className="text-xs text-[var(--sg-text-muted)] mt-0.5">
          Control sample stickies and the pre-configured demo user account on this instance.
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="p-4 rounded-md solid-glass-panel border border-[var(--sg-panel-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--sg-text)]">Sample Stickies & Demo Mode</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                demoEnabled
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : 'solid-glass-badge'
              }`}
            >
              {demoEnabled ? 'Active (Demo Content Seeded)' : 'Disabled (Clean Production)'}
            </span>
          </div>
          <p className="text-xs text-[var(--sg-text-muted)] leading-relaxed max-w-xl">
            {demoEnabled
              ? 'Demo mode is active. Five pre-seeded stickies showcasing syntax highlighting, configuration runbooks, and file attachments are visible, along with the sample demo_user account.'
              : 'Demo mode is disabled. The demo_user account and all sample stickies have been removed. Only real stickies created by your users exist on this instance.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleDemo}
          disabled={loading}
          className={`px-3.5 py-2 rounded-md transition cursor-pointer flex items-center gap-2 text-xs font-semibold shrink-0 disabled:opacity-50 ${
            demoEnabled
              ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/25'
              : 'solid-glass-btn-primary'
          }`}
          title={demoEnabled ? 'Click to disable demo mode and clean up sample content' : 'Click to enable demo mode and seed sample stickies'}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : demoEnabled ? (
            <ToggleRight className="w-4 h-4" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          <span>{demoEnabled ? 'Disable Demo Content' : 'Enable Demo Content'}</span>
        </button>
      </div>

      {/* Guidance & Explanatory Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)] flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--sg-text)]">
            <Info className="w-4 h-4 text-[var(--sg-text-muted)] shrink-0" />
            <span>What happens when disabled?</span>
          </div>
          <p className="text-xs text-[var(--sg-text-muted)] leading-relaxed">
            Disabling demo mode immediately deletes the <code className="text-[var(--sg-text)] font-mono">demo_user</code> account and its 5 associated sample stickies. Real user accounts and stickies are never affected.
          </p>
        </div>

        <div className="p-3.5 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)] flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--sg-text)]">
            <AlertCircle className="w-4 h-4 text-[var(--sg-text-muted)] shrink-0" />
            <span>Production Environments</span>
          </div>
          <p className="text-xs text-[var(--sg-text-muted)] leading-relaxed">
            In production deployments (<code className="text-[var(--sg-text)] font-mono">NODE_ENV=production</code>), demo mode is disabled by default. You can also enforce this with <code className="text-[var(--sg-text)] font-mono">ENABLE_DEMO_USER=false</code> in your environment file.
          </p>
        </div>
      </div>

      {/* Feature capabilities list */}
      <div className="p-3.5 rounded-md solid-glass-subbar border border-[var(--sg-panel-border)] text-xs text-[var(--sg-text-muted)] flex flex-col gap-2">
        <div className="text-xs font-semibold text-[var(--sg-text)]">
          Sample stickies included in demo mode:
        </div>
        <ul className="list-disc list-inside space-y-1 text-[11px] font-mono">
          <li><span className="text-[var(--sg-text)]">demo-auth-middleware</span> — TypeScript JWT token authentication middleware</li>
          <li><span className="text-[var(--sg-text)]">demo-db-schema</span> — SQL schema with multi-tenant partitioning & indexes</li>
          <li><span className="text-[var(--sg-text)]">demo-fastapi-service</span> — Python async web service with Pydantic models</li>
          <li><span className="text-[var(--sg-text)]">demo-deploy-runbook</span> — Markdown ops documentation with checklist</li>
          <li><span className="text-[var(--sg-text)]">demo-config-yaml</span> — Kubernetes deployment & service manifest</li>
        </ul>
      </div>
    </div>
  );
};
