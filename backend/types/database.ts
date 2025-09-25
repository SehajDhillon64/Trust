// Minimal backend Database typings to satisfy generics and keep backend isolated from frontend root
export interface Database {
  public: {
    Tables: {
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
          company_id?: string | null
        }
        Insert: Partial<Database['public']['Tables']['facilities']['Row']>
        Update: Partial<Database['public']['Tables']['facilities']['Row']>
      }
      residents: {
        Row: { id: string; trust_balance: number }
        Insert: Partial<Database['public']['Tables']['residents']['Row']>
        Update: Partial<Database['public']['Tables']['residents']['Row']>
      }
      transactions: {
        Row: { id: string }
        Insert: Partial<Database['public']['Tables']['transactions']['Row']>
        Update: Partial<Database['public']['Tables']['transactions']['Row']>
      }
      service_batches: {
        Row: { id: string; total_amount: number }
        Insert: any
        Update: any
      }
      service_batch_items: {
        Row: { id: string; amount: number | null }
        Insert: any
        Update: any
      }
      deposit_batches: {
        Row: { id: string }
        Insert: any
        Update: any
      }
      deposit_batch_entries: {
        Row: { id: string; amount: number; method: 'cash' | 'cheque' }
        Insert: any
        Update: any
      }
      invoices: {
        Row: any
        Insert: any
        Update: any
      }
      invoice_items: {
        Row: any
        Insert: any
        Update: any
      }
      signup_invitations: {
        Row: any
        Insert: any
        Update: any
      }
      vendor_facilities: {
        Row: { id: string; vendor_user_id: string; facility_id: string }
        Insert: any
        Update: any
      }
      cash_box_balances: { Row: { balance: number } }
      cash_box_transactions: { Row: any; Insert?: any; Update?: any }
      monthly_cash_box_history: { Row: any; Insert?: any; Update?: any }
      resident_withdrawals: { Row: any; Insert?: any; Update?: any }
      pre_auth_debits: { Row: any; Insert?: any; Update?: any }
      monthly_pre_auth_lists: { Row: any; Insert?: any; Update?: any }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
