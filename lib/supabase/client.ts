import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './config';

let browserClient: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  // If already instantiated, reuse singleton in browser
  if (browserClient) return browserClient;

  // Use configured keys or safe development fallbacks to prevent crash before user pastes credentials
  const safeUrl = isConfigured ? url : (url || 'https://placeholder-project.supabase.co');
  const safeAnonKey = isConfigured ? anonKey : (anonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder');

  browserClient = createBrowserClient(safeUrl, safeAnonKey);
  return browserClient;
}
