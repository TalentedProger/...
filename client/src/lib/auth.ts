import { apiRequest } from './queryClient';

export interface AuthState {
  user: {
    id: number;
    anonName: string;
    status: string;
    createdAt: string;
  } | null;
  token: string | null;
  refreshToken: string | null;
  status: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

const AUTH_STATE_KEY = 'chat_auth_state';
const TOKEN_REFRESH_BUFFER = 2 * 60 * 1000; // 2 minutes before expiry
const TOKEN_LIFETIME = 15 * 60 * 1000; // 15 minutes in milliseconds

class AuthManager {
  private authState: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    status: 'loading'
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;
  private listeners: ((state: AuthState) => void)[] = [];

  constructor() {
    this.loadFromStorage();
    this.scheduleTokenRefresh();
  }

  // Load auth state from localStorage
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(AUTH_STATE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored);
        // Only restore if tokens exist and are potentially still valid
        if (parsedState.token && parsedState.refreshToken) {
          this.authState = { ...this.authState, ...parsedState };
        }
      }
    } catch (error) {
      console.error('Failed to load auth state from storage:', error);
      this.clearStorage();
    }
  }

  // Save auth state to localStorage
  private saveToStorage() {
    try {
      localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(this.authState));
    } catch (error) {
      console.error('Failed to save auth state to storage:', error);
    }
  }

  // Clear stored auth data
  private clearStorage() {
    try {
      localStorage.removeItem(AUTH_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear auth storage:', error);
    }
  }

  // Update auth state and notify listeners
  private updateAuthState(newState: Partial<AuthState>) {
    const prevState = { ...this.authState };
    this.authState = { ...this.authState, ...newState };
    
    // Save to storage if we have tokens
    if (this.authState.token && this.authState.refreshToken) {
      this.saveToStorage();
    } else {
      this.clearStorage();
    }

    // Notify listeners only if state actually changed
    if (JSON.stringify(prevState) !== JSON.stringify(this.authState)) {
      this.listeners.forEach(listener => listener(this.authState));
    }

    // Schedule next refresh if we got new tokens
    if (newState.token && newState.refreshToken) {
      this.scheduleTokenRefresh();
    }
  }

  // Schedule the next token refresh
  private scheduleTokenRefresh() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Only schedule if we have tokens
    if (!this.authState.token || !this.authState.refreshToken) {
      return;
    }

    // Schedule refresh 2 minutes before token expires (13 minutes from now)
    const refreshDelay = TOKEN_LIFETIME - TOKEN_REFRESH_BUFFER;
    
    this.refreshTimer = setTimeout(() => {
      this.refreshToken().catch(error => {
        console.error('Automatic token refresh failed:', error);
        // If refresh fails, mark user as needing to re-authenticate
        this.updateAuthState({
          token: null,
          refreshToken: null,
          status: 'expired'
        });
      });
    }, refreshDelay);

    console.log(`Token refresh scheduled in ${refreshDelay / 1000 / 60} minutes`);
  }

  // Set initial auth data (from login/dev auth)
  setAuthData(authData: {
    user: AuthState['user'];
    status: string;
    token: string;
    refreshToken: string;
  }) {
    this.updateAuthState({
      user: authData.user,
      token: authData.token,
      refreshToken: authData.refreshToken,
      status: authData.status
    });
  }

  // Get current auth state
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  // Get current valid token (with automatic refresh if needed)
  async getValidToken(): Promise<string | null> {
    // If no token, return null
    if (!this.authState.token) {
      return null;
    }

    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      try {
        const tokens = await this.refreshPromise;
        return tokens.token;
      } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
      }
    }

    // Return current token (assume it's valid since we refresh proactively)
    return this.authState.token;
  }

  // Refresh the access token using refresh token
  async refreshToken(): Promise<AuthTokens> {
    // If already refreshing, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.authState.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = (async () => {
      try {
        const response = await apiRequest('POST', '/api/auth/refresh', {
          refreshToken: this.authState.refreshToken
        });
        
        const data = await response.json();

        // Update auth state with new tokens
        this.updateAuthState({
          user: data.user,
          status: data.status,
          token: data.token,
          refreshToken: data.refreshToken
        });

        return {
          token: data.token,
          refreshToken: data.refreshToken
        };
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Clear tokens on refresh failure
        this.updateAuthState({
          token: null,
          refreshToken: null,
          status: 'expired'
        });
        throw error;
      } finally {
        // Clear the refresh promise
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Handle auth error (e.g., from WebSocket)
  async handleAuthError(): Promise<boolean> {
    console.log('Handling auth error, attempting token refresh...');
    
    try {
      await this.refreshToken();
      return true; // Successfully refreshed
    } catch (error) {
      console.error('Failed to refresh token after auth error:', error);
      // Mark as expired so user can re-authenticate
      this.updateAuthState({
        token: null,
        refreshToken: null,
        status: 'expired'
      });
      return false; // Failed to refresh
    }
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void) {
    this.listeners.push(listener);
    // Immediately notify with current state
    listener(this.authState);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Clear all auth data (logout)
  clearAuth() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.refreshPromise = null;
    
    this.updateAuthState({
      user: null,
      token: null,
      refreshToken: null,
      status: 'loading'
    });
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!(this.authState.token && this.authState.user && this.authState.status === 'approved');
  }

  // Cleanup (call when component unmounts or app closes)
  cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.refreshPromise = null;
    this.listeners = [];
  }
}

// Create singleton instance
export const authManager = new AuthManager();

// React hook for using auth state
import { useState, useEffect } from 'react';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(authManager.getAuthState());

  useEffect(() => {
    const unsubscribe = authManager.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  return {
    ...authState,
    refreshToken: () => authManager.refreshToken(),
    getValidToken: () => authManager.getValidToken(),
    handleAuthError: () => authManager.handleAuthError(),
    setAuthData: (data: Parameters<typeof authManager.setAuthData>[0]) => authManager.setAuthData(data),
    clearAuth: () => authManager.clearAuth(),
    isAuthenticated: () => authManager.isAuthenticated(),
  };
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    authManager.cleanup();
  });
}