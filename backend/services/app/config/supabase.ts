import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '../../../config/env.js';

let publicClient: any | null = null;
let adminClient: any | null = null;

function createStub(name: string) {
  const thrower = () => { throw new Error(`${name} is not configured. Set SUPABASE_URL and keys in environment.`) };
  return new Proxy({}, {
    get: () => thrower,
    apply: thrower as any
  });
}

export function getSupabase() {
  if (publicClient) return publicClient;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    publicClient = createStub('Supabase public client');
    return publicClient;
  }
  publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return publicClient;
}

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    adminClient = createStub('Supabase admin client');
    return adminClient;
  }
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}

// Backward-compatible named exports used by service modules
export const supabase = getSupabase();
export const supabaseAdmin = getSupabaseAdmin();

