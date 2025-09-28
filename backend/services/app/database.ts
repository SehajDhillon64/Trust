import { supabase, getSupabaseAdmin, supabaseAdmin } from '../../config/supabase.js'
import { User, Facility, Resident, Transaction, ServiceBatch, ServiceBatchItem, PreAuthDebit, MonthlyPreAuthList, SignupInvitation } from '../../types/models'
type InvoiceItem = { id: string; invoiceId: string; residentId: string; amount: number; description: string; createdAt: string; updatedAt?: string }
type Invoice = { id: string; facilityId: string; vendorUserId: string; status: 'open' | 'submitted' | 'paid'; omNotes?: string; createdAt: string; updatedAt?: string; submittedAt?: string; paidAt?: string; paidBy?: string; items: InvoiceItem[]; invoice_no?: number | string; vendorName?: string; vendorAddress?: string; vendorEmail?: string; invoiceDate?: string }
import { Database } from '../../types/database'

// Utility function to check Supabase connection status
async function checkSupabaseConnection() {
  try {
    const startTime = performance.now();
    const { data, error } = await supabase.from('facilities').select('count').limit(1);
    const endTime = performance.now();
    
    if (error) {
      return false;
    }
    return true;
  } catch (error) {
    
    return false;
  }
}

// Utility function to create a timeout promise
function createTimeout(ms: number, operation: string) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation '${operation}' timed out after ${ms}ms`));
    }, ms);
  });
}

type Tables = any

// Conversion functions for service batches
function dbServiceBatchToServiceBatch(dbBatch: any): ServiceBatch {
  return {
    id: dbBatch.id,
    facilityId: dbBatch.facility_id,
    serviceType: dbBatch.service_type,
    status: dbBatch.status,
    createdAt: dbBatch.created_at,
    postedAt: dbBatch.posted_at,
    createdBy: dbBatch.created_by,
    postedBy: dbBatch.posted_by,
    items: dbBatch.service_batch_items?.map((item: any) => dbServiceBatchItemToServiceBatchItem(item)) || [],
    totalAmount: dbBatch.total_amount,
    service_batch_no: dbBatch.service_batch_no,
    processedCount: dbBatch.processed_count,
    cheque_number: dbBatch.cheque_number
  }
}

function dbServiceBatchItemToServiceBatchItem(dbItem: any): ServiceBatchItem {
  return {
    id: dbItem.id,
    residentId: dbItem.resident_id,
    amount: dbItem.amount,
    status: dbItem.status,
    errorMessage: dbItem.error_message,
    processedAt: dbItem.processed_at
  }
}

// Mock data for demo purposes
const mockFacilities: Facility[] = [
  {
    id: '1',
    name: 'Sunrise Manor Long Term Care',
    address: '123 Care Street, Toronto, ON',
    phone: '(416) 555-0123',
    email: 'admin@sunrisemanor.ca',
    officeManagerEmail: 'sarah.johnson@ltc.com',
    createdAt: '2024-01-01',
    status: 'active',
    uniqueCode: 'SM001'
  },
  {
    id: '2',
    name: 'Golden Years Care Center',
    address: '456 Elder Ave, Vancouver, BC',
    phone: '(604) 555-0456',
    email: 'info@goldenyears.ca',
    officeManagerEmail: 'mike.wilson@goldenyears.ca',
    createdAt: '2024-01-15',
    status: 'active',
    uniqueCode: 'GY002'
  }
];

const mockUsers: User[] = [
  {
    id: '0',
    name: 'System Administrator',
    email: 'admin@trustmanager.com',
    role: 'Admin'
  },
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@ltc.com',
    role: 'OM',
    facilityId: '1'
  },
  {
    id: '1b',
    name: 'David Chen',
    email: 'david.chen@goldenyears.ca',
    role: 'OM',
    facilityId: '2'
  },
  {
    id: '2', 
    name: 'Michael Brown',
    email: 'michael.brown@email.com',
    role: 'POA',
    facilityId: '1'
  },
  {
    id: '3',
    name: 'Emma Wilson',
    email: 'emma.wilson@email.com', 
    role: 'Resident',
    facilityId: '1'
  }
];

const isDemoMode = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const isDemo = false;
  return isDemo;
};



// Utility function to convert database row to application types
function dbUserToUser(dbUser: Tables['users']['Row'], facility?: Facility): User {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    facilityId: dbUser.facility_id || undefined,
    companyId: (dbUser as any).company_id || undefined
  }
}

function dbFacilityToFacility(dbFacility: Tables['facilities']['Row']): Facility {
  return {
    id: dbFacility.id,
    name: dbFacility.name,
    address: dbFacility.address,
    phone: dbFacility.phone || undefined,
    email: dbFacility.email,
    officeManagerEmail: dbFacility.office_manager_email,
    createdAt: dbFacility.created_at,
    status: dbFacility.status,
    uniqueCode: dbFacility.unique_code,
    companyId: (dbFacility as any).company_id
  }
}

function dbResidentToResident(dbResident: Tables['residents']['Row']): Resident {
  return {
    id: dbResident.id,
    residentId: dbResident.resident_id,
    name: dbResident.name,
    dob: dbResident.dob,
    trustBalance: dbResident.trust_balance,
    isSelfManaged: dbResident.is_self_managed,
    linkedUserId: dbResident.linked_user_id || undefined,
    ltcUnit: dbResident.ltc_unit || undefined,
    status: dbResident.status,
    createdAt: dbResident.created_at,
    facilityId: dbResident.facility_id,
    bankDetails: dbResident.bank_details || undefined,
    allowedServices: dbResident.allowed_services,
    serviceAuthorizations: dbResident.service_authorizations || undefined
  }
}

function dbTransactionToTransaction(dbTransaction: Tables['transactions']['Row']): Transaction {
  return {
    id: dbTransaction.id,
    residentId: dbTransaction.resident_id,
    facilityId: dbTransaction.facility_id,
    type: dbTransaction.type,
    amount: dbTransaction.amount,
    method: dbTransaction.method,
    description: dbTransaction.description,
    createdBy: dbTransaction.created_by,
    timestamp: dbTransaction.timestamp
  }
}

// Auth functions
export async function signUpUser(email: string, password: string, userData: {
  name: string
  role: 'Admin' | 'OM' | 'POA' | 'Resident' | 'Vendor'
  facilityId?: string
  companyId?: string
}) {
  
  
  try {
    // Do NOT call Supabase auth signup. Auth is handled elsewhere.
    

    // First: if a profile already exists, return it
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingProfileError) {
    }

    if (existingProfile) {
      const result = { user: dbUserToUser(existingProfile), authUser: null as any };
      return result;
    }

    // If no profile, fetch the auth user by email via admin client
    const admin = getSupabaseAdmin();
    const listResp = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listResp.error) {
      throw listResp.error;
    }
    const matched = listResp.data.users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (!matched) {
      throw new Error('No auth user found for the provided email. Please complete account authentication first.');
    }

    

    // Create user profile
    

    const isValidUuid = (value: string | undefined): boolean => {
      if (!value) return false;
      return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
    };
    const facilityIdToInsert = isValidUuid(userData.facilityId) ? userData.facilityId : null;
    if (userData.facilityId && !facilityIdToInsert) {
    }

    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .insert({
        name: userData.name,
        email,
        role: userData.role,
        facility_id: facilityIdToInsert,
        auth_user_id: matched.id,
        ...(userData.companyId ? { company_id: userData.companyId } : {})
      })
      .select()
      .single();

    

    if (userError) {
      
      throw userError;
    }

    

    const result = { user: dbUserToUser(dbUser), authUser: null as any };
    

    return result;
  } catch (error) {
    
    
    throw error;
  }
}

export async function signInUser(email: string, password: string) {
  const startTime = performance.now();
  try {
    
    // Original Supabase authentication with timeout
    
    const authStartTime = performance.now();
    
    const authPromise = supabase.auth.signInWithPassword({
      email,
      password
    });
    const timeoutPromise = createTimeout(30000, 'Supabase authentication'); // 30 second timeout
    
    const { data: authData, error: authError } = await Promise.race([authPromise, timeoutPromise]) as any;
    const authEndTime = performance.now();
    
    
    if (authError) {
      
      throw authError;
    }
    
    if (!authData.user) {
      
      throw new Error('Failed to sign in');
    }
    
    

    // Try direct profile read first
    let userData: any | null = null;
    let userError: any | null = null;
    const userQueryStartTime = performance.now();
    const directUserQuery = supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();
    try {
      const { data, error } = await Promise.race([directUserQuery, createTimeout(15000, 'User profile query')]) as any;
      userData = data;
      userError = error;
    } catch (e: any) {
      userError = e;
    }
    const userQueryEndTime = performance.now();
    

    // Fallback via server if direct read failed due to RLS
    if (userError || !userData) {
      
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) {
        throw new Error('Missing access token after sign-in');
      }
      const apiBase = (process.env.VITE_API_BASE_URL || process.env.VITE_BACKEND_URL || 'https://trust-3.onrender.com').replace(/\/+$/, '');
      const resp = await fetch(`${apiBase}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Profile fetch failed with ${resp.status}`);
      }
      const body = await resp.json();
      userData = { ...body.user, company_id: body.companyId };
      const facilityFromServer = body.facility ? dbFacilityToFacility(body.facility) : null;
      

      const result = { 
        user: dbUserToUser(userData), 
        facility: facilityFromServer,
        authUser: authData.user 
      };
      return result;
    }

    // Direct path: optionally load facility
    let facility: Facility | null = null;
    if (userData?.facility_id) {
      const facilityQueryPromise = supabase
        .from('facilities')
        .select('*')
        .eq('id', userData.facility_id)
        .single();
      try {
        const { data: facilityData, error: facilityError } = await Promise.race([
          facilityQueryPromise,
          createTimeout(15000, 'Facility query'),
        ]) as any;
        if (!facilityError && facilityData) {
          facility = dbFacilityToFacility(facilityData);
        }
      } catch (_) {
        // ignore; facility remains null
      }
    }

    const result = { 
      user: dbUserToUser(userData), 
      facility,
      authUser: authData.user 
    };
    return result;
  } catch (error) {
    throw error;
  }
}                                                                                                   
export async function signOutUser() {
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error', { message: error.message, name: error.name });
      throw error;
    }
  } catch (error) {
    console.error('Unexpected sign out error', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
    });
    throw error;
  }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw error;
  }

  if (!data.session?.user) {
    return null;
  }

  const user = data.session.user;

  // Try direct profile read
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (userError) {
  }

  if (!userData) {
    // Fallback via server
    const accessToken = data.session.access_token;
    try {
      const apiBase = (process.env.VITE_API_BASE_URL || process.env.VITE_BACKEND_URL || 'https://trust-3.onrender.com').replace(/\/+$/, '');
      const resp = await fetch(`${apiBase}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        return null; // Treat as no user rather than throwing to avoid blocking app
      }
      const body = await resp.json();
      const profile = body.user;
      const facility = body.facility ? dbFacilityToFacility(body.facility) : null;
      return {
        user: dbUserToUser({ ...profile, company_id: body.companyId } as any),
        facility,
      };
    } catch (e) {
      return null;
    }
  }

  // Direct success path
  let facility: Facility | null = null;
  if ((userData as any)?.facility_id) {
    const { data: facilityData } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', (userData as any).facility_id)
      .maybeSingle();
    if (facilityData) {
      facility = dbFacilityToFacility(facilityData);
    }
  }

  return {
    user: dbUserToUser(userData as any),
    facility,
  };
}

