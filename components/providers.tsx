'use client';

import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';

function resolveAuthBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_NEXTAUTH_BASE_PATH;
  const fallback = '/api/auth';
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.length) return fallback;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.pathname.replace(/\/+$/, '') || fallback;
    } catch {
      return fallback;
    }
  }
  const normalized = trimmed.replace(/^\/+/, '').replace(/\/+$/, '');
  return `/${normalized}`;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const authBasePath = useMemo(resolveAuthBasePath, []);

  return (
    <SessionProvider basePath={authBasePath}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
