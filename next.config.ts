import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Automatically forwards server environment variables to the client bundle
    // so variables can be stored as 100% Secret in Vercel without NEXT_PUBLIC_ conflict!
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "",
    NEXT_PUBLIC_SITE_URL:
      process.env.SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "",
  },
};

export default nextConfig;
