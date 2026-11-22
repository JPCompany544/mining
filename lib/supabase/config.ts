/**
 * Validates and provides Supabase environment configuration.
 * Supports both standard non-prefixed names (Vercel-compatible secrets)
 * and NEXT_PUBLIC_ prefixed names.
 */
export function getSupabaseEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    '';

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://mining-gray-one.vercel.app');

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !url.includes('your-project-id') &&
    !anonKey.includes('your-anon-key')
  );

  return {
    url,
    anonKey,
    serviceRoleKey,
    siteUrl,
    isConfigured,
  };
}