// Facility functions
export async function createFacility(facilityData: Omit<Facility, 'id' | 'createdAt'>) {
 
  
  try {
    const { data, error } = await supabase
      .from('facilities')
      .insert({
        name: facilityData.name,
        address: facilityData.address,
        phone: facilityData.phone || null,
        email: facilityData.email,
        office_manager_email: facilityData.officeManagerEmail,
        status: facilityData.status,
        unique_code: facilityData.uniqueCode,
        ...(facilityData as any).companyId ? { company_id: (facilityData as any).companyId } : {}
      })
      .select()
      .single()

    if (error) throw error
    return dbFacilityToFacility(data)
  } catch (error) {
    throw error
  }
}

export async function getFacilities(companyId?: string) {
  try {
    let query = supabase
      .from('facilities')
      .select('*')
      .order('name') as any;

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error

    // If Supabase returns results, use them
    if (Array.isArray(data) && data.length > 0) {
      return data.map(dbFacilityToFacility)
    }

    // Fall back to server if Supabase returned an empty list (possible RLS or env issue)
    try {
      const resp = await fetch(`/api/facilities${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Server returned ${resp.status}`);
      }
      const serverData = await resp.json();
      if (Array.isArray(serverData) && serverData.length > 0) {
        return serverData.map((f: any) => dbFacilityToFacility({
          id: f.id,
          name: f.name,
          address: f.address,
          phone: f.phone,
          email: f.email,
          office_manager_email: f.office_manager_email,
          created_at: f.created_at,
          status: f.status,
          unique_code: f.unique_code,
          company_id: (f as any).company_id,
        }));
      }

      // Dev-only final fallback to mock facilities so the UI remains usable
      if (process.env.NODE_ENV !== 'production') {
        return mockFacilities;
      }

      return [];
    } catch (fallbackNoDataErr) {
      if (process.env.NODE_ENV !== 'production') {
        return mockFacilities;
      }
      throw fallbackNoDataErr
    }
  } catch (error) {
    try {
      const resp = await fetch(`/api/facilities${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ''}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || `Server returned ${resp.status}`);
      }
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((f: any) => dbFacilityToFacility({
          id: f.id,
          name: f.name,
          address: f.address,
          phone: f.phone,
          email: f.email,
          office_manager_email: f.office_manager_email,
          created_at: f.created_at,
          status: f.status,
          unique_code: f.unique_code,
          company_id: (f as any).company_id,
        }));
      }
      if (process.env.NODE_ENV !== 'production') {
        return mockFacilities;
      }
      return [];
    } catch (fallbackErr) {
      if (process.env.NODE_ENV !== 'production') {
        return mockFacilities;
      }
      throw fallbackErr
    }
  }
}

export async function getFacilityById(id: string) {
  
  
  try {
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return dbFacilityToFacility(data)
  } catch (error) {
    throw error
  }
}

// Resident functions
export async function createResident(residentData: Omit<Resident, 'id' | 'createdAt'>) {
  try {
    const { data, error } = await supabase
      .from('residents')
      .insert({
        resident_id: residentData.residentId,
        name: residentData.name,
        dob: residentData.dob,
        trust_balance: residentData.trustBalance,
        is_self_managed: residentData.isSelfManaged,
        linked_user_id: residentData.linkedUserId || null,
        ltc_unit: residentData.ltcUnit || null,
        status: residentData.status,
        facility_id: residentData.facilityId,
        bank_details: residentData.bankDetails || null,
        allowed_services: residentData.allowedServices,
        service_authorizations: residentData.serviceAuthorizations || null
      })
      .select()
      .single()

    if (error) throw error
    return dbResidentToResident(data)
  } catch (error) {
    throw error
  }
}

// Creates auth user (auth.users) via service key, inserts into public.users, links to resident, and emails POA to reset password
export async function createResidentWithLinkedUser(params: {
  resident: Omit<Resident, 'id' | 'createdAt' | 'linkedUserId'>;
  poa?: { email: string; name: string } | null;
  residentEmail?: string | null;
}): Promise<Resident> {
  const { resident, poa, residentEmail } = params;
  // 1) Create resident row first (no linked user yet)
  const createdResident = await createResident({ ...resident, linkedUserId: undefined });

  // If self-managed and resident email provided, create Resident user and link
  if (resident.isSelfManaged && residentEmail) {
    const email = residentEmail.trim().toLowerCase();
    const name = resident.name || email;

    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false
    });
    if (adminError || !adminUser?.user) {
      throw adminError || new Error('Failed to create Resident auth user');
    }

    const authUserId = adminUser.user.id;

    // Infer company from facility
    let companyId: string | null = null;
    try {
      const { data: facRow } = await supabaseAdmin
        .from('facilities')
        .select('company_id')
        .eq('id', resident.facilityId)
        .maybeSingle();
      companyId = (facRow as any)?.company_id || null;
    } catch (_) {}

    const { data: appUser, error: appUserError } = await (supabaseAdmin as any)
      .from('users')
      .insert({
        name,
        email,
        role: 'Resident',
        facility_id: resident.facilityId,
        auth_user_id: authUserId,
        ...(companyId ? { company_id: companyId } : {})
      })
      .select()
      .single();
    if (appUserError || !appUser) {
      throw appUserError || new Error('Failed to insert Resident into public.users');
    }

    const { error: linkError, data: linkedResident } = await supabaseAdmin
      .from('residents')
      .update({ linked_user_id: appUser.id })
      .eq('id', createdResident.id)
      .select()
      .single();
    if (linkError) {
      throw linkError;
    }

    const siteUrlEnv = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'https://trust1.netlify.app';
    const baseUrl = siteUrlEnv.replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');
    const redirectTo = `${baseUrl}/reset-password/resident/`;
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError) {
      throw resetError;
    }

    return dbResidentToResident(linkedResident as any);
  }

  // If POA-managed and POA email provided, create POA user and link
  if (!resident.isSelfManaged && poa && poa.email) {
    const email = poa.email.trim().toLowerCase();
    const name = poa.name || email;

    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false
    });
    if (adminError || !adminUser?.user) {
      throw adminError || new Error('Failed to create POA auth user');
    }

    const authUserId = adminUser.user.id;

    // Infer company from facility
    let companyId: string | null = null;
    try {
      const { data: facRow } = await supabaseAdmin
        .from('facilities')
        .select('company_id')
        .eq('id', resident.facilityId)
        .maybeSingle();
      companyId = (facRow as any)?.company_id || null;
    } catch (_) {}

    const { data: appUser, error: appUserError } = await (supabaseAdmin as any)
      .from('users')
      .insert({
        name,
        email,
        role: 'POA',
        facility_id: resident.facilityId,
        auth_user_id: authUserId,
        ...(companyId ? { company_id: companyId } : {})
      })
      .select()
      .single();
    if (appUserError || !appUser) {
      throw appUserError || new Error('Failed to insert POA into public.users');
    }

    const { error: linkError, data: linkedResident } = await supabaseAdmin
      .from('residents')
      .update({ linked_user_id: appUser.id })
      .eq('id', createdResident.id)
      .select()
      .single();
    if (linkError) {
      throw linkError;
    }

    const siteUrlEnv = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'https://trust1.netlify.app';
    const baseUrl = siteUrlEnv.replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');
    const redirectTo = `${baseUrl}/reset-password/resident/`;
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError) {
      throw resetError;
    }

    return dbResidentToResident(linkedResident as any);
  }

  // Otherwise, no email setup requested
  return createdResident;
}

// Create an Office Manager: first in auth.users, then in public.users (no emails sent)
export async function createOfficeManagerUser(
  facilityId: string,
  email: string,
  name?: string
): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1) Create auth user (no invite, no password email)
  const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password:'om123!',
    email_confirm: true
  });
  if (adminError || !adminUser?.user) {
    throw adminError || new Error('Failed to create Office Manager auth user');
  }

  const authUserId = adminUser.user.id;

  // 2) Insert into application users table
  const { data: appUser, error: appUserError } = await (supabaseAdmin as any)
    .from('users')
    .insert({
      name: name || normalizedEmail,
      email: normalizedEmail,
      role: 'OM',
      facility_id: facilityId,
      auth_user_id: authUserId,
      // Infer company from facility
      ...(await (async () => {
        try {
          const { data: facRow } = await supabaseAdmin
            .from('facilities')
            .select('company_id')
            .eq('id', facilityId)
            .maybeSingle();
          const cid = (facRow as any)?.company_id;
          return cid ? { company_id: cid } : {};
        } catch (_) {
          return {} as any;
        }
      })())
    })
    .select()
    .single();

  if (appUserError || !appUser) {
    throw appUserError || new Error('Failed to insert Office Manager into public.users');
  }

  return dbUserToUser(appUser);
}

// List all Office Managers from users table
export async function getOmUsers(companyId?: string): Promise<User[]> {
  try {
    let query = supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'OM')
      .order('created_at', { ascending: true }) as any;
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(dbUserToUser);
  } catch (error) {
    throw error;
  }
}

// Clear facility assignment for a user (deny OM access by removing facility)
export async function clearFacilityForUser(userId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ facility_id: null })
      .eq('id', userId);
    if (error) throw error;
  } catch (error) {
    throw error;
  }
}

// Sends a role-based reset password email using Supabase (admin or anon as available)
export async function sendRoleBasedResetPasswordEmail(params: { email: string; role: 'OM' | 'POA' | 'Resident' | 'Vendor'; siteUrl?: string }) {
  const email = params.email.trim().toLowerCase();
  const roleNorm = params.role;
  const envSite = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'https://trust1.netlify.app';
  const baseUrl = (params.siteUrl || envSite).replace(/\/$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');
  const redirectPath = roleNorm === 'OM'
    ? '/reset-password/om'
    : roleNorm === 'Vendor'
      ? '/reset-password/vendor'
      : '/reset-password/resident/';
  const redirectTo = `${baseUrl}${redirectPath}`;

  // Prefer admin client if available in this module; fallback to public supabase
  const client: any = (supabaseAdmin as any) || (supabase as any);
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
  return { success: true } as const;
}

export async function getResidentsByFacility(facilityId: string): Promise<Resident[]> {
  try {
    // Guard against invalid UUIDs to prevent 400 errors from PostgREST
    const isValidUuid = (value: string | undefined): boolean => {
      if (!value) return false;
      return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
    };
    if (!isValidUuid(facilityId)) {
      return [];
    }

    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .eq('facility_id', facilityId)
      .order('name');
      
    if (error) throw error;
    
    return data.map(dbResidentToResident);
  } catch (error) {
    throw error;
  }
}

export async function getAllResidents(): Promise<Resident[]> {
  try {
    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .order('name');
      
    if (error) throw error;
    
    return data.map(dbResidentToResident);
  } catch (error) {
    throw error;
  }
}

export async function getResidentById(id: string) {
  try {
    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return dbResidentToResident(data)
  } catch (error) {
    throw error
  }
}

export async function updateResident(id: string, updates: Partial<Resident>) {
  try {
    const dbUpdates: Partial<Tables['residents']['Update']> = {}
    
    if (updates.name !== undefined) dbUpdates.name = updates.name
    if (updates.trustBalance !== undefined) dbUpdates.trust_balance = updates.trustBalance
    if (updates.isSelfManaged !== undefined) dbUpdates.is_self_managed = updates.isSelfManaged
    if (updates.ltcUnit !== undefined) dbUpdates.ltc_unit = updates.ltcUnit
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.bankDetails !== undefined) dbUpdates.bank_details = updates.bankDetails
    if (updates.allowedServices !== undefined) dbUpdates.allowed_services = updates.allowedServices
    if (updates.serviceAuthorizations !== undefined) dbUpdates.service_authorizations = updates.serviceAuthorizations

    const { data, error } = await supabase
      .from('residents')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return dbResidentToResident(data)
  } catch (error) {
    throw error
  }
}

export async function getTotalTrustBalances(facilityId: string): Promise<number> {
  const { data, error } = await supabase
    .from("residents")
    .select("trust_balance", { head: false }) // fetch balances
    .eq("facility_id", facilityId);

  if (error) {
    return 0;
  }

  return (data as Array<{ trust_balance: number | null }>).reduce((total: number, r) => total + (r.trust_balance ?? 0), 0);
}

// Transaction functions
export async function createTransaction(transactionData: Omit<Transaction, 'id' | 'timestamp'>) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        resident_id: transactionData.residentId,
        facility_id: transactionData.facilityId,
        type: transactionData.type,
        amount: transactionData.amount,
        method: transactionData.method,
        description: transactionData.description,
        created_by: transactionData.createdBy
      })
      .select()
      .single()

    if (error) throw error

    // Update resident balance
    const balanceUpdate = transactionData.type === 'credit' ? transactionData.amount : -transactionData.amount

    // Try preferred RPC name first; fall back to alternate name; finally direct update
    let rpcSucceeded = false
    try {
      const { error: rpcErrorA } = await supabase.rpc('adjust_resident_balance', {
        p_resident_id: transactionData.residentId,
        p_amount: balanceUpdate
      })
      if (!rpcErrorA) {
        rpcSucceeded = true
      }
    } catch (_) {
      // ignore, try next approach
    }

    if (!rpcSucceeded) {
      const { error: rpcErrorB } = await supabase.rpc('update_resident_balance', {
        resident_id: transactionData.residentId,
        amount_change: balanceUpdate
      })
      if (!rpcErrorB) {
        rpcSucceeded = true
      }
    }

    if (!rpcSucceeded) {
      // Fallback: perform direct update safely
      const { data: residentRow, error: residentFetchError } = await supabase
        .from('residents')
        .select('trust_balance')
        .eq('id', transactionData.residentId)
        .single()
      if (residentFetchError) throw residentFetchError
      const currentBalance = Number(residentRow?.trust_balance || 0)
      const newBalance = currentBalance + balanceUpdate
      const { error: directUpdateError } = await supabase
        .from('residents')
        .update({ trust_balance: newBalance })
        .eq('id', transactionData.residentId)
      if (directUpdateError) throw directUpdateError
    }

    return dbTransactionToTransaction(data)
  } catch (error) {
    throw error
  }
}

export async function getTransactionsByResident(residentId: string) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('resident_id', residentId)
      .order('timestamp', { ascending: false })

    if (error) throw error
    return data.map(dbTransactionToTransaction)
  } catch (error) {
    throw error
  }
}

export async function getTransactionsByFacility(facilityId: string, limit?: number) {
  try {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('facility_id', facilityId)
      .order('timestamp', { ascending: false })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data.map(dbTransactionToTransaction)
  } catch (error) {
    throw error
  }
}

// Add resident withdrawal record in separate table
export async function recordResidentWithdrawal(params: {
  residentId: string
  facilityId: string
  amount: number
  method: 'cash' | 'cheque'
  description: string
  withdrawnBy: string
}) {
  try {
    const { error } = await supabase
      .from('resident_withdrawals')
      .insert({
        resident_id: params.residentId,
        facility_id: params.facilityId,
        amount: params.amount,
        method: params.method,
        description: params.description,
        withdrawn_by: params.withdrawnBy,
      });

    if (error) throw error;
  } catch (error) {
    throw error;
  }
}

// Fetch resident withdrawals for reporting
export async function getResidentWithdrawalsByFacility(params: {
  facilityId: string;
  startDate?: string; // ISO string inclusive
  endDate?: string;   // ISO string inclusive
  method?: 'cash' | 'cheque';
}) {
  try {
    let query = supabase
      .from('resident_withdrawals')
      .select('*')
      .eq('facility_id', params.facilityId)
      .order('created_at', { ascending: false });

    if (params.startDate) {
      query = query.gte('created_at', params.startDate);
    }
    if (params.endDate) {
      query = query.lte('created_at', params.endDate);
    }
    if (params.method) {
      query = query.eq('method', params.method);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    return [];
  }
}

// Service batch functions
export async function createServiceBatch(batchData: Omit<ServiceBatch, 'id' | 'createdAt' | 'items'>) {
  try {
    const { data, error } = await supabase
      .from('service_batches')
      .insert({
        facility_id: batchData.facilityId,
        service_type: batchData.serviceType,
        status: batchData.status,
        created_by: batchData.createdBy,
        total_amount: batchData.totalAmount,
        processed_count: batchData.processedCount
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    throw error
  }
}

export async function getServiceBatchesByFacility(facilityId: string) {
  try {
    const { data, error } = await supabase
      .from('service_batches')
      .select(`
        *,
        service_batch_items (*)
      `)
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data?.map(dbServiceBatchToServiceBatch) || []
  } catch (error) {
    throw error
  }
}

export async function getServiceBatchById(batchId: string) {
  try {
    const { data, error } = await supabase
      .from('service_batches')
      .select(`
        *,
        service_batch_items (*)
      `)
      .eq('id', batchId)
      .single()

    if (error) throw error
    return data ? dbServiceBatchToServiceBatch(data) : null
  } catch (error) {
    throw error
  }
}

export async function addResidentToServiceBatch(batchId: string, residentId: string, amount: number) {
  try {
    // First check if item already exists
    const { data: existingItem } = await supabase
      .from('service_batch_items')
      .select('id')
      .eq('batch_id', batchId)
      .eq('resident_id', residentId)
      .maybeSingle()

    if (existingItem) {
      // Update existing item
      const { data, error } = await supabase
        .from('service_batch_items')
        .update({ amount })
        .eq('id', existingItem.id)
        .select()
        .maybeSingle()

      if (error) throw error
      await updateBatchTotals(batchId)
      return data
    } else {
      // Create new item
      const { data, error } = await supabase
        .from('service_batch_items')
        .insert({
          batch_id: batchId,
          resident_id: residentId,
          amount,
          status: 'pending'
        })
        .select()
        .maybeSingle()

      if (error) throw error
      await updateBatchTotals(batchId)
      return data
    }
  } catch (error) {
    throw error
  }
}

export async function removeResidentFromServiceBatch(batchId: string, residentId: string) {
  try {
    const { error } = await supabase
      .from('service_batch_items')
      .delete()
      .eq('batch_id', batchId)
      .eq('resident_id', residentId)

    if (error) throw error
    await updateBatchTotals(batchId)
  } catch (error) {
    throw error
  }
}

export async function updateServiceBatchItem(batchId: string, residentId: string, amount: number) {
  try {
    const { data, error } = await supabase
      .from('service_batch_items')
      .update({ amount })
      .eq('batch_id', batchId)
      .eq('resident_id', residentId)
      .select()
      .maybeSingle()

    if (error) throw error
    await updateBatchTotals(batchId)
    return data
  } catch (error) {
    throw error
  }
}

export async function postServiceBatch(batchId: string, postedBy: string, chequeNumber?: string) {
  try {
    // Get batch with items
    const batch = await getServiceBatchById(batchId)
    if (!batch || batch.status !== 'open') {
      throw new Error('Batch not found or already posted')
    }

    let processedCount = 0
    const processedItems = []

    // Process each item
    for (const item of batch.items) {
      try {
        // Get resident current balance
        const { data: resident } = await supabase
          .from('residents')
          .select('trust_balance')
          .eq('id', item.residentId)
          .single()

        if (!resident || resident.trust_balance < item.amount) {
          // Mark as failed
          await supabase
            .from('service_batch_items')
            .update({
              status: 'failed',
              error_message: 'Insufficient funds'
            })
            .eq('id', item.id)
          
          processedItems.push({ ...item, status: 'failed', error_message: 'Insufficient funds' })
          continue
        }

        // Create transaction
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            resident_id: item.residentId,
            facility_id: batch.facilityId,
            type: 'debit',
            amount: item.amount,
            method: 'manual',
            description: `${getServiceTypeLabel(batch.serviceType)} - Batch Payment #${batch.id}${chequeNumber ? ` (Cheque ${chequeNumber})` : ''}`,
            created_by: postedBy
          })

        if (transactionError) {
          throw transactionError
        }

        // Update resident balance
        const { error: balanceError } = await supabase.rpc('adjust_resident_balance', {
          p_resident_id: item.residentId,
          p_amount: -item.amount
        })

        if (balanceError) {
          throw balanceError
        }

        // Mark item as processed
        await supabase
          .from('service_batch_items')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id)

        processedCount++
        processedItems.push({ ...item, status: 'processed' })
      } catch (error) {
      }
    }

    // Update batch status and totals
    await supabase
      .from('service_batches')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        posted_by: postedBy,
        processed_count: processedCount
      })
      .eq('id', batchId)

    await updateBatchTotals(batchId)

    // Optionally store cheque number in a dedicated column if it exists
    if (chequeNumber) {
      try {
        await supabase
          .from('service_batches')
          .update({ cheque_number: chequeNumber as any })
          .eq('id', batchId)
      } catch (e: any) {
      }
    }
  } catch (error) {
    throw error
  }
}

