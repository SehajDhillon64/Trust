import { getSupabaseAdmin } from '../config/supabase.js';

export async function getItems() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from('items').select('*').limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function upsertUserProfile(profile: { id: string; email?: string | null; full_name?: string | null }) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from('profiles').upsert(profile).select('*').single();
  if (error) throw error;
  return data;
}
