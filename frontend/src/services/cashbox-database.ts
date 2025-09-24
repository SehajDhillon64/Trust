import { rpcCall } from './rpc';
import type { MonthlyCashBoxHistory } from '../types';

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
export async function getCashBoxBalance(_facilityId: string): Promise<number> { return 0 }

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
  // Not yet implemented in backend; return empty until server RPC is added
  return []
}

// Get cash box transactions by date range
export async function getCashBoxTransactionsByDate(
  facilityId: string,
  startDateIso: string,
  endDateIso: string
): Promise<CashBoxTransaction[]> {
  return []
}

// Subscribe to cash box balance changes
export function subscribeToCashBoxBalance(
  facilityId: string,
  onUpdate: (balance: number) => void
) {
  return { unsubscribe() {} }
}

// Add realtime subscription for cash box transactions
export function subscribeToCashBoxTransactions(
  facilityId: string,
  onInsert: (transaction: CashBoxTransaction) => void
) {
  return { unsubscribe() {} }
}

// Get monthly cash box history
export async function getMonthlyCashBoxHistory(
  facilityId: string,
  year?: number,
  month?: number
): Promise<MonthlyCashBoxHistory[]> {
  return rpcCall('getMonthlyCashBoxHistory', [facilityId, year, month])
}