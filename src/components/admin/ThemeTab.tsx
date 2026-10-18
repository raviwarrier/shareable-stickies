import React from 'react';
import { Sun, Moon, BookOpen, Loader2, Check } from 'lucide-react';
import { AppTheme } from '../../types';

interface ThemeOptionProps {
  value: AppTheme;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  selected: boolean;
  selectedTheme: AppTheme;
  onSelect: (value: AppTheme) => void;
}

const ThemeOption: React.FC<ThemeOptionProps> = ({
  value,
  label,
  icon: Icon,
  description,
  selected,
  selectedTheme,
  onSelect,
}) => (
  <button
    type="button"
    onClick={() => onSelect(value)}
    className={`p-3.5 rounded-md border cursor-pointer transition flex flex-col gap-2.5 text-left w-full ${
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
  </button>
);

interface ThemeTabProps {
  selectedTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  onSave: () => void;
  saving: boolean;
}

export const ThemeTab: React.FC<ThemeTabProps> = ({
  selectedTheme,
  onSelectTheme,
  onSave,
  saving,
}) => {
  return (
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
          onSelect={onSelectTheme}
        />
        <ThemeOption
          value="light"
          label="Light"
          icon={Sun}
          description="Crisp, clean paper-white aesthetic with sharp dark typography and syntax highlights."
          selected={selectedTheme === 'light'}
          selectedTheme={selectedTheme}
          onSelect={onSelectTheme}
        />
        <ThemeOption
          value="sepia"
          label="Sepia"
          icon={BookOpen}
          description="Warm warm-paper parchment palette designed to minimize eye fatigue during extended reading."
          selected={selectedTheme === 'sepia'}
          selectedTheme={selectedTheme}
          onSelect={onSelectTheme}
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
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-md solid-glass-btn-primary font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save Default Theme</span>
        </button>
      </div>
    </div>
  );
};
