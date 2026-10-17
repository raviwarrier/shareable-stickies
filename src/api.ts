import { Paste, User, CreatePastePayload } from './types';

const TOKEN_KEY = 'ss_session_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      'x-session-token': token,
    };
  }
  return {};
}

export async function loginUser(username: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  setStoredToken(data.token);
  return data;
}

export async function registerUser(username: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  setStoredToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      setStoredToken(null);
      return null;
    }
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } finally {
    setStoredToken(null);
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to change password');
  }
  return data;
}

export async function validateCustomSlug(
  slug: string,
  excludePasteId?: string
): Promise<{ valid: boolean; message: string }> {
  const clean = slug.trim();
  if (!clean) return { valid: false, message: 'Slug cannot be empty' };
  try {
    const url = excludePasteId
      ? `/api/validate-slug/${encodeURIComponent(clean)}?excludePasteId=${encodeURIComponent(excludePasteId)}`
      : `/api/validate-slug/${encodeURIComponent(clean)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch {
    return { valid: false, message: 'Could not validate slug' };
  }
}

export async function createPaste(payload: CreatePastePayload): Promise<{ paste: Paste; shareUrl: string }> {
  const formData = new FormData();
  formData.append('title', payload.title || 'Untitled Sticky');
  formData.append('content', payload.content);
  formData.append('syntax', payload.syntax || 'plaintext');
  if (payload.customSlug) {
    formData.append('customSlug', payload.customSlug.trim());
  }
  formData.append('expiration', payload.expiration || 'never');
  if (payload.password) {
    formData.append('password', payload.password);
  }
  formData.append('clientEncrypted', String(!!payload.clientEncrypted));
  formData.append('visibility', payload.visibility || 'public');
  formData.append('burnAfterReading', String(!!payload.burnAfterReading));

  if (payload.attachments && payload.attachments.length > 0) {
    payload.attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }

  const res = await fetch('/api/pastes', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create paste');
  }

  return { paste: data.paste, shareUrl: data.paste.shareUrl };
}

export async function getPaste(
  slug: string,
  options?: { password?: string; incrementView?: boolean }
): Promise<{ paste: Paste; requiresPassword?: boolean }> {
  const params = new URLSearchParams();
  if (options?.password) params.append('password', options.password);
  if (options?.incrementView === false) params.append('incrementView', 'false');
  const queryString = params.toString() ? `?${params.toString()}` : '';
  const url = `/api/pastes/${encodeURIComponent(slug)}${queryString}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (res.status === 403 && data.requiresPassword) {
    return { paste: data.paste, requiresPassword: true };
  }
  if (!res.ok) {
    throw new Error(data.error || 'Paste not found or has expired');
  }
  return { paste: data.paste };
}

export async function recordCopy(slug: string): Promise<void> {
  try {
    await fetch(`/api/pastes/${encodeURIComponent(slug)}/copy`, { method: 'POST' });
  } catch {
    // Ignore error on metrics
  }
}

export async function getUserPastes(): Promise<Paste[]> {
  const res = await fetch('/api/user/pastes', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to load user pastes');
  }
  const data = await res.json();
  return data.pastes;
}

export async function togglePinPaste(id: string): Promise<boolean> {
  const res = await fetch(`/api/pastes/${encodeURIComponent(id)}/pin`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  return data.pinned;
}

export async function deletePaste(id: string): Promise<void> {
  const res = await fetch(`/api/pastes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to delete paste');
  }
}

export async function updatePasteApi(
  id: string,
  payload: { title?: string; content?: string; syntax?: string; visibility?: string; customSlug?: string }
): Promise<Paste> {
  const res = await fetch(`/api/pastes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update paste');
  return data.paste;
}

export async function getAdminStats(): Promise<{ totalPastes: number; totalUsers: number; demoEnabled: boolean }> {
  const res = await fetch('/api/admin/stats', {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get admin stats');
  return data;
}

export async function toggleAdminDemo(enable: boolean): Promise<boolean> {
  const res = await fetch('/api/admin/toggle-demo', {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enable }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to toggle demo user');
  return data.demoEnabled;
}

export async function getPublicStickiesByUsername(username: string): Promise<{ author: { username: string }; pastes: Paste[] }> {
  const res = await fetch(`/api/public-stickies/${encodeURIComponent(username)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load public stickies');
  return data;
}

export async function getAdminOidcConfig() {
  const res = await fetch('/api/admin/oidc', { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch OIDC config');
  return data;
}

export async function saveAdminOidcConfig(config: any) {
  const res = await fetch('/api/admin/oidc', {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save OIDC config');
  return data.oidc;
}

export async function getAppConfig(): Promise<{
  defaultTheme: 'dark' | 'light' | 'sepia';
  allowPublicPastes: boolean;
  storageDriver: string;
  allowAnonymousCreation: boolean;
  oidcEnabled: boolean;
  oidcProviderName: string;
  requireOidcOnly: boolean;
  allowedDomains: string;
}> {
  const res = await fetch('/api/config');
  return res.json();
}

export async function getAdminSettings(): Promise<any> {
  const res = await fetch('/api/admin/settings', { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch settings');
  return data;
}

export async function updateAdminSettings(settings: any): Promise<any> {
  const res = await fetch('/api/admin/settings', {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update settings');
  return data.settings;
}

export async function changeAdminCredentials(params: {
  currentPassword?: string;
  newUsername?: string;
  newPassword?: string;
}): Promise<{ success: boolean; message: string; user: User; token: string }> {
  const res = await fetch('/api/admin/change-admin-credentials', {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update administrator credentials');
  if (data.token) {
    setStoredToken(data.token);
  }
  return data;
}

export async function testAdminStorage(params: {
  driver: string;
  cloudinaryConfig?: any;
  s3Config?: any;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/admin/test-storage', {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || 'Storage test failed');
  return data;
}

export async function loginOidc(email?: string): Promise<{ token: string; user: User }> {
  const res = await fetch('/api/auth/oidc/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'OIDC authentication failed');
  setStoredToken(data.token);
  return data;
}


