import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'











const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxY2F1b3JoZHV0a3N6dWZ2cmxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1Mjk0MCwiZXhwIjoyMDY5NzI4OTQwfQ.0a8JHBlmN7tqpwEm_RVbVzuNBpzzjtczqvk2JWIohHE';

let adminClient: any | null = null;
export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is required');
  if (!serviceRoleKey) throw new Error('VITE_SUPABASE_SERVICE_ROLE_KEY is required');
  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);
  return adminClient;
}
// Use placeholder values for demo mode when actual credentials aren't provided
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-my-custom-header': 'cashbox-app'
    }
  },
  db: {
    schema: 'public'
  }
})

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'x-my-custom-header': 'cashbox-app-admin'
    }
  },
  db: {
    schema: 'public'
  }
})