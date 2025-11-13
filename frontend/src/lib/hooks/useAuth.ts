import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  syncFromStorage: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => {
      // Listen for storage changes (e.g., from API interceptor)
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (event) => {
          if (event.key === 'access_token' && !event.newValue) {
            // Token was removed, clear auth state
            set({ user: null, token: null });
          }
        });
      }

      return {
        user: null,
        token: null,
        setAuth: (user, token) => {
          localStorage.setItem('access_token', token);
          set({ user, token });
        },
        logout: () => {
          localStorage.removeItem('access_token');
          set({ user: null, token: null });
        },
        syncFromStorage: () => {
          const token = localStorage.getItem('access_token');
          if (!token) {
            set({ user: null, token: null });
          }
        },
      };
    },
    {
      name: 'auth-storage',
    }
  )
);
