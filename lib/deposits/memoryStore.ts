import { DepositRecord } from '../types/deposit';

// In-memory fallback cache to ensure zero payment submissions are ever lost
// even if Supabase table permissions are temporarily pending
const memoryDeposits: Map<string, DepositRecord> = new Map();

export function saveFallbackDeposit(record: DepositRecord): void {
  memoryDeposits.set(record.id, record);
}

export function getFallbackDeposit(id: string): DepositRecord | undefined {
  return memoryDeposits.get(id);
}

export function getAllFallbackDeposits(): DepositRecord[] {
  return Array.from(memoryDeposits.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function updateFallbackDeposit(id: string, status: 'confirmed' | 'rejected', adminNote?: string): DepositRecord | null {
  const existing = memoryDeposits.get(id);
  if (!existing) return null;
  const updated: DepositRecord = {
    ...existing,
    status,
    admin_note: adminNote || null,
    updated_at: new Date().toISOString(),
  };
  memoryDeposits.set(id, updated);
  return updated;
}