// Delete an open service batch and its items
export async function deleteServiceBatch(batchId: string) {
  try {
    // Remove items first to satisfy FK constraints
    const { error: itemsError } = await supabase
      .from('service_batch_items')
      .delete()
      .eq('batch_id', batchId)

    if (itemsError) throw itemsError

    // Delete the batch only if it is still open
    const { error: batchError } = await supabase
      .from('service_batches')
      .delete()
      .eq('id', batchId)
      .eq('status', 'open')

    if (batchError) throw batchError
  } catch (error) {
    throw error
  }
}

async function updateBatchTotals(batchId: string) {
  // Recalculate totals for a service batch
  const { data: items, error } = await supabase
    .from('service_batch_items')
    .select('amount')
    .eq('batch_id', batchId)

  if (error) throw error

  const totalAmount = (items as Array<{ amount: number | null }> | null || []).reduce((sum: number, i) => sum + (i.amount || 0), 0)

  await supabase
    .from('service_batches')
    .update({ total_amount: totalAmount })
    .eq('id', batchId)
}

// Helpers
function getServiceTypeLabel(serviceType: ServiceBatch['serviceType']) {
  const labels: Record<ServiceBatch['serviceType'], string> = {
    haircare: 'Hair Care',
    footcare: 'Foot Care',
    pharmacy: 'Pharmacy',
    cable: 'Cable TV',
    wheelchairRepair: 'Wheelchair Repair',
    miscellaneous: 'Miscellaneous'
  }
  return labels[serviceType]
}

