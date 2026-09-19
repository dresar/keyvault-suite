import { createMiddleware } from '@tanstack/react-start'

export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | undefined;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('keyvault_auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed?.token;
        }
      } catch {
        // ignore
      }
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
)
