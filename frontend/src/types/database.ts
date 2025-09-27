export interface Database {
    public: {
    Tables: {
      cash_box_balances: {
        Row: {
          id: string;
          facility_id: string;
          balance: number;
          updated_by: string;
          updated_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          facility_id: string;
          balance?: number;
          updated_by: string;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          facility_id?: string;
          balance?: number;
          updated_by?: string;
          updated_at?: string;
          created_at?: string;
        };
      };

      

      cash_box_transactions: {
        Row: {
          id: string;
          facility_id: string;
          transaction_id: string;
          transaction_type: 'withdrawal' | 'deposit';
          amount: number;
          description: string;
          resident_id: string | null;
          balance_after: number;
          created_by: string;
          created_at: string | null;
          resident_name: string | null;
          created_by_name: string | null;
        };
        Insert: {
          id?: string;
          facility_id: string;
          transaction_id: string;
          transaction_type: 'withdrawal' | 'deposit';
          amount: number;
          description: string;
          resident_id?: string;
          balance_after: number;
          created_by: string;
          created_at?: string;
          resident_name?: string;
          created_by_name?: string;
        };
        Update: Partial<Insert>;
      };
      
      facilities: {
        Row: {
          id: string
          name: string
          address: string
          phone: string | null
          email: string
          office_manager_email: string
          created_at: string
          status: 'active' | 'inactive'
          unique_code: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          phone?: string | null
          email: string
          office_manager_email: string
          created_at?: string
          status?: 'active' | 'inactive'
          unique_code: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          phone?: string | null
          email?: string
          office_manager_email?: string
          created_at?: string
          status?: 'active' | 'inactive'
          unique_code?: string
        }
      }
      
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'Admin' | 'OM' | 'POA' | 'Resident' | 'Vendor'
          facility_id: string | null
          created_at: string
          auth_user_id: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role: 'Admin' | 'OM' | 'POA' | 'Resident' | 'Vendor'
          facility_id?: string | null
          created_at?: string
          auth_user_id: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'Admin' | 'OM' | 'POA' | 'Resident' | 'Vendor'
          facility_id?: string | null
          created_at?: string
          auth_user_id?: string
        }
      }

      residents: {
        Row: {
          id: string
          resident_id: string
          name: string
          dob: string
          trust_balance: number
          is_self_managed: boolean
          linked_user_id: string | null
          ltc_unit: string | null
          status: 'active' | 'inactive'
          created_at: string
          facility_id: string
          bank_details: {
            bankName: string
            accountNumber: string
            transitNumber: string
            institutionNumber: string
            accountType: 'checking' | 'savings'
            notes?: string
          } | null
          allowed_services: {
            haircare: boolean
            footcare: boolean
            pharmacy: boolean
            cable: boolean
            wheelchairRepair: boolean
            miscellaneous: boolean
          }
          service_authorizations: {
            haircare: boolean
            footcare: boolean
            pharmacy: boolean
            cable: boolean
            wheelchairRepair: boolean
            miscellaneous: boolean
          } | null
        }
        Insert: {
          id?: string
          resident_id: string
          name: string
          dob: string
          trust_balance?: number
          is_self_managed?: boolean
          linked_user_id?: string | null
          ltc_unit?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          facility_id: string
          bank_details?: {
            bankName: string
            accountNumber: string
            transitNumber: string
            institutionNumber: string
            accountType: 'checking' | 'savings'
            notes?: string
          } | null
          allowed_services: {
            haircare: boolean
            footcare: boolean
            pharmacy: boolean
            cable: boolean
            wheelchairRepair: boolean
            miscellaneous: boolean
          }
          service_authorizations?: {
            haircare: boolean
            footcare: boolean
            pharmacy: boolean
            cable: boolean
            wheelchairRepair: boolean
            miscellaneous: boolean
          } | null
        }
        Update: {
          id?: string
          resident_id?: string
          name?: string
          dob?: string
          trust_balance?: number
          is_self_managed?: boolean
          linked_user_id?: string | null
          ltc_unit?: string | null
          status?: 'active' | 'inactive'
          created_at?: string
          facility_id?: string
          bank_details?: {
            bankName: string
            accountNumber: string
            transitNumber: string
            institutionNumber: string
            accountType: 'checking' | 'savings'
            notes?: string
          } | null
          allowed_services?: {
            haircare: boolean
            footcare: boolean
            pharmacy: boolean
            cable: boolean
            wheelchairRepair: boolean
            miscellaneous: boolean
          }
          service_authorizations?: {
            haircare: boolean
            footcare: boolean
            pharmacy: boolean
            cable: boolean
            wheelchairRepair: boolean
            miscellaneous: boolean
          } | null
        }
      }

      transactions: {
        Row: {
          id: string
          resident_id: string
          facility_id: string
          type: 'credit' | 'debit'
          amount: number
          method: 'manual' | 'cash' | 'cheque'
          description: string
          created_by: string
          timestamp: string
        }
        Insert: {
          id?: string
          resident_id: string
          facility_id: string
          type: 'credit' | 'debit'
          amount: number
          method: 'manual' | 'cash' | 'cheque'
          description: string
          created_by: string
          timestamp?: string
        }
        Update: {
          id?: string
          resident_id?: string
          facility_id?: string
          type?: 'credit' | 'debit'
          amount?: number
          method?: 'manual' | 'cash' | 'cheque'
          description?: string
          created_by?: string
          timestamp?: string
        }
      }

      deposit_batches: {
        Row: {
          id: string;
          facility_id: string;
          batch_number: string;
          total_amount: number;
          status: 'open' | 'posted';
          initiated_by: string;
          processed_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string | null;
          completed_at: string | null;
          total_cash?: number | null; // optional aggregate fields
          total_cheque?: number | null;
        };
        Insert: {
          id?: string;
          facility_id: string;
          batch_number?: string;
          total_amount?: number;
          status?: 'open' | 'posted';
          initiated_by: string;
          processed_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
          completed_at?: string | null;
          total_cash?: number | null;
          total_cheque?: number | null;
        };
        Update: {
          id?: string;
          facility_id?: string;
          batch_number?: string;
          total_amount?: number;
          status?: 'open' | 'posted';
          initiated_by?: string;
          processed_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
          completed_at?: string | null;
          total_cash?: number | null;
          total_cheque?: number | null;
        };
      };

      deposit_batch_entries: {
        Row: {
          id: string;
          batch_id: string;
          resident_id: string;
          amount: number;
          method: 'cash' | 'cheque';
          description: string | null;
          cheque_number: string | null;
          status: 'pending' | 'processed';
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          resident_id: string;
          amount: number;
          method: 'cash' | 'cheque';
          description?: string | null;
          cheque_number?: string | null;
          status?: 'pending' | 'processed';
          processed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          resident_id?: string;
          amount?: number;
          method?: 'cash' | 'cheque';
          description?: string | null;
          cheque_number?: string | null;
          status?: 'pending' | 'processed';
          processed_at?: string | null;
          created_at?: string;
        };
      };

      service_batches: {
        Row: {
          id: string
          facility_id: string
          service_type: 'haircare' | 'footcare' | 'pharmacy' | 'cable' | 'wheelchairRepair' | 'miscellaneous'
          status: 'open' | 'posted'
          created_at: string
          posted_at: string | null
          created_by: string
          posted_by: string | null
          total_amount: number
          processed_count: number
        }
        Insert: {
          id?: string
          facility_id: string
          service_type: 'haircare' | 'footcare' | 'pharmacy' | 'cable' | 'wheelchairRepair' | 'miscellaneous'
          status?: 'open' | 'posted'
          created_at?: string
          posted_at?: string | null
          created_by: string
          posted_by?: string | null
          total_amount?: number
          processed_count?: number
        }
        Update: {
          id?: string
          facility_id?: string
          service_type?: 'haircare' | 'footcare' | 'pharmacy' | 'cable' | 'wheelchairRepair' | 'miscellaneous'
          status?: 'open' | 'posted'
          created_at?: string
          posted_at?: string | null
          created_by?: string
          posted_by?: string | null
          total_amount?: number
          processed_count?: number
        }
      }

      service_batch_items: {
        Row: {
          id: string
          batch_id: string
          resident_id: string
          amount: number
          status: 'pending' | 'processed' | 'failed'
          error_message: string | null
          processed_at: string | null
        }
        Insert: {
          id?: string
          batch_id: string
          resident_id: string
          amount: number
          status?: 'pending' | 'processed' | 'failed'
          error_message?: string | null
          processed_at?: string | null
        }
        Update: {
          id?: string
          batch_id?: string
          resident_id?: string
          amount?: number
          status?: 'pending' | 'processed' | 'failed'
          error_message?: string | null
          processed_at?: string | null
        }
      }

      signup_invitations: {
        Row: {
          id: string
          facility_id: string
          email: string
          role: 'OM' | 'POA'
          invited_by: string
          invited_at: string
          status: 'pending' | 'accepted' | 'expired'
          token: string
          expires_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          email: string
          role: 'OM' | 'POA'
          invited_by: string
          invited_at?: string
          status?: 'pending' | 'accepted' | 'expired'
          token: string
          expires_at: string
        }
        Update: {
          id?: string
          facility_id?: string
          email?: string
          role?: 'OM' | 'POA'
          invited_by?: string
          invited_at?: string
          status?: 'pending' | 'accepted' | 'expired'
          token?: string
          expires_at?: string
        }
      }

      pre_auth_debits: {
        Row: {
          id: string
          resident_id: string
          facility_id: string
          authorized_by: string
          description: string
          authorized_date: string
          target_month: string
          amount: number
          type: 'credit' | 'debit'
          is_active: boolean
          created_at: string
          processed_at: string | null
          status: 'pending' | 'processed' | 'cancelled'
        }
        Insert: {
          id?: string
          resident_id: string
          facility_id: string
          authorized_by: string
          description: string
          authorized_date: string
          target_month: string
          amount: number
          type: 'credit' | 'debit'
          is_active?: boolean
          created_at?: string
          processed_at?: string | null
          status?: 'pending' | 'processed' | 'cancelled'
        }
        Update: {
          id?: string
          resident_id?: string
          facility_id?: string
          authorized_by?: string
          description?: string
          authorized_date?: string
          target_month?: string
          amount?: number
          type?: 'credit' | 'debit'
          is_active?: boolean
          created_at?: string
          processed_at?: string | null
          status?: 'pending' | 'processed' | 'cancelled'
        }
      }
      monthly_pre_auth_lists: {
        Row: {
          id: string
          facility_id: string
          month: string
          status: 'open' | 'closed'
          created_at: string
          closed_at: string | null
          closed_by: string | null
          total_amount: number
        }
        Insert: {
          id?: string
          facility_id: string
          month: string
          status?: 'open' | 'closed'
          created_at?: string
          closed_at?: string | null
          closed_by?: string | null
          total_amount?: number
        }
        Update: {
          id?: string
          facility_id?: string
          month?: string
          status?: 'open' | 'closed'
          created_at?: string
          closed_at?: string | null
          closed_by?: string | null
          total_amount?: number
        }
      }

      monthly_cash_box_history: {
        Row: {
          id: string
          facility_id: string
          month: number
          year: number
          starting_balance: number
          ending_balance: number
          reset_amount: number
          reset_date: string
          reset_by: string
          created_at: string
        }
        Insert: {
          id?: string
          facility_id: string
          month: number
          year: number
          starting_balance: number
          ending_balance: number
          reset_amount: number
          reset_date: string
          reset_by: string
          created_at?: string
        }
        Update: {
          id?: string
          facility_id?: string
          month?: number
          year?: number
          starting_balance?: number
          ending_balance?: number
          reset_amount?: number
          reset_date?: string
          reset_by?: string
          created_at?: string
        }
      }
     

      manual_money_entries: {
        Row: {
          id: string
          facility_id: string
          amount: number
          type: 'cash_addition' | 'cash_removal'
          description: string
          added_by: string
          timestamp: string
          month: number
          year: number
        }
        Insert: {
          id?: string
          facility_id: string
          amount: number
          type: 'cash_addition' | 'cash_removal'
          description: string
          added_by: string
          timestamp?: string
          month: number
          year: number
        }
        Update: {
          id?: string
          facility_id?: string
          amount?: number
          type?: 'cash_addition' | 'cash_removal'
          description?: string
          added_by?: string
          timestamp?: string
          month?: number
          year?: number
        }
      }

      vendor_facilities: {
        Row: {
          id: string
          vendor_user_id: string
          facility_id: string
          created_at: string
        }
        Insert: {
          id?: string
          vendor_user_id: string
          facility_id: string
          created_at?: string
        }
        Update: {
          id?: string
          vendor_user_id?: string
          facility_id?: string
          created_at?: string
        }
      }

      invoices: {
        Row: {
          id: string
          facility_id: string
          vendor_user_id: string
          status: 'open' | 'submitted' | 'paid'
          om_notes: string | null
          created_at: string
          updated_at: string | null
          submitted_at: string | null
          paid_at: string | null
          paid_by: string | null
          invoice_no: number | null
          vendor_name: string | null
          vendor_address: string | null
          vendor_email: string | null
          invoice_date: string | null
        }
        Insert: {
          id?: string
          facility_id: string
          vendor_user_id: string
          status?: 'open' | 'submitted' | 'paid'
          om_notes?: string | null
          created_at?: string
          updated_at?: string | null
          submitted_at?: string | null
          paid_at?: string | null
          paid_by?: string | null
          invoice_no: number | null
          vendor_name?: string | null
          vendor_address?: string | null
          vendor_email?: string | null
          invoice_date?: string | null
        }
        Update: {
          id?: string
          facility_id?: string
          vendor_user_id?: string
          status?: 'open' | 'submitted' | 'paid'
          om_notes?: string | null
          created_at?: string
          updated_at?: string | null
          submitted_at?: string | null
          paid_at?: string | null
          paid_by?: string | null
          invoice_no: number | null
          vendor_name?: string | null
          vendor_address?: string | null
          vendor_email?: string | null
          invoice_date?: string | null
        }
      }

      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          resident_id: string
          amount: number
          description: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          invoice_id: string
          resident_id: string
          amount: number
          description: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string
          resident_id?: string
          amount?: number
          description?: string
          created_at?: string
          updated_at?: string | null
        }
      }

      resident_withdrawals: {
        Row: {
          id: string;
          resident_id: string;
          facility_id: string;
          amount: number;
          method: 'cash' | 'cheque';
          description: string;
          withdrawn_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          resident_id: string;
          facility_id: string;
          amount: number;
          method: 'cash' | 'cheque';
          description: string;
          withdrawn_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          resident_id?: string;
          facility_id?: string;
          amount?: number;
          method?: 'cash' | 'cheque';
          description?: string;
          withdrawn_by?: string;
          created_at?: string;
        };
      };
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'Admin' | 'OM' | 'POA' | 'Resident' | 'Vendor'
      facility_status: 'active' | 'inactive'
      resident_status: 'active' | 'inactive'
      transaction_type: 'credit' | 'debit'
      transaction_method: 'manual' | 'cash' | 'cheque'
      service_type: 'haircare' | 'footcare' | 'pharmacy' | 'cable' | 'wheelchairRepair' | 'miscellaneous'
      batch_status: 'open' | 'posted'
      batch_item_status: 'pending' | 'processed' | 'failed'
      invitation_status: 'pending' | 'accepted' | 'expired'
      preauth_status: 'pending' | 'processed' | 'cancelled'
      preauth_type: 'credit' | 'debit'
      money_entry_type: 'cash_addition' | 'cash_removal'
      account_type: 'checking' | 'savings'
      invoice_status: 'open' | 'submitted' | 'paid'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}