// =============================
// Invoices: DB conversions
// =============================
function dbInvoiceItemToInvoiceItem(dbItem: any): InvoiceItem {
  return {
    id: dbItem.id,
    invoiceId: dbItem.invoice_id,
    residentId: dbItem.resident_id,
    amount: dbItem.amount,
    description: dbItem.description,
    createdAt: dbItem.created_at,
    updatedAt: dbItem.updated_at || undefined,
  }
}

function dbInvoiceToInvoice(dbInvoice: any): Invoice {
  return {
    id: dbInvoice.id,
    facilityId: dbInvoice.facility_id,
    vendorUserId: dbInvoice.vendor_user_id,
    status: dbInvoice.status,
    omNotes: dbInvoice.om_notes || undefined,
    createdAt: dbInvoice.created_at,
    updatedAt: dbInvoice.updated_at || undefined,
    submittedAt: dbInvoice.submitted_at || undefined,
    paidAt: dbInvoice.paid_at || undefined,
    paidBy: dbInvoice.paid_by || undefined,
    items: (dbInvoice.invoice_items || []).map(dbInvoiceItemToInvoiceItem),
    invoice_no: dbInvoice.invoice_no || 0, 
    vendorName: dbInvoice.vendor_name || undefined,
    vendorAddress: dbInvoice.vendor_address || undefined,
    vendorEmail: dbInvoice.vendor_email || undefined,
    invoiceDate: dbInvoice.invoice_date || undefined,
  }
}

// =============================
// Invoices: DB functions
// =============================
export async function getFacilitiesForVendor(vendorUserId: string): Promise<Facility[]> {
  const { data: links, error } = await supabase
    .from('vendor_facilities')
    .select('facility_id')
    .eq('vendor_user_id', vendorUserId)

  if (error) throw error
  const facilityIds = (links || []).map((l: any) => l.facility_id)
  if (facilityIds.length === 0) return []
  const { data: facilitiesData, error: facErr } = await supabase
    .from('facilities')
    .select('*')
    .in('id', facilityIds)
    .order('name')
  if (facErr) throw facErr
  return facilitiesData.map(dbFacilityToFacility as any)
}

export async function linkVendorToFacility(vendorUserId: string, facilityId: string): Promise<void> {
  const { error } = await supabase
    .from('vendor_facilities')
    .insert({ vendor_user_id: vendorUserId, facility_id: facilityId })
  if (error) throw error
}

