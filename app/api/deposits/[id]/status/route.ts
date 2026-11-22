import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getFallbackDeposit } from '@/lib/deposits/memoryStore';

// GET /api/deposits/[id]/status — Poll deposit status (no auth required, just the deposit ID)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing deposit ID' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (adminClient) {
      const { data, error } = await adminClient
        .from('deposits')
        .select('id, status, admin_note, updated_at')
        .eq('id', id)
        .single();

      if (!error && data) {
        return NextResponse.json({
          id: data.id,
          status: data.status,
          admin_note: data.admin_note,
          updated_at: data.updated_at,
        });
      }
    }

    // Check memory fallback
    const fallback = getFallbackDeposit(id);
    if (fallback) {
      return NextResponse.json({
        id: fallback.id,
        status: fallback.status,
        admin_note: fallback.admin_note,
        updated_at: fallback.updated_at,
      });
    }

    return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

