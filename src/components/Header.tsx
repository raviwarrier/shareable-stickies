import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from '../types';
import { loginUser, registerUser, logoutUser, changePassword } from '../api';
import { AdminSettingsModal } from './AdminSettingsModal';
import {
  User as UserIcon,
  LogOut,
  FileText,
  PlusCircle,
  Moon,
  Sun,
  BookOpen,
  AlertTriangle,
  X,
  Check,
  Shield,
  ShieldAlert,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onUserChange: (user: User | null) => void;
  currentPath: string;
  navigate: (path: string) => void;
  onNewSticky?: () => void;
}

export type Theme = 'dark' | 'light' | 'sepia';

export const Header: React.FC<HeaderProps> = ({
  user,
  onUserChange,
  currentPath,
  navigate,
  onNewSticky,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getThemeIcon = (t: 'dark' | 'light' | 'sepia') => {
    switch (t) {
      case 'dark': return <Moon className="w-4 h-4 text-slate-300" />;
      case 'light': return <Sun className="w-4 h-4 text-slate-700" />;
      case 'sepia': return <BookOpen className="w-4 h-4 text-[#8a6842]" />;
      default: return <Moon className="w-4 h-4 text-slate-300" />;
    }
  };

  // Requirement 12: Registration Confirmation Modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerModalError, setRegisterModalError] = useState<string | null>(null);

  // Settings Modal (Password Change) state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmNewPassInput, setConfirmNewPassInput] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // User dropdown menu state
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  // Requirement 16: Theme state (Default is dark)
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('app-theme') as Theme) || 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('sepia');
    else setTheme('dark');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setAuthError('Enter both username and password');
      return;
    }
    setLoading(true);
    setAuthError(null);
    try {
      const res = await loginUser(username.trim(), password.trim());
      onUserChange(res.user);
      setUsername('');
      setPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  // Trigger registration confirmation modal
  const handleOpenRegisterModal = () => {
    if (!username.trim() || !password.trim()) {
      setAuthError('Enter both username and password');
      return;
    }
    setAuthError(null);
    setConfirmPassword('');
    setRegisterModalError(null);
    setShowRegisterModal(true);
  };

  // Submit confirmed registration
  const handleConfirmRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setRegisterModalError('Passwords do not match');
      return;
    }

    setLoading(true);
    setRegisterModalError(null);
    try {
      const res = await registerUser(username.trim(), password.trim());
      onUserChange(res.user);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setShowRegisterModal(false);
    } catch (err: any) {
      setRegisterModalError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      onUserChange(null);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);
    setSettingsSuccess(null);

    if (!currentPassInput) {
      setSettingsError('Please enter your current password');
      return;
    }
    if (newPassInput.length < 6) {
      setSettingsError('New password must be at least 6 characters long');
      return;
    }
    if (newPassInput !== confirmNewPassInput) {
      setSettingsError('New passwords do not match');
      return;
    }

    setSettingsLoading(true);
    try {
      const res = await changePassword(currentPassInput, newPassInput);
      setSettingsSuccess(res.message || 'Password changed successfully');
      setCurrentPassInput('');
      setNewPassInput('');
      setConfirmNewPassInput('');
      setTimeout(() => {
        setSettingsSuccess(null);
        setShowSettingsModal(false);
      }, 1500);
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to change password');
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <header className="solid-glass-bar sticky top-0 z-[100] transition-colors duration-200">
      {/* Primary Navigation Bar */}
      <div className="relative z-30 border-b border-[var(--sg-panel-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Left Side: Brand Logo and App Description */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (onNewSticky) onNewSticky();
                navigate('/');
              }}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-md solid-glass-btn flex items-center justify-center font-mono text-base font-semibold text-[var(--sg-text)] transition shadow-xs group-hover:border-[var(--sg-btn-active-border)]">
                S
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-base font-semibold tracking-tight text-[var(--sg-text)]">
                  Shareable Stickies
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md solid-glass-badge font-normal">
                  v0.3.0
                </span>
                <span className="hidden sm:inline-block text-[var(--sg-text-muted)] font-mono text-xs opacity-60">•</span>
                <span className="hidden sm:inline-block text-xs font-mono text-[var(--sg-text-muted)] font-normal">
                  Self-hostable modern pastebin. For you to use or share with others.
                </span>
              </div>
            </button>
          </div>

          {/* Right Side: Dark Mode button and @username dropdown menu */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Theme Mode button (Icon Only) */}
            <button
              type="button"
              onClick={cycleTheme}
              className="p-2 rounded-md solid-glass-btn text-[var(--sg-btn-text)] transition cursor-pointer text-xs md:text-sm font-mono shadow-xs flex items-center justify-center"
              title={`Current theme: ${theme}. Click to switch theme.`}
              aria-label={`Current theme: ${theme}. Click to switch theme.`}
            >
              {getThemeIcon(theme)}
            </button>

            {/* @username dropdown menu */}
            {user ? (
              <div className="relative z-50" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md solid-glass-btn text-[var(--sg-btn-text)] font-mono transition cursor-pointer text-xs md:text-sm"
                  title="Account options"
                  aria-expanded={userDropdownOpen}
                >
                  <UserIcon className="w-4 h-4 text-[var(--sg-text-muted)]" />
                  <span className="font-medium text-[var(--sg-text)]">@{user.username}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded solid-glass-badge uppercase font-mono hidden sm:inline-block">
                    {user.role}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[var(--sg-text-muted)] transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md solid-glass-dropdown py-1.5 z-[9999] font-mono text-sm shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2 border-b border-[var(--sg-panel-border)] text-xs">
                      <p className="text-[var(--sg-text-muted)] text-[11px]">Signed in as</p>
                      <p className="font-medium text-[var(--sg-text)] truncate text-xs">@{user.username}</p>
                    </div>

                    <div className="py-1">
                      {/* Option 1: Change password */}
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setSettingsError(null);
                          setSettingsSuccess(null);
                          setCurrentPassInput('');
                          setNewPassInput('');
                          setConfirmNewPassInput('');
                          setShowSettingsModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[var(--sg-text)] hover:bg-white/[0.08] dark:hover:bg-white/[0.08] light:hover:bg-black/[0.05] transition cursor-pointer text-xs"
                      >
                        <KeyRound className="w-4 h-4 text-[var(--sg-text-muted)]" />
                        <span>Change password</span>
                      </button>

                      {/* Admin Settings in dropdown for admin users */}
                      {user.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setShowAdminModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[var(--sg-text)] hover:bg-white/[0.08] dark:hover:bg-white/[0.08] light:hover:bg-black/[0.05] transition cursor-pointer text-xs"
                        >
                          <Shield className="w-4 h-4 text-[var(--sg-text-muted)]" />
                          <span>Admin Settings</span>
                        </button>
                      )}

                      <div className="my-1 border-t border-[var(--sg-panel-border)]" />

                      {/* Option 2: Logout */}
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          void handleLogout();
                        }}
                        disabled={loading}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-rose-500 hover:bg-rose-500/10 transition cursor-pointer text-xs disabled:opacity-50"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Row below the header: Left side has New Sticky and My Stickies, Right side has Auth if not signed in */}
      <div className="solid-glass-subbar relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Left Side: New Sticky and My Stickies */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onNewSticky) onNewSticky();
                navigate('/');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs md:text-sm transition cursor-pointer font-semibold btn-contrasting shadow-xs"
              title="Create a new sticky note"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Sticky</span>
            </button>

            {user && (
              <button
                onClick={() => navigate('/dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer text-xs md:text-sm font-medium ${
                  currentPath === '/dashboard'
                    ? 'solid-glass-btn-active'
                    : 'solid-glass-btn'
                }`}
                title="View my stickies"
              >
                <FileText className="w-4 h-4 text-[var(--sg-text-muted)]" />
                <span>My Stickies</span>
              </button>
            )}
          </div>

          {/* Right Side: Inline Auth (Sign In / Register) */}
          {!user && (
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <form onSubmit={handleLogin} className="flex flex-wrap items-center gap-2 text-sm w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="solid-glass-input rounded-md px-3 py-1.5 text-xs text-[var(--sg-input-text)] placeholder-[var(--sg-text-muted)] outline-none font-mono w-28 sm:w-32"
                />
                <div className="relative flex items-center">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="solid-glass-input rounded-md pl-3 pr-8 py-1.5 text-xs text-[var(--sg-input-text)] placeholder-[var(--sg-text-muted)] outline-none font-mono w-28 sm:w-32"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] transition p-0.5 cursor-pointer"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="solid-glass-btn-primary px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {loading ? '...' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={handleOpenRegisterModal}
                  disabled={loading}
                  className="solid-glass-btn px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  Register
                </button>
                {authError && (
                  <span className="text-xs text-rose-500 font-mono w-full sm:w-auto font-medium">
                    {authError}
                  </span>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Requirement 12: Registration Confirmation Modal with Password Match & Warning */}
      {showRegisterModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowRegisterModal(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm text-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg solid-glass-panel p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sg-panel-border)]">
              <div className="flex items-center gap-2 text-[var(--sg-text)] font-semibold text-base">
                <ShieldAlert className="w-5 h-5 text-[var(--sg-text-muted)]" />
                <span>Confirm Account Registration</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1 rounded-md solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtle warning */}
            <div className="p-3 rounded-md solid-glass-badge text-xs leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--sg-text-muted)]" />
              <span className="font-normal text-[var(--sg-text)]">
                Note: There is no way to recover your account if you forget your password. Please store your password safely.
              </span>
            </div>

            <form onSubmit={handleConfirmRegister} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--sg-text-muted)]">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--sg-text-muted)]">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--sg-text-muted)]">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to confirm..."
                  className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono placeholder-[var(--sg-text-muted)]"
                  autoFocus
                  required
                />
              </div>

              {registerModalError && (
                <div className="text-xs text-rose-500 font-normal">{registerModalError}</div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--sg-panel-border)]">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3.5 py-1.5 rounded-md solid-glass-btn text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-md solid-glass-btn-primary text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Account Settings Modal (Password Change) */}
      {showSettingsModal && user && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowSettingsModal(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm text-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg solid-glass-panel p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--sg-panel-border)]">
              <div className="flex items-center gap-2 text-[var(--sg-text)] font-semibold text-base">
                <KeyRound className="w-5 h-5 text-[var(--sg-text-muted)]" />
                <span>Account Settings — @{user.username}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-md solid-glass-btn text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer"
                title="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[var(--sg-text-muted)] font-normal">
              Change your account password below. You will use the new password on future logins.
            </div>

            {settingsError && (
              <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}

            {settingsSuccess && (
              <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--sg-text-muted)]">Current password</label>
                <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full bg-transparent px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono placeholder-[var(--sg-text-muted)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="px-2.5 py-2 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer flex items-center justify-center shrink-0"
                    title={showCurrentPass ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--sg-text-muted)]">New password (minimum 6 characters)</label>
                <div className="flex items-center rounded-md solid-glass-input overflow-hidden">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Enter new password..."
                    className="w-full bg-transparent px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono placeholder-[var(--sg-text-muted)]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="px-2.5 py-2 text-[var(--sg-text-muted)] hover:text-[var(--sg-text)] cursor-pointer flex items-center justify-center shrink-0"
                    title={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--sg-text-muted)]">Confirm new password</label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={confirmNewPassInput}
                  onChange={(e) => setConfirmNewPassInput(e.target.value)}
                  placeholder="Re-enter new password..."
                  className="solid-glass-input rounded-md px-3 py-2 text-[var(--sg-input-text)] outline-none text-xs font-mono placeholder-[var(--sg-text-muted)]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--sg-panel-border)]">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-3.5 py-1.5 rounded-md solid-glass-btn text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-4 py-1.5 rounded-md solid-glass-btn-primary text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {settingsLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update password</span>
                  )}
                </button>
              </div>

              {user.role === 'admin' && (
                <div className="pt-2 border-t border-[var(--sg-panel-border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--sg-text-muted)]">Server Administrator:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowAdminModal(true);
                    }}
                    className="text-[var(--sg-text)] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Open Server & Admin Settings</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Server & Administrator Settings Modal */}
      {user && user.role === 'admin' && (
        <AdminSettingsModal
          isOpen={showAdminModal}
          onClose={() => setShowAdminModal(false)}
          currentUser={user}
          onUserUpdate={onUserChange}
          currentTheme={theme}
          onThemeChange={(newTheme) => setTheme(newTheme)}
        />
      )}
    </header>
  );
};