export async function createInvoiceDb(facilityId: string, vendorUserId: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert({ facility_id: facilityId, vendor_user_id: vendorUserId, status: 'open', invoice_date: new Date().toISOString() })
    .select('*')
    .single()
  if (error) throw error
  return dbInvoiceToInvoice({ ...data, invoice_items: [] })
}

export async function getInvoicesByVendorDb(vendorUserId: string, facilityId?: string): Promise<Invoice[]> {
  let query = supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('vendor_user_id', vendorUserId)
    .order('created_at', { ascending: false })
  if (facilityId) query = query.eq('facility_id', facilityId)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map(dbInvoiceToInvoice)
}

export async function getInvoicesByFacilityDb(facilityId: string, status?: 'open' | 'submitted' | 'paid'): Promise<Invoice[]> {
  let query = supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map(dbInvoiceToInvoice)
}

export async function addInvoiceItemDb(invoiceId: string, residentId: string, amount: number, description: string): Promise<InvoiceItem> {
  const { data, error } = await supabase
    .from('invoice_items')
    .insert({ invoice_id: invoiceId, resident_id: residentId, amount, description })
    .select('*')
    .single()
  if (error) throw error
  return dbInvoiceItemToInvoiceItem(data)
}

export async function updateInvoiceItemDb(invoiceId: string, itemId: string, updates: Partial<{ amount: number; description: string; residentId: string }>): Promise<InvoiceItem> {
  const { data, error } = await supabase
    .from('invoice_items')
    .update({
      amount: updates.amount as number | undefined,
      description: updates.description as string | undefined,
      resident_id: updates.residentId as string | undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('invoice_id', invoiceId)
    .select('*')
    .single()
  if (error) throw error
  return dbInvoiceItemToInvoiceItem(data)
}

export async function removeInvoiceItemDb(invoiceId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('invoice_items')
    .delete()
    .eq('id', itemId)
    .eq('invoice_id', invoiceId)
  if (error) throw error
}

export async function submitInvoiceDb(invoiceId: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select('*, invoice_items(*)')
    .single()
  if (error) throw error
  return dbInvoiceToInvoice(data)
}

export async function updateInvoiceOmNotesDb(invoiceId: string, omNotes: string): Promise<Invoice> {
  // Fetch current status to prevent editing notes after paid
  const { data: current, error: readErr } = await supabase
    .from('invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .single()
  if (readErr) throw readErr
  if (current?.status === 'paid') {
    throw new Error('Cannot update notes: invoice is already paid.')
  }
  const { data, error } = await supabase
    .from('invoices')
    .update({ om_notes: omNotes, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select('*, invoice_items(*)')
    .single()
  if (error) throw error
  return dbInvoiceToInvoice(data)
}

export async function markInvoicePaidDb(invoiceId: string, paidBy: string, omNotes?: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString(), paid_by: paidBy, updated_at: new Date().toISOString(), om_notes: omNotes ?? undefined })
    .eq('id', invoiceId)
    .select('*, invoice_items(*)')
    .single()
  if (error) throw error
  return dbInvoiceToInvoice(data)
}

export async function updateInvoiceVendorDetailsDb(
  invoiceId: string,
  details: Partial<{ vendorName: string; vendorAddress: string; vendorEmail: string; invoiceDate: string }>
): Promise<Invoice> {
  const updatePayload: any = { updated_at: new Date().toISOString() };
  if (typeof details.vendorName !== 'undefined') {
    updatePayload.vendor_name = (details.vendorName ?? null);
  }
  if (typeof details.vendorAddress !== 'undefined') {
    updatePayload.vendor_address = (details.vendorAddress ?? null);
  }
  if (typeof details.vendorEmail !== 'undefined') {
    updatePayload.vendor_email = (details.vendorEmail ?? null);
  }
  if (typeof details.invoiceDate !== 'undefined') {
    // Normalize to YYYY-MM-DD for date column
    const d = details.invoiceDate ? String(details.invoiceDate).slice(0, 10) : null;
    updatePayload.invoice_date = d as any;
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updatePayload)
    .eq('id', invoiceId)
    .select('*, invoice_items(*)')
    .single()
  if (error) throw error
  return dbInvoiceToInvoice(data)
}

// =============================
// Deposit batch: DB conversions
// =============================
function dbDepositBatchToDepositBatch(dbBatch: any) {
  return {
    id: dbBatch.id,
    facilityId: dbBatch.facility_id,
    status: dbBatch.status === 'posted' ? 'closed' : 'open',
    description: dbBatch.notes || '',
    totalAmount: dbBatch.total_amount || 0,
    totalCash: dbBatch.total_cash ?? (dbBatch.total_cash_amount || 0),
    totalCheques: dbBatch.total_cheque ?? (dbBatch.total_cheque_amount || 0),
    createdAt: dbBatch.created_at,
    createdBy: dbBatch.initiated_by,
    closedAt: dbBatch.completed_at || undefined,
    closedBy: dbBatch.processed_by || undefined,
    community_dbatch_number: dbBatch.community_dbatch_number || 0, 
    entries: (dbBatch.deposit_batch_entries || []).map(dbDepositBatchEntryToDepositBatchEntry)
  } as const
}

function dbDepositBatchEntryToDepositBatchEntry(dbItem: any) {
  return {
    id: dbItem.id,
    residentId: dbItem.resident_id,
    amount: dbItem.amount,
    method: dbItem.method,
    description: dbItem.description || undefined,
    chequeNumber: dbItem.cheque_number || undefined,
    status: dbItem.status === 'processed' ? 'processed' : 'pending',
    processedAt: dbItem.processed_at || undefined
  } as const
}

// =============================
// Deposit batch: DB functions
// =============================
export async function createDepositBatchDb(
  facilityId: string,
  initiatedBy: string,
  entries: Array<{ residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>,
  notes?: string
) {
  // Create batch
  const { data: batch, error: batchError } = await supabase
    .from('deposit_batches')
    .insert({
      facility_id: facilityId,
      batch_number: `DB-${Date.now()}`,
      total_amount: entries.reduce((s, e) => s + e.amount, 0),
      status: 'open',
      initiated_by: initiatedBy,
      processed_by: null,
      notes: notes || null
    })
    .select()
    .single()

  if (batchError) throw batchError

  // Insert entries
  if (entries.length > 0) {
    const { error: itemsError } = await supabase
      .from('deposit_batch_entries')
      .insert(entries.map((e) => ({
        batch_id: batch.id,
        resident_id: e.residentId,
        amount: e.amount,
        method: e.method,
        description: e.description || null,
        cheque_number: e.chequeNumber || null,
        status: 'pending'
      })))

    if (itemsError) throw itemsError
  }

  // Optionally return hydrated batch
  const created = await getDepositBatchByIdDb(batch.id)
  return created
}

export async function getDepositBatchesByFacilityDb(facilityId: string) {
  const { data, error } = await supabase
    .from('deposit_batches')
    .select(`
      *,
      deposit_batch_entries (*)
    `)
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(dbDepositBatchToDepositBatch)
}

export async function getDepositBatchByIdDb(batchId: string) {
  const { data, error } = await supabase
    .from('deposit_batches')
    .select(`
      *,
      deposit_batch_entries (*)
    `)
    .eq('id', batchId)
    .single()

  if (error) throw error
  return data ? dbDepositBatchToDepositBatch(data) : null
}

export async function addEntryToDepositBatchDb(
  batchId: string,
  entry: { residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }
) {
  const { data, error } = await supabase
    .from('deposit_batch_entries')
    .insert({
      batch_id: batchId,
      resident_id: entry.residentId,
      amount: entry.amount,
      method: entry.method,
      description: entry.description || null,
      cheque_number: entry.chequeNumber || null,
      status: 'pending'
    })
    .select()
    .single()

  if (error) throw error
  await updateDepositBatchTotalsDb(batchId)
  return data
}

export async function updateDepositBatchEntryDb(
  batchId: string,
  entryId: string,
  updates: Partial<{ amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>
) {
  const { data, error } = await supabase
    .from('deposit_batch_entries')
    .update({
      amount: updates.amount as number | undefined,
      method: updates.method as any,
      description: updates.description ?? undefined,
      cheque_number: updates.chequeNumber ?? undefined
    })
    .eq('id', entryId)
    .eq('batch_id', batchId)
    .select()
    .single()

  if (error) throw error
  await updateDepositBatchTotalsDb(batchId)
  return data
}

export async function removeEntryFromDepositBatchDb(batchId: string, entryId: string) {
  const { data, error } = await supabase
    .from('deposit_batch_entries')
    .delete()
    .eq('id', entryId)
    .eq('batch_id', batchId)
  .select('*')
  
 
  if (error) {
  throw error
}
  await updateDepositBatchTotalsDb(batchId)
}

export async function postDepositBatchDb(batchId: string, processedBy: string) {
  // Load batch
  const batch = await getDepositBatchByIdDb(batchId)
  if (!batch) throw new Error('Batch not found')
  if (batch.status !== 'open') throw new Error('Batch already processed')

  // Process each pending entry
  for (const entry of batch.entries) {
    if (entry.status === 'processed') continue

    // Create transaction (credit)
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        resident_id: entry.residentId,
        facility_id: batch.facilityId,
        type: 'credit',
        amount: entry.amount,
        method: entry.method,
        description: entry.description || `Deposit Batch #${batch.id}`,
        created_by: processedBy
      })

    if (transactionError) throw transactionError

    // Update resident balance via RPC, fallback to direct update if RPC is unavailable
    const { error: balanceError } = await supabase.rpc('adjust_resident_balance', {
      p_resident_id: entry.residentId,
      p_amount: entry.amount
    })
    if (balanceError) {
      const { data: residentRow, error: residentFetchError } = await supabase
        .from('residents')
        .select('trust_balance')
        .eq('id', entry.residentId)
        .single()
      if (residentFetchError) throw balanceError
      const currentBalance = Number(residentRow?.trust_balance || 0)
      const newBalance = currentBalance + entry.amount
      const { error: fallbackUpdateError } = await supabase
        .from('residents')
        .update({ trust_balance: newBalance })
        .eq('id', entry.residentId)
      if (fallbackUpdateError) throw fallbackUpdateError
    }

    // Mark entry processed
    const { error: entryError } = await supabase
      .from('deposit_batch_entries')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('id', entry.id)

    if (entryError) throw entryError
  }

  // Mark batch posted/closed
  const { error: batchError } = await supabase
    .from('deposit_batches')
    .update({ status: 'posted', processed_by: processedBy, completed_at: new Date().toISOString() })
    .eq('id', batchId)

  if (batchError) throw batchError

  // Recalculate totals (if needed)
  await updateDepositBatchTotalsDb(batchId)
}

// Delete an open deposit batch and its entries
export async function deleteDepositBatchDb(batchId: string) {
  // Ensure batch is open
  const batch = await getDepositBatchByIdDb(batchId)
  if (!batch) throw new Error('Batch not found')
  if (batch.status !== 'open') throw new Error('Only open batches can be deleted')

  // Delete entries first due to FK
  const { error: entriesError } = await supabase
    .from('deposit_batch_entries')
    .delete()
    .eq('batch_id', batchId)

  // Even if deleting entries fails due to RLS, attempt deleting the batch in case FK is ON DELETE CASCADE
  const { error: batchError } = await supabase
    .from('deposit_batches')
    .delete()
    .eq('id', batchId)

  // If both operations failed, surface the more specific entries error; otherwise surface whichever failed
  if (entriesError && batchError) {
    throw entriesError
  }
  if (batchError) {
    throw batchError
  }
}

async function updateDepositBatchTotalsDb(batchId: string) {
  const { data: items, error } = await supabase
    .from('deposit_batch_entries')
    .select('amount, method')
    .eq('batch_id', batchId)

  if (error) throw error
  const list = (items as Array<{ amount: number; method: 'cash' | 'cheque' }> | null) || []
  const totalAmount = list.reduce((s: number, i) => s + (i.amount || 0), 0)
  const totalCash = list.filter(i => i.method === 'cash').reduce((s: number, i) => s + (i.amount || 0), 0)
  const totalCheques = totalAmount - totalCash

  const { error: upError } = await supabase
    .from('deposit_batches')
    .update({ total_amount: totalAmount, total_cash: totalCash, total_cheque: totalCheques })
    .eq('id', batchId)

  if (upError) throw upError
}

// Real-time subscriptions
export function subscribeToResidentChanges(facilityId: string, callback: (resident: Resident) => void) {
  return supabase
    .channel('residents_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'residents',
        filter: `facility_id=eq.${facilityId}`
      },
      (payload: any) => {
        if (payload.new) {
          callback(dbResidentToResident(payload.new as Tables['residents']['Row']))
        }
      }
    )
    .subscribe()
}

export function subscribeToTransactionChanges(facilityId: string, callback: (transaction: Transaction) => void) {
  return supabase
    .channel('transactions_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `facility_id=eq.${facilityId}`
      },
      (payload: any) => {
        if (payload.new) {
          callback(dbTransactionToTransaction(payload.new as Tables['transactions']['Row']))
        }
      }
    )
    .subscribe()
}

// Subscribe to service batch changes
export function subscribeToServiceBatchChanges(facilityId: string, onChange: () => void) {
  return supabase
    .channel('service_batches_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_batches',
        filter: `facility_id=eq.${facilityId}`
      },
      () => {
        onChange();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_batch_items',
        // Join via batches for this facility; we filter by related batch ids using a subquery is not supported
        // so we rely on any change to items to trigger reload in client
      },
      () => {
        onChange();
      }
    )
    .subscribe();
}

