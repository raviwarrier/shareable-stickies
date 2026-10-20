import React from 'react';
import { Sun, Lock, Globe, HardDrive, Paperclip, Sparkles, KeyRound } from 'lucide-react';

export type TabType = 'theme' | 'permissions' | 'oidc' | 'storage' | 'attachments' | 'demo' | 'account';

interface AdminSidebarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, onSelectTab }) => {
  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: 'theme', label: '1. Mode & Theme', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'permissions', label: '2. Public Creation', icon: <Lock className="w-3.5 h-3.5" /> },
    { id: 'oidc', label: '3. OIDC Settings', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'storage', label: '4. Storage Driver', icon: <HardDrive className="w-3.5 h-3.5" /> },
    { id: 'attachments', label: '5. Attachments', icon: <Paperclip className="w-3.5 h-3.5" /> },
    { id: 'demo', label: '6. Demo Options', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'account', label: '7. Admin Account', icon: <KeyRound className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-[var(--sg-panel-border)] solid-glass-subbar p-2.5 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelectTab(tab.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs transition cursor-pointer shrink-0 font-medium ${
            activeTab === tab.id
              ? 'solid-glass-btn-active text-[var(--sg-text)]'
              : 'text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
