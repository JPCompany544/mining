export interface MinerProfile {
  id: string; // matches auth.users.id
  email: string | null;
  username: string | null;
  mining_status: 'idle' | 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: {
    id: string;
    email?: string;
    username?: string;
  } | null;
  profile: MinerProfile | null;
  isLoading: boolean;
}