// User and invitation functions for residents and POA
export async function createSignupInvitationForResident(
  residentData: {
    email: string;
    name: string;
    facilityId: string;
    isSelfManaged: boolean;
    poaEmail?: string;
    poaName?: string;
    residentId?: string;
  },
  invitedBy: string
): Promise<{ residentInvitation?: SignupInvitation; poaInvitation?: SignupInvitation }> {
  try {
    const invitations: { residentInvitation?: SignupInvitation; poaInvitation?: SignupInvitation } = {};
    
    // Create invitation for self-managed resident
    if (residentData.isSelfManaged && residentData.email) {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const { data: residentInvitationData, error: residentInvitationError } = await supabase
        .from('signup_invitations')
        .insert({
          facility_id: residentData.facilityId,
          email: residentData.email,
          role: 'Resident',
          invited_by: invitedBy,
          token,
          expires_at: expiresAt.toISOString(),
          resident_id: residentData.residentId || null
        })
        .select()
        .single();

      if (residentInvitationError) throw residentInvitationError;
      
      invitations.residentInvitation = {
        id: residentInvitationData.id,
        facilityId: residentInvitationData.facility_id,
        email: residentInvitationData.email,
        role: residentInvitationData.role as 'Resident',
        invitedBy: residentInvitationData.invited_by,
        invitedAt: residentInvitationData.invited_at,
        status: residentInvitationData.status as 'pending',
        token: residentInvitationData.token,
        expiresAt: residentInvitationData.expires_at,
        residentId: residentInvitationData.resident_id || undefined
      };
    }
    
    // Create invitation for POA
    if (!residentData.isSelfManaged && residentData.poaEmail && residentData.poaName) {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const { data: poaInvitationData, error: poaInvitationError } = await supabase
        .from('signup_invitations')
        .insert({
          facility_id: residentData.facilityId,
          email: residentData.poaEmail,
          role: 'POA',
          invited_by: invitedBy,
          token,
          expires_at: expiresAt.toISOString(),
          resident_id: residentData.residentId || null
        })
        .select()
        .single();

      if (poaInvitationError) throw poaInvitationError;
      
      invitations.poaInvitation = {
        id: poaInvitationData.id,
        facilityId: poaInvitationData.facility_id,
        email: poaInvitationData.email,
        role: poaInvitationData.role as 'POA',
        invitedBy: poaInvitationData.invited_by,
        invitedAt: poaInvitationData.invited_at,
        status: poaInvitationData.status as 'pending',
        token: poaInvitationData.token,
        expiresAt: poaInvitationData.expires_at,
        residentId: poaInvitationData.resident_id || undefined
      };
    }

    return invitations;
  } catch (error) {
    throw error;
  }
}

