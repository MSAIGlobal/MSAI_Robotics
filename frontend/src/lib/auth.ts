// MSAI Robotics - Auth & RBAC System
// Netlify Identity + SSO abstraction

import { Role, User, AuthState } from './types';

// ============================================
// ROLE PERMISSIONS
// ============================================

const ROLE_HIERARCHY: Record<Role, number> = {
  observer: 1,
  operator: 2,
  admin: 3,
  gov: 3,
};

const PERMISSIONS: Record<string, Role[]> = {
  // Experiments
  'experiments.view': ['observer', 'operator', 'admin', 'gov'],
  'experiments.launch': ['operator', 'admin'],
  'experiments.pause': ['operator', 'admin'],
  'experiments.delete': ['admin'],

  // Datasets
  'datasets.view': ['observer', 'operator', 'admin', 'gov'],
  'datasets.export': ['operator', 'admin', 'gov'],

  // Safety
  'safety.view': ['observer', 'operator', 'admin', 'gov'],
  'safety.pause': ['operator', 'admin'],
  'safety.kill': ['admin'],

  // Nodes
  'nodes.view': ['observer', 'operator', 'admin', 'gov'],
  'nodes.command': ['operator', 'admin'],
  'nodes.deploy': ['admin'],

  // Robotics
  'robotics.view': ['observer', 'operator', 'admin', 'gov'],
  'robotics.control': ['operator', 'admin'],
  'robotics.sim.start': ['operator', 'admin'],
  'robotics.sim.stop': ['operator', 'admin'],

  // Voice
  'voice.use': ['operator', 'admin'],

  // Audit
  'audit.view': ['operator', 'admin', 'gov'],
  'audit.export': ['admin', 'gov'],

  // Admin
  'admin.users': ['admin'],
  'admin.settings': ['admin'],
};

// ============================================
// AUTH FUNCTIONS
// ============================================

export function requireRole(requiredRole: Role, user: User | null): void {
  if (!user) {
    throw new Error('Authentication required');
  }
  if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new Error(`Forbidden: requires ${requiredRole} role`);
  }
}

export function hasPermission(permission: string, user: User | null): boolean {
  if (!user) return false;
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(user.role);
}

export function checkPermission(permission: string, user: User | null): void {
  if (!hasPermission(permission, user)) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }
}

export function canExecute(action: string, user: User | null): boolean {
  return hasPermission(action, user);
}

// ============================================
// AUTH STATE MANAGEMENT
// ============================================

const AUTH_KEY = 'msai_auth';

export function getStoredAuth(): AuthState {
  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        user: parsed.user,
        isAuthenticated: !!parsed.user,
        loading: false,
      };
    }
  } catch {
    // Ignore errors
  }
  return { user: null, isAuthenticated: false, loading: false };
}

export function storeAuth(user: User | null): void {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user }));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

// ============================================
// NETLIFY IDENTITY INTEGRATION
// ============================================

declare global {
  interface Window {
    netlifyIdentity?: {
      on: (event: string, callback: (user: unknown) => void) => void;
      open: (tab?: string) => void;
      close: () => void;
      currentUser: () => unknown;
      logout: () => Promise<void>;
    };
  }
}

export function initNetlifyIdentity(
  onLogin: (user: User) => void,
  onLogout: () => void
): void {
  if (typeof window !== 'undefined' && window.netlifyIdentity) {
    window.netlifyIdentity.on('init', (netlifyUser: unknown) => {
      if (netlifyUser) {
        const user = mapNetlifyUser(netlifyUser);
        onLogin(user);
      }
    });

    window.netlifyIdentity.on('login', (netlifyUser: unknown) => {
      const user = mapNetlifyUser(netlifyUser);
      onLogin(user);
      window.netlifyIdentity?.close();
    });

    window.netlifyIdentity.on('logout', () => {
      onLogout();
    });
  }
}

function mapNetlifyUser(netlifyUser: unknown): User {
  const u = netlifyUser as {
    id: string;
    email: string;
    user_metadata?: { full_name?: string; role?: Role };
  };

  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || u.email,
    role: u.user_metadata?.role || 'observer',
    sso_provider: 'netlify',
  };
}

export function openLogin(): void {
  window.netlifyIdentity?.open('login');
}

export function openSignup(): void {
  window.netlifyIdentity?.open('signup');
}

export async function logout(): Promise<void> {
  await window.netlifyIdentity?.logout();
  storeAuth(null);
}

// ============================================
// JWT FOR BACKEND
// ============================================

export function getAuthHeaders(): HeadersInit {
  const auth = getStoredAuth();
  if (!auth.user) return {};

  // In production, this would be a real JWT
  const token = btoa(JSON.stringify({
    sub: auth.user.id,
    email: auth.user.email,
    role: auth.user.role,
    exp: Date.now() + 3600000,
  }));

  return {
    Authorization: `Bearer ${token}`,
  };
}
