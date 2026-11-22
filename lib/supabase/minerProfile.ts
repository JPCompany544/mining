import { SupabaseClient, User } from '@supabase/supabase-js';
import type { MinerProfile } from '../types/miner';

/**
 * Retrieves the miner's profile from the `miners` table.
 */
export async function getMinerProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<MinerProfile | null> {
  try {
    const { data, error } = await supabase
      .from('miners')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch miner profile:', error.message);
      return null;
    }

    return data as MinerProfile | null;
  } catch (err) {
    console.error('Error fetching miner profile:', err);
    return null;
  }
}

/**
 * Ensures that a miner profile exists in the `miners` table.
 * If the database trigger on auth.users hasn't run or is delayed,
 * this acts as a safe, idempotent fallback.
 */
export async function ensureMinerProfile(
  supabase: SupabaseClient,
  user: User,
  customUsername?: string
): Promise<MinerProfile | null> {
  try {
    // 1. Try to fetch existing
    const existing = await getMinerProfile(supabase, user.id);
    if (existing) {
      return existing;
    }

    // 2. Insert new record if missing
    const fallbackUsername = customUsername || user.user_metadata?.username || user.email?.split('@')[0] || 'Miner';

    const { data, error } = await supabase
      .from('miners')
      .insert({
        id: user.id,
        email: user.email,
        username: fallbackUsername,
        mining_status: 'idle',
      })
      .select()
      .maybeSingle();

    if (error) {
      // If error is duplicate key, re-fetch
      if (error.code === '23505') {
        return await getMinerProfile(supabase, user.id);
      }
      console.warn('Failed to insert miner profile fallback:', error.message);
      return null;
    }

    return data as MinerProfile | null;
  } catch (err) {
    console.error('Error ensuring miner profile:', err);
    return null;
  }
}