export async function createSignupInvitation(
  facilityId: string,
  email: string,
  role: 'OM' | 'POA' | 'Resident',
  invitedBy: string
): Promise<SignupInvitation> {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('signup_invitations')
    .insert({
      facility_id: facilityId,
      email,
      role,
      invited_by: invitedBy,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    facilityId: data.facility_id,
    email: data.email,
    role: data.role as 'OM' | 'POA' | 'Resident',
    invitedBy: data.invited_by,
    invitedAt: data.invited_at,
    status: data.status as 'pending',
    token: data.token,
    expiresAt: data.expires_at,
  };
}

export async function sendInvitationEmail(invitation: SignupInvitation, facilityName: string): Promise<boolean> {
  try {
    // Use server endpoint to trigger Supabase invite email
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const apiBase = (process.env.VITE_API_BASE_URL || process.env.VITE_BACKEND_URL || 'https://trust-3.onrender.com').replace(/\/+$/, '');
    const resp = await fetch(`${apiBase}/api/auth/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: invitation.email,
        role: invitation.role,
        facilityId: invitation.facilityId,
        residentId: invitation.residentId,
        name: undefined,
        redirectTo: `${(process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'https://trust1.netlify.app').replace(/\/$/, '')}/confirm-signup/resident/`
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

export async function sendInviteByEmail(params: { email: string; role?: 'OM' | 'POA' | 'Resident'; facilityId?: string; residentId?: string; name?: string; redirectTo?: string }): Promise<boolean> {
  try {
    const { email, role, facilityId, residentId, name, redirectTo } = params || ({} as any);
    const apiBase = (process.env.VITE_API_BASE_URL || process.env.VITE_BACKEND_URL || 'https://trust-3.onrender.com').replace(/\/+$/, '');
    const resp = await fetch(`${apiBase}/api/auth/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, facilityId, residentId, name, redirectTo }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

// =============================
// Vendor management client calls
// =============================

export async function listVendorsForFacility(facilityId: string): Promise<Array<{ id: string; name: string; email: string }>> {
  // Primary: read vendors directly from users table scoped by facility_id
  const { data: vendors, error: usersErr } = await supabaseAdmin
    .from('users')
    .select('id, name, email')
    .eq('role', 'Vendor')
    .eq('facility_id', facilityId)
    .order('name', { ascending: true });
  if (usersErr) throw usersErr;
  if (vendors && vendors.length > 0) {
    return vendors.map((u: any) => ({ id: u.id, name: u.name, email: u.email }));
  }

  // Fallback: support legacy link table vendor_facilities if any
  try {
    const { data: links, error: linksErr } = await supabaseAdmin
      .from('vendor_facilities')
      .select('vendor_user_id')
      .eq('facility_id', facilityId);
    if (linksErr) return [];
    const vendorIds = (links || []).map((l: any) => l.vendor_user_id).filter(Boolean);
    if (vendorIds.length === 0) return [];
    const { data: usersRows, error: usersByIdErr } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .in('id', vendorIds);
    if (usersByIdErr) return [];
    return (usersRows || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email }));
  } catch (_) {
    return [];
  }
}

// Create a Vendor auth user and application profile, then link to a facility
export async function createVendorUserAndLink(
  facilityId: string,
  email: string,
  name?: string,
  password?: string
): Promise<User> {
  const normalizedEmail = email.trim().toLowerCase();

  // Attempt to find existing profile first
  const { data: existingProfile } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('role', 'Vendor')
    .maybeSingle();

  let authUserId: string | null = null;
  if (!existingProfile) {
    // Create auth user (no invite)
    const vendorPassword = password && password.length >= 6 ? password : 'vendor123!';
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: vendorPassword,
      email_confirm: true
    });
    if (adminError || !adminUser?.user) {
      throw adminError || new Error('Failed to create Vendor auth user');
    }
    authUserId = adminUser.user.id;
  } else {
    authUserId = existingProfile.auth_user_id as any;
  }

  // Infer company from facility
  let companyId: string | null = null;
  try {
    const { data: facRow } = await supabaseAdmin
      .from('facilities')
      .select('company_id')
      .eq('id', facilityId)
      .maybeSingle();
    companyId = (facRow as any)?.company_id || null;
  } catch (_) {}

  // Upsert application profile
  const { data: appUser, error: appUserErr } = await supabaseAdmin
    .from('users')
    .upsert({
      name: name || normalizedEmail,
      email: normalizedEmail,
      role: 'Vendor',
      facility_id: facilityId,
      auth_user_id: authUserId,
      ...(companyId ? { company_id: companyId } : {})
    }, { onConflict: 'email' })
    .select('*')
    .single();
  if (appUserErr || !appUser) {
    throw appUserErr || new Error('Failed to upsert Vendor in public.users');
  }

  // Link vendor to facility (idempotent best-effort)
  try {
    // Check existing link
    const { data: existingLink } = await supabaseAdmin
      .from('vendor_facilities')
      .select('id')
      .eq('vendor_user_id', appUser.id)
      .eq('facility_id', facilityId)
      .maybeSingle();
    if (!existingLink) {
      await supabaseAdmin
        .from('vendor_facilities')
        .insert({ vendor_user_id: appUser.id, facility_id: facilityId });
    }
  } catch (_) {}

  return dbUserToUser(appUser);
}

export async function createOrLinkVendor(params: { facilityId: string; email: string; name?: string; password?: string }) {
  const { facilityId, email, name, password } = params;
  const apiBase = (process.env.VITE_API_BASE_URL || process.env.VITE_BACKEND_URL || 'https://trust-3.onrender.com').replace(/\/+$/, '');
  const resp = await fetch(`${apiBase}/api/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facilityId, email, name, password }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Failed to create/link vendor (${resp.status})`);
  }
  return await resp.json();
}

// resetVendorPassword removed: temp password functionality discontinued

export async function unlinkVendorFromFacility(vendorUserId: string, facilityId: string) {
  const apiBase = (process.env.VITE_API_BASE_URL || process.env.VITE_BACKEND_URL || 'https://trust-3.onrender.com').replace(/\/+$/, '');
  const resp = await fetch(`${apiBase}/api/vendors/link?vendorUserId=${encodeURIComponent(vendorUserId)}&facilityId=${encodeURIComponent(facilityId)}`, {
    method: 'DELETE',
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error || `Failed to unlink vendor (${resp.status})`);
  }
  return await resp.json();
}

export async function linkResidentToUser(residentId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('residents')
      .update({ linked_user_id: userId })
      .eq('id', residentId);

    if (error) throw error;
  } catch (error) {
    throw error;
  }
}

// Conversion functions for pre-auth debits
function dbPreAuthDebitToPreAuthDebit(dbPreAuthDebit: Tables['pre_auth_debits']['Row']): PreAuthDebit {
  return {
    id: dbPreAuthDebit.id,
    residentId: dbPreAuthDebit.resident_id,
    facilityId: dbPreAuthDebit.facility_id,
    authorizedBy: dbPreAuthDebit.authorized_by,
    description: dbPreAuthDebit.description,
    authorizedDate: dbPreAuthDebit.authorized_date,
    targetMonth: dbPreAuthDebit.target_month,
    amount: dbPreAuthDebit.amount,
    type: dbPreAuthDebit.type,
    isActive: dbPreAuthDebit.is_active,
    createdAt: dbPreAuthDebit.created_at,
    processedAt: dbPreAuthDebit.processed_at,
    status: dbPreAuthDebit.status
  };
}

// Pre-Auth Debit functions
export async function createPreAuthDebit(preAuthDebitData: Omit<PreAuthDebit, 'id' | 'createdAt'>): Promise<PreAuthDebit> {
  try {
    const { data, error } = await supabase
      .from('pre_auth_debits')
      .insert({
        resident_id: preAuthDebitData.residentId,
        facility_id: preAuthDebitData.facilityId,
        authorized_by: preAuthDebitData.authorizedBy,
        description: preAuthDebitData.description,
        authorized_date: preAuthDebitData.authorizedDate,
        target_month: preAuthDebitData.targetMonth,
        amount: preAuthDebitData.amount,
        type: preAuthDebitData.type,
        is_active: preAuthDebitData.isActive,
        processed_at: preAuthDebitData.processedAt,
        status: preAuthDebitData.status
      })
      .select()
      .single();

    if (error) throw error;
    return dbPreAuthDebitToPreAuthDebit(data);
  } catch (error) {
    throw error;
  }
}

export async function getPreAuthDebitsByResident(residentId: string, month?: string): Promise<PreAuthDebit[]> {
  try {
    let query = supabase
      .from('pre_auth_debits')
      .select('*')
      .eq('resident_id', residentId)
      .eq('is_active', true);

    if (month) {
      query = query.eq('target_month', month);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(dbPreAuthDebitToPreAuthDebit);
  } catch (error) {
    throw error;
  }
}

export async function getPreAuthDebitsByFacility(facilityId: string, month?: string): Promise<PreAuthDebit[]> {
  try {
    let query = supabase
      .from('pre_auth_debits')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('is_active', true);

    if (month) {
      query = query.eq('target_month', month);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(dbPreAuthDebitToPreAuthDebit);
  } catch (error) {
    throw error;
  }
}

export async function updatePreAuthDebit(id: string, updates: Partial<PreAuthDebit>): Promise<PreAuthDebit> {
  try {
    const updateData: any = {};
    
    if (updates.residentId !== undefined) updateData.resident_id = updates.residentId;
    if (updates.facilityId !== undefined) updateData.facility_id = updates.facilityId;
    if (updates.authorizedBy !== undefined) updateData.authorized_by = updates.authorizedBy;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.authorizedDate !== undefined) updateData.authorized_date = updates.authorizedDate;
    if (updates.targetMonth !== undefined) updateData.target_month = updates.targetMonth;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.processedAt !== undefined) updateData.processed_at = updates.processedAt;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('pre_auth_debits')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return dbPreAuthDebitToPreAuthDebit(data);
  } catch (error) {
    throw error;
  }
}

// Monthly Pre-Auth Lists functions
function dbMonthlyPreAuthListToMonthlyPreAuthList(dbList: Tables['monthly_pre_auth_lists']['Row'], preAuthDebits: PreAuthDebit[]): MonthlyPreAuthList {
  const listAuthorizations = preAuthDebits.filter(debit => 
    debit.facilityId === dbList.facility_id && 
    debit.targetMonth === dbList.month &&
    debit.isActive
  );

  return {
    id: dbList.id,
    facilityId: dbList.facility_id,
    month: dbList.month,
    status: dbList.status as 'open' | 'closed',
    createdAt: dbList.created_at,
    closedAt: dbList.closed_at || undefined,
    closedBy: dbList.closed_by || undefined,
    authorizations: listAuthorizations,
    totalAmount: dbList.total_amount
  };
}

