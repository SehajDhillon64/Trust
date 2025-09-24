import { supabase } from '../config/supabase';
import { cash_box_balances, cash_box_transactions, monthly_cash_box_history} from '../types';
import { Database } from '../types/database';
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
  try {
    const { data, error } = await supabase.rpc('initialize_cash_box_balance', {
      p_facility_id: facilityId,
      p_user_id: userId
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error initializing cash box balance:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Get current cash box balance for a facility
export async function getCashBoxBalance(facilityId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('cash_box_balances')
      .select('balance')
      .eq('facility_id', facilityId)
      .maybeSingle();
     // Use maybeSingle instead of single to handle 0 or 1 row

    if (error) {
      console.error('Error getting cash box balance:', error);
      return 0;
    }
    
    // If no balance exists, return default value
    // The balance will be initialized when the first transaction is made
    if (!data) {
      return 2500.00;// Return default value but don't try to insert
    }
    
    return data.balance || 0;
  } catch (error) {
    console.error('Error getting cash box balance:', error);
    return 0; // Return 0 on error instead of default 2500
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
  try {
    const { data, error } = await supabase.rpc('process_cash_box_transaction', {
      p_facility_id: facilityId,
      p_transaction_type: transactionType,
      p_amount: amount,
      p_description: description,
      p_resident_id: residentId,
      p_user_id: userId,
      p_transaction_id: transactionId
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error processing cash box transaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Reset cash box to monthly amount
export async function resetCashBoxMonthly(
  facilityId: string,
  userId: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    console.log('YHAN TK CHL RHA HAI')
    const { data, error } = await supabase.rpc('reset_cash_box_monthly', {
      p_facility_id: facilityId,
      p_user_id: userId
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error resetting cash box:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Get cash box transactions
export async function getCashBoxTransactions(
  facilityId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CashBoxTransaction[]> {
  try {
    const { data, error } = await supabase.rpc('get_cash_box_transactions', {
      p_facility_id: facilityId,
      p_limit: limit,
      p_offset: offset
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting cash box transactions:', error);
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
     console.log("Fetching cash box transactions with params:", {
      facilityId,
      startDateIso,
      endDateIso
    });
    const { data, error } = await supabase
      .from('cash_box_transactions')
      .select('*')
      .eq('facility_id', facilityId)
      .gte('created_at', startDateIso)
      .lte('created_at', endDateIso)
      .order('created_at', { ascending: false });
       console.log(data);
    if (error) throw error;
    return (data as unknown as CashBoxTransaction[]) || [];
  } catch (error) {
    console.error('Error getting cash box transactions by date:', error);
    return [];
  }
}

// Subscribe to cash box balance changes
export function subscribeToCashBoxBalance(
  facilityId: string,
  onUpdate: (balance: number) => void
) {
  const subscription = supabase
    .channel(`cash_box_balance_${facilityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cash_box_balances',
        filter: `facility_id=eq.${facilityId}`
      },
      async (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'balance' in payload.new) {
          onUpdate(payload.new.balance as number);
        }
      }
    )
    .subscribe();

  return subscription;
}

// Add realtime subscription for cash box transactions
export function subscribeToCashBoxTransactions(
  facilityId: string,
  onInsert: (transaction: CashBoxTransaction) => void
) {
  const subscription = supabase
    .channel(`cash_box_transactions_${facilityId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'cash_box_transactions',
        filter: `facility_id=eq.${facilityId}`
      },
      (payload) => {
        if (payload.new) {
          onInsert(payload.new as unknown as CashBoxTransaction);
        }
      }
    )
    .subscribe();

  return subscription;
}

// Get monthly cash box history
export async function getMonthlyCashBoxHistory(
  facilityId: string,
  year?: number,
  month?: number
): Promise<any[]> {
  try {
    let query = supabase
      .from('monthly_cash_box_history')
      .select('*')
      .eq('facility_id', facilityId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (year) {
      query = query.eq('year', year);
    }
    if (month) {
      query = query.eq('month', month);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting monthly cash box history:', error);
    return [];
  }
}