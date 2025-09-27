import { rpcCall } from './rpc';
import type { MonthlyCashBoxHistory } from '../types';
import { supabase } from '../config/supabase';

// Cash Box Types
export interface CashBoxTransaction {
  id: string;
  facility_id: string;
  transaction_id: string;
  transaction_type: 'withdrawal' | 'deposit';
  amount: number;
  description: string;
  resident_id?: string;
  resident_name?: string;
  balance_after: number;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface CashBoxBalance {
  id: string;
  facility_id: string;
  balance: number;
  updated_by: string;
  updated_at: string;
  created_at: string;
}

// Initialize cash box balance if it doesn't exist
export async function initializeCashBoxBalance(
  facilityId: string,
  userId: string
): Promise<{ success: boolean; balance?: number; initialized?: boolean; error?: string }> {
  // For now call resetCashBoxToMonthly which initializes if missing
  return rpcCall('resetCashBoxToMonthly', [facilityId, userId])
}

// Get current cash box balance for a facility
export async function getCashBoxBalance(facilityId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('cash_box_balances')
      .select('balance')
      .eq('facility_id', facilityId)
      .maybeSingle();
    if (error) {
      return 0;
    }
    if (!data) {
      // If no row exists yet, default to starting monthly amount
      return 2500.0;
    }
    return Number((data as any).balance || 0);
  } catch (e) {
    return 0;
  }
}

// Process a cash box transaction
export async function processCashBoxTransaction(
  facilityId: string,
  transactionType: 'withdrawal' | 'deposit',
  amount: number,
  description: string,
  residentId: string | null,
  userId: string,
  transactionId: string
): Promise<{ success: boolean; balance?: number; transaction?: any; error?: string }> {
  return rpcCall('updateCashBoxBalanceWithTransaction', [facilityId, transactionType, amount, description, residentId, userId, transactionId])
}

// Reset cash box to monthly amount
export async function resetCashBoxMonthly(
  facilityId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  return rpcCall('resetCashBoxToMonthly', [facilityId, userId])
}

// Get cash box transactions
export async function getCashBoxTransactions(
  facilityId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CashBoxTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('cash_box_transactions')
      .select('*')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false })
      .range(offset, Math.max(offset, offset + limit - 1));
    if (error) throw error;
    return (data as unknown as CashBoxTransaction[]) || [];
  } catch (e) {
    return [];
  }
}

// Get cash box transactions by date range
export async function getCashBoxTransactionsByDate(
  facilityId: string,
  startDateIso: string,
  endDateIso: string
): Promise<CashBoxTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('cash_box_transactions')
      .select('*')
      .eq('facility_id', facilityId)
      .gte('created_at', startDateIso)
      .lte('created_at', endDateIso)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as CashBoxTransaction[]) || [];
  } catch (e) {
    return [];
  }
}

// Subscribe to cash box balance changes
export function subscribeToCashBoxBalance(
  facilityId: string,
  onUpdate: (balance: number) => void
) {
  const channel = supabase
    .channel(`cash_box_balance_${facilityId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cash_box_balances', filter: `facility_id=eq.${facilityId}` },
      (payload: any) => {
        const next = (payload?.new as any) || null;
        if (next && typeof next.balance !== 'undefined') {
          onUpdate(Number(next.balance));
        }
      }
    )
    .subscribe();
  return { unsubscribe() { try { supabase.removeChannel(channel) } catch (_) {} } }
}

// Add realtime subscription for cash box transactions
export function subscribeToCashBoxTransactions(
  facilityId: string,
  onInsert: (transaction: CashBoxTransaction) => void
) {
  const channel = supabase
    .channel(`cash_box_transactions_${facilityId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'cash_box_transactions', filter: `facility_id=eq.${facilityId}` },
      (payload: any) => {
        if (payload?.new) {
          onInsert(payload.new as unknown as CashBoxTransaction);
        }
      }
    )
    .subscribe();
  return { unsubscribe() { try { supabase.removeChannel(channel) } catch (_) {} } }
}

// Get monthly cash box history
export async function getMonthlyCashBoxHistory(
  facilityId: string,
  year?: number,
  month?: number
): Promise<MonthlyCashBoxHistory[]> {
  return rpcCall('getMonthlyCashBoxHistory', [facilityId, year, month])
}

// Get cash box transactions by month/year (wrapped backend RPC)
export async function getCashBoxTransactionsByMonthYear(
  facilityId: string,
  month: number,
  year: number
): Promise<CashBoxTransaction[]> {
  return rpcCall('getCashBoxTransactionsByMonthYear', [facilityId, month, year])
}