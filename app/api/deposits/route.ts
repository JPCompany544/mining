import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

// POST /api/deposits — Create a new deposit record
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      plan_name,
      plan_price_usd,
      tier_index,
      coin_symbol,
      coin_network,
      crypto_amount,
      wallet_address,
    } = body;

    if (!plan_name || !plan_price_usd || !coin_symbol || !crypto_amount || !wallet_address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { data, error } = await adminClient
      .from('deposits')
      .insert({
        user_id: user.id,
        user_email: user.email || '',
        plan_name,
        plan_price_usd,
        tier_index: tier_index ?? 0,
        coin_symbol,
        coin_network,
        crypto_amount: String(crypto_amount),
        wallet_address,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Deposit insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deposit: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('POST /api/deposits error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

