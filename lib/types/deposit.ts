export type DepositStatus = 'pending' | 'confirmed' | 'rejected';

export interface DepositRecord {
  id: string;
  user_id?: string | null;
  user_email: string;
  plan_name: string;
  plan_price_usd: number;
  tier_index: number;
  coin_symbol: string;
  coin_network: string;
  crypto_amount: string;
  wallet_address: string;
  status: DepositStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  username: string;
  created_at: string;
  email_verified: boolean;
  mining_status?: string;
  total_deposits?: number;
}

