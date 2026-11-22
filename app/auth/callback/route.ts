import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureMinerProfile } from '@/lib/supabase/minerProfile';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  const supabase = await createClient();

  // 1. Handle Code exchange flow (PKCE / email link)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureMinerProfile(supabase, data.user);
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // 2. Handle Token Hash flow (OTP email verification)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error && data.user) {
      await ensureMinerProfile(supabase, data.user);
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If verification failed or expired, redirect to login with error parameter
  const loginUrl = new URL('/login', requestUrl.origin);
  loginUrl.searchParams.set('error', 'Authentication verification link expired or invalid. Please log in or request a new one.');
  return NextResponse.redirect(loginUrl);
}

