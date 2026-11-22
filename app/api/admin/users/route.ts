import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// GET /api/admin/users — List all registered users with deposit counts
export async function GET() {
  try {
    // Verify caller is admin
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Fetch all auth users
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Fetch deposit counts per user
    const { data: deposits } = await adminClient
      .from('deposits')
      .select('user_id, status');

    const depositMap: Record<string, { total: number; pending: number; confirmed: number; rejected: number }> = {};
    if (deposits) {
      for (const d of deposits) {
        const uid = d.user_id || 'unknown';
        if (!depositMap[uid]) depositMap[uid] = { total: 0, pending: 0, confirmed: 0, rejected: 0 };
        depositMap[uid].total++;
        if (d.status === 'pending') depositMap[uid].pending++;
        else if (d.status === 'confirmed') depositMap[uid].confirmed++;
        else if (d.status === 'rejected') depositMap[uid].rejected++;
      }
    }

    const users = authData.users.map((u) => ({
      id: u.id,
      email: u.email || '',
      username: u.user_metadata?.username || u.email?.split('@')[0] || '',
      created_at: u.created_at,
      email_verified: u.email_confirmed_at ? true : false,
      deposits: depositMap[u.id] || { total: 0, pending: 0, confirmed: 0, rejected: 0 },
    }));

    return NextResponse.json({ users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

