import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getAllFallbackDeposits } from '@/lib/deposits/memoryStore';
import { DepositRecord } from '@/lib/types/deposit';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// GET /api/admin/deposits — List all deposits (with optional status filter)
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');

    let dbDeposits: DepositRecord[] = [];
    const adminClient = getAdminClient();
    if (adminClient) {
      let query = adminClient
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && ['pending', 'confirmed', 'rejected'].includes(statusFilter)) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        dbDeposits = data;
      }
    }

    // Merge with in-memory fallback deposits
    const fallbackDeposits = getAllFallbackDeposits().filter((d) => {
      if (!statusFilter || statusFilter === 'all') return true;
      return d.status === statusFilter;
    });

    // Deduplicate by id
    const seenIds = new Set(dbDeposits.map((d) => d.id));
    const merged = [...dbDeposits];
    for (const fb of fallbackDeposits) {
      if (!seenIds.has(fb.id)) {
        merged.push(fb);
      }
    }

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ deposits: merged });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