export async function createMonthlyPreAuthList(facilityId: string, month: string): Promise<MonthlyPreAuthList> {
  try {
    // Get all pre-auth debits for this facility and month
    const preAuthDebits = await getPreAuthDebitsByFacility(facilityId, month);
    const totalAmount = preAuthDebits.reduce((sum, debit) => sum + debit.amount, 0);

    const { data, error } = await supabase
      .from('monthly_pre_auth_lists')
      .insert({
        facility_id: facilityId,
        month: month,
        status: 'open',
        total_amount: totalAmount
      })
      .select()
      .single();

    if (error) throw error;
    return dbMonthlyPreAuthListToMonthlyPreAuthList(data, preAuthDebits);
  } catch (error) {
    throw error;
  }
}

export async function getMonthlyPreAuthList(facilityId: string, month: string): Promise<MonthlyPreAuthList | null> {
  try {
    const { data, error } = await supabase
      .from('monthly_pre_auth_lists')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('month', month)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No data found
      throw error;
    }

    const preAuthDebits = await getPreAuthDebitsByFacility(facilityId, month);
    return dbMonthlyPreAuthListToMonthlyPreAuthList(data, preAuthDebits);
  } catch (error) {
    throw error;
  }
}

export async function getFacilityMonthlyPreAuthLists(facilityId: string): Promise<MonthlyPreAuthList[]> {
  try {
    const { data, error } = await supabase
      .from('monthly_pre_auth_lists')
      .select('*')
      .eq('facility_id', facilityId)
      .order('month', { ascending: false });

    if (error) throw error;

    const allPreAuthDebits = await getPreAuthDebitsByFacility(facilityId);
    return data.map((list: any) => dbMonthlyPreAuthListToMonthlyPreAuthList(list, allPreAuthDebits));
  } catch (error) {
    throw error;
  }
}

export async function closeMonthlyPreAuthList(listId: string, closedBy: string): Promise<MonthlyPreAuthList> {
  try {
    const { data, error } = await supabase
      .from('monthly_pre_auth_lists')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: closedBy
      })
      .eq('id', listId)
      .select()
      .single();

    if (error) throw error;

    const preAuthDebits = await getPreAuthDebitsByFacility(data.facility_id, data.month);
    return dbMonthlyPreAuthListToMonthlyPreAuthList(data, preAuthDebits);
  } catch (error) {
    throw error;
  }
}


export async function updateCashBoxBalanceWithTransaction(
  facilityId: string,
  transactionType: 'withdrawal' | 'deposit',
  amount: number,
  description: string,
  residentId: string | null,
  userId: string,
  transactionId: string
): Promise<{ success: boolean; balance?: number; transaction?: any; error?: string }> {
  try {
    // Prefer new RPC name if available; fallback to legacy
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
    try {
      // Fallback to legacy RPC for environments where migration hasn't been applied
      const { data: legacyData, error: legacyError } = await supabase.rpc('update_cash_box_with_transaction', {
        p_facility_id: facilityId,
        p_transaction_type: transactionType,
        p_amount: amount,
        p_description: description,
        p_resident_id: residentId,
        p_user_id: userId,
        p_transaction_id: transactionId
      });
      if (legacyError) throw legacyError;
      return legacyData as any;
    } catch (fallbackErr) {
      return { success: false, error: fallbackErr instanceof Error ? fallbackErr.message : 'Unknown error' };
    }
  }
}

export async function resetCashBoxToMonthly(
  facilityId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('reset_cash_box_monthly', {
      p_facility_id: facilityId,
      p_user_id: userId
    });

    if (error) throw error;

    return data;
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

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
    return [];
  }
}

// Get cash box transactions by month/year via RPC (frontend should not call supabase.rpc directly)
export async function getCashBoxTransactionsByMonthYear(
  facilityId: string,
  month: number,
  year: number
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('get_cash_box_transactions_by_month_year', {
      p_facility_id: facilityId,
      p_month: month,
      p_year: year
    });
    if (error) throw error;
    return data || [];
  } catch (error) {
    return [];
  }
}

// Subscribe to cash box balance changes
export function subscribeToCashBoxChanges(
  facilityId: string,
  onUpdate: (balance: number) => void
) {
  return supabase
    .channel(`cash_box_${facilityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cash_box_balances',
        filter: `facility_id=eq.${facilityId}`
      },
      (payload: any) => {
        if (payload.new && 'balance' in payload.new) {
          onUpdate(payload.new.balance as number);
        }
      }
    )
    .subscribe();
}

// Provision a new user through the API (creates auth user, profile, links resident, handles emails per role)
export async function provisionUser(params: { email: string; name?: string; role: 'OM' | 'POA' | 'Resident'; facilityId?: string; residentId?: string; communityName?: string }): Promise<{ success: boolean }> {
  const { email, name, role, facilityId, residentId, communityName } = params;

  if (!email || typeof email !== 'string') {
    throw new Error('email is required');
  }
  if (!role || !['OM', 'POA', 'Resident'].includes(role)) {
    throw new Error("role must be one of 'OM', 'POA', or 'Resident'");
  }

  let resolvedFacilityId: string | null = facilityId || null;
  let resolvedCommunityName: string | null = communityName || null;

  if (role === 'OM') {
    if (!resolvedFacilityId) {
      throw new Error('facilityId is required for OM users');
    }
    if (!resolvedCommunityName) {
      const { data: fac, error: facErr } = await getSupabaseAdmin()
        .from('facilities')
        .select('id, name')
        .eq('id', resolvedFacilityId)
        .maybeSingle();
      if (facErr) {
        throw new Error(`Failed to load facility: ${facErr.message}`);
      }
      resolvedCommunityName = (fac as any)?.name || 'Community';
    }
  }

  async function findAuthUserIdByEmail(targetEmail: string): Promise<string | null> {
    try {
      let page = 1;
      const perPage = 1000;
      while (page <= 10) {
        const { data, error } = await (getSupabaseAdmin() as any).auth.admin.listUsers({ page, perPage });
        if (error) break;
        const hit = (data?.users || []).find((u: any) => (u.email || '').toLowerCase() === targetEmail.toLowerCase());
        if (hit) return hit.id as string;
        if (!data || !data.users || data.users.length < perPage) break;
        page += 1;
      }
    } catch (_) {
      // ignore
    }
    return null;
  }

  let authUserId: string | null = null;
  const userMetadata: Record<string, any> = {
    ...(name ? { name } : {}),
    role,
    ...(resolvedFacilityId ? { facilityId: resolvedFacilityId } : {}),
    ...(residentId ? { residentId } : {}),
  };

  if (role === 'OM') {
    const omPassword = String(resolvedCommunityName || 'Community').replace(/\s+/g, '') || 'ChangeMe123!';
    const { data: authCreate, error: authCreateErr } = await (getSupabaseAdmin() as any).auth.admin.createUser({
      email,
      password: omPassword,
      email_confirm: true,
      user_metadata: userMetadata
    });
    if (authCreateErr) {
      const id = await findAuthUserIdByEmail(email);
      if (!id) throw new Error(authCreateErr.message);
      authUserId = id;
    } else {
      authUserId = authCreate.user?.id || null;
    }
  } else {
    const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
    const { data: authCreate, error: authCreateErr } = await (getSupabaseAdmin() as any).auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: false,
      user_metadata: userMetadata
    });
    if (authCreateErr) {
      const id = await findAuthUserIdByEmail(email);
      if (!id) throw new Error(authCreateErr.message);
      authUserId = id;
    } else {
      authUserId = authCreate.user?.id || null;
    }
  }

  if (!authUserId) {
    throw new Error('Failed to determine auth user id');
  }

  const profileName = name || (email.split('@')[0] || 'User');
  const insertPayload: any = {
    name: profileName,
    email,
    role,
    facility_id: resolvedFacilityId,
    auth_user_id: authUserId,
  };

  const { data: profileRow, error: profileErr } = await getSupabaseAdmin()
    .from('users')
    .upsert(insertPayload, { onConflict: 'email' })
    .select('*')
    .single();

  if (profileErr) {
    throw new Error(`Failed to upsert user profile: ${profileErr.message}`);
  }

  if ((role === 'POA' || role === 'Resident') && residentId) {
    const adminAny = getSupabaseAdmin() as any;
    const { error: linkErr } = await adminAny
      .from('residents')
      .update({ linked_user_id: (profileRow as any).id })
      .eq('id', residentId);
    if (linkErr) {
      throw new Error(`Failed to link resident: ${linkErr.message}`);
    }
  }

  if (role === 'POA' || role === 'Resident') {
    const siteBase = (process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'https://trust1.netlify.app').replace(/\/$/, '');
    const { error: inviteErr } = await (getSupabaseAdmin() as any).auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteBase}/confirm-signup/resident/`,
      data: userMetadata,
    });
    if (inviteErr) {
      const msg = (inviteErr as any)?.message?.toLowerCase?.() || '';
      if (!msg.includes('already') && !msg.includes('exist') && !msg.includes('registered')) {
        throw new Error(`Failed to send invite: ${inviteErr.message}`);
      }
    }
  }

  return { success: true };
}
   

  