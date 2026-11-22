import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './config';

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  const safeUrl = isConfigured ? url : (url || 'https://placeholder-project.supabase.co');
  const safeAnonKey = isConfigured ? anonKey : (anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder');

  return createServerClient(safeUrl, safeAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if middleware is refreshing sessions.
        }
      },
    },
  });
}

