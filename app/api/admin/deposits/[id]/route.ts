import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { updateFallbackDeposit } from '@/lib/deposits/memoryStore';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// PATCH /api/admin/deposits/[id] — Confirm or reject a deposit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const { status, admin_note } = body;

    if (!status || !['confirmed', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Use "confirmed" or "rejected".' }, { status: 400 });
    }

    let updatedDeposit = null;
    if (adminClient) {
      const { data, error } = await adminClient
        .from('deposits')
        .update({
          status,
          admin_note: admin_note || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        updatedDeposit = data;
      }
    }

    if (!updatedDeposit) {
      const fbUpdated = updateFallbackDeposit(id, status, admin_note);
      if (fbUpdated) {
        updatedDeposit = fbUpdated;
      }
    }

    if (!updatedDeposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    return NextResponse.json({ deposit: updatedDeposit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

