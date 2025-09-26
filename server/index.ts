import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import paypal from '@paypal/checkout-server-sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = [
  'https://trust1.netlify.app',
  process.env.FRONTEND_URL || 'https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--96435430.local-credentialless.webcontainer-api.io',
].filter(Boolean);
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qqcauorhdutkszufvrlm.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxY2F1b3JoZHV0a3N6dWZ2cmxtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE1Mjk0MCwiZXhwIjoyMDY5NzI4OTQwfQ.0a8JHBlmN7tqpwEm_RVbVzuNBpzzjtczqvk2JWIohHE';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
console.log('SERVICE ROLE KEY length:', serviceRoleKey?.length);
if (!supabaseUrl) {
  throw new Error('Missing Supabase URL. Set SUPABASE_URL (preferred) or VITE_SUPABASE_URL in your environment.');
}

if (!serviceRoleKey) {
  throw new Error('Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY in your environment.');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const supabaseAnon = anonKey ? createClient(supabaseUrl, anonKey) : null as any;

const siteUrl = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL || 'http://localhost:5173';

// Helper to build a PayPal client per facility
function createPayPalClient(config: { clientId: string; clientSecret: string; environment?: 'sandbox' | 'live' }) {
  const env = (config.environment || process.env.PAYPAL_ENVIRONMENT || 'sandbox').toLowerCase();
  const EnvironmentCtor = env === 'live' ? paypal.core.LiveEnvironment : paypal.core.SandboxEnvironment;
  const environment = new EnvironmentCtor(config.clientId, config.clientSecret);
  return new paypal.core.PayPalHttpClient(environment);
}

// Load facility-specific PayPal configuration with env fallback
async function loadFacilityPayPalConfig(supabaseAdmin: ReturnType<typeof createClient>, facilityId?: string) {
  // Default to environment variables
  let clientId = process.env.PAYPAL_CLIENT_ID || '';
  let clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  let environment: 'sandbox' | 'live' = ((process.env.PAYPAL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'live');
  let returnUrl = process.env.PAYPAL_RETURN_URL || `${siteUrl}`;
  let cancelUrl = process.env.PAYPAL_CANCEL_URL || `${siteUrl}`;

  try {
    if (facilityId) {
      const { data: fac } = await supabaseAdmin
        .from('facilities')
        .select('*')
        .eq('id', facilityId)
        .maybeSingle();
      if (fac) {
        // These fields are optional and may not exist in schema yet. Use if present.
        const anyFac: any = fac;
        clientId = anyFac.paypal_client_id || clientId;
        clientSecret = anyFac.paypal_secret_key || clientSecret;
        environment = (anyFac.paypal_environment || environment) as 'sandbox' | 'live';
        returnUrl = anyFac.paypal_return_url || returnUrl;
        cancelUrl = anyFac.paypal_cancel_url || cancelUrl;
      }
    }
  } catch (_) {
    // Ignore and rely on env fallback
  }

  if (!clientId || !clientSecret) {
    throw new Error('PayPal configuration missing. Configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET or facility-level credentials.');
  }

  return { clientId, clientSecret, environment, returnUrl, cancelUrl };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/facilities', async (req, res) => {
  try {
    const companyId = (req.query.companyId as string) || undefined;
    let query = supabaseAdmin
      .from('facilities')
      .select('id, name, address, phone, email, office_manager_email, created_at, status, unique_code, company_id')
      .order('name') as any;

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to load facilities' });
  }
});

// Send Supabase-managed invite email
app.post('/api/auth/invite', async (req, res) => {
  try {
    const { email, role, facilityId, residentId, name, redirectTo } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const finalRedirect = (typeof redirectTo === 'string' && redirectTo) ? redirectTo : 'https://vaultiq.ca';

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: finalRedirect,
      data: {
        ...(name ? { name } : {}),
        ...(role ? { role } : {}),
        ...(facilityId ? { facilityId } : {}),
        ...(residentId ? { residentId } : {}),
      },
    });

    if (error) {
      const message = (error as any)?.message || String(error);
      const normalized = message.toLowerCase();
      // Treat known conflicts as success to avoid 500s
      if (normalized.includes('already') || normalized.includes('exists') || normalized.includes('registered')) {
        return res.json({ success: true, alreadyInvitedOrExists: true });
      }
      return res.status(400).json({ error: message });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    // Avoid leaking 500s; return a safe error payload
    return res.status(400).json({ error: err?.message || 'Failed to send invite' });
  }
});


// Create a user using admin privileges (does not send an invite automatically)
app.post('/api/auth/create-user', async (req, res) => {
  try {
    const { email, password, email_confirm = false, user_metadata, app_metadata } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }

    const { data: result, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm,
      user_metadata,
      app_metadata,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

// Provision a new application user (creates auth user, profile, links resident, handles emails)
app.post('/api/users/provision', async (req, res) => {
  console.log('hi');
  try {
    const {
      email,
      name,
      role,
      facilityId,
      residentId,
      communityName,
      companyId
    } = req.body || {};

    console.log('[provision] incoming', { email, role, facilityId: !!facilityId, residentId: !!residentId, hasName: !!name, communityName });

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }
    if (!role || !['OM', 'POA', 'Resident'].includes(role)) {
      return res.status(400).json({ error: "role must be one of 'OM', 'POA', or 'Resident'" });
    }

    // Resolve facility for OM password fallback and profile association
    let resolvedFacilityId: string | null = facilityId || null;
    let resolvedCommunityName: string | null = communityName || null;
    if (role === 'OM') {
      if (!resolvedFacilityId) {
        return res.status(400).json({ error: 'facilityId is required for OM users' });
      }
      if (!resolvedCommunityName) {
        const { data: fac, error: facErr } = await supabaseAdmin
          .from('facilities')
          .select('id, name')
          .eq('id', resolvedFacilityId)
          .maybeSingle();
        if (facErr) {
          return res.status(400).json({ error: `Failed to load facility: ${facErr.message}` });
        }
        resolvedCommunityName = (fac as any)?.name || 'Community';
      }
    }

    // Helper: find existing auth user by email if create errors out
    async function findAuthUserIdByEmail(targetEmail: string): Promise<string | null> {
      try {
        let page = 1;
        const perPage = 1000;
        while (page <= 10) { // up to 10k users scan safeguard
          const { data, error } = await (supabaseAdmin as any).auth.admin.listUsers({ page, perPage });
          if (error) break;
          const hit = (data?.users || []).find((u: any) => (u.email || '').toLowerCase() === targetEmail.toLowerCase());
          if (hit) return hit.id as string;
          if (!data || !data.users || data.users.length < perPage) break;
          page += 1;
        }
      } catch (e: any) {
        console.error('[provision] listUsers failed', e?.message || e);
      }
      return null;
    }

    // Step 1: Create auth user
    let authUserId: string | null = null;
    let userMetadata: Record<string, any> = {
      ...(name ? { name } : {}),
      role,
      ...(resolvedFacilityId ? { facilityId: resolvedFacilityId } : {}),
      ...(residentId ? { residentId } : {}),
      ...(companyId ? { companyId } : {}),
    };

    if (role === 'OM') {
      // Set password to community/facility name for OM
      const omPassword = String(resolvedCommunityName || 'Community').replace(/\s+/g, '') || 'ChangeMe123!';
      const { data: authCreate, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: omPassword,
        email_confirm: true,
        user_metadata: userMetadata
      });
      if (authCreateErr) {
        console.warn('[provision] createUser error (OM):', authCreateErr?.message || authCreateErr);
        // If already exists, try to find
        const id = await findAuthUserIdByEmail(email);
        if (!id) return res.status(400).json({ error: authCreateErr.message });
        authUserId = id;
      } else {
        authUserId = authCreate.user?.id || null;
      }
    } else {
      // POA/Resident: create with random password, then send invite to set their own
      const randomPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
      const { data: authCreate, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: false,
        user_metadata: userMetadata
      });
      if (authCreateErr) {
        console.warn('[provision] createUser error (POA/Resident):', authCreateErr?.message || authCreateErr);
        const id = await findAuthUserIdByEmail(email);
        if (!id) return res.status(400).json({ error: authCreateErr.message });
        authUserId = id;
      } else {
        authUserId = authCreate.user?.id || null;
      }
    }

    if (!authUserId) {
      return res.status(500).json({ error: 'Failed to determine auth user id' });
    }

    // Step 2: Insert or upsert profile in public.users
    const profileName = name || (email.split('@')[0] || 'User');
    const insertPayload: any = {
      name: profileName,
      email,
      role,
      facility_id: resolvedFacilityId,
      auth_user_id: authUserId,
      ...(companyId ? { company_id: companyId } : {}),
    };

    const { data: profileRow, error: profileErr } = await supabaseAdmin
      .from('users')
      .upsert(insertPayload, { onConflict: 'email' })
      .select('*')
      .single();

    if (profileErr) {
      console.warn('[provision] upsert profile error:', profileErr?.message || profileErr);
      return res.status(400).json({ error: `Failed to upsert user profile: ${profileErr.message}` });
    }

    // Step 3: Link resident if applicable (POA/Resident)
    if ((role === 'POA' || role === 'Resident') && residentId) {
      const { error: linkErr } = await supabaseAdmin
        .from('residents')
        .update({ linked_user_id: profileRow.id })
        .eq('id', residentId);
      if (linkErr) {
        console.warn('[provision] link resident error:', linkErr?.message || linkErr);
        return res.status(400).json({ error: `Failed to link resident: ${linkErr.message}` });
      }
    }

    // Step 4: Send email for POA/Resident only
    // Step 4: Send email for POA/Resident only
    if (role === 'POA' || role === 'Resident') {
      const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: 'https://vaultiq.ca',
        data: userMetadata,
      });
      if (inviteErr) {
        // Tolerate duplicate/invite exists errors
        const msg = (inviteErr as any)?.message?.toLowerCase?.() || '';
        if (!msg.includes('already') && !msg.includes('exist') && !msg.includes('registered')) {
          console.warn('[provision] invite error:', inviteErr?.message || inviteErr);
          return res.status(400).json({ error: `Failed to send invite: ${inviteErr.message}` });
        }
      }
    }
    

    console.log('[provision] success', { authUserId });
    return res.json({
      success: true,
      user: {
        authUserId,
        profileId: profileRow.id,
        role,
        email,
      }
    });
  } catch (err: any) {
    console.error('[provision] unhandled error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Failed to provision user' });
  }
});

// Securely fetch the current user's profile using service role (RLS-safe)
app.get('/api/users/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({ error: authError?.message || 'Invalid token' });
    }

    const authUserId = authData.user.id;

    // Try to load existing profile
    let { data: userRow, error: userErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    // Pull metadata from Supabase auth
    const meta: any = {
      ...(authData.user.user_metadata || {}),
      ...(authData.user.app_metadata || {}),
    };

    // If profile missing, auto-create using invite metadata
    if (!userRow) {
      const role = meta.role as 'Admin' | 'OM' | 'POA' | 'Resident' | 'Vendor' | undefined;
      const facilityId = meta.facilityId as string | undefined;
      const name = (meta.name as string) || (authData.user.email?.split('@')[0] || 'User');

      if (!role) {
        // Without role we cannot provision a profile safely
        return res.status(404).json({ error: userErr?.message || 'Profile not found and no invite metadata to create it' });
      }

      const { data: created, error: createErr } = await supabaseAdmin
        .from('users')
        .insert({
          name,
          email: authData.user.email as string,
          role,
          facility_id: facilityId || null,
          auth_user_id: authUserId,
        })
        .select('*')
        .single();

      if (createErr) {
        return res.status(500).json({ error: createErr.message });
      }
      userRow = created;
    }

    // Auto-link resident if metadata contains residentId and role is POA/Resident
    const residentId = meta.residentId as string | undefined;
    const roleForLink = (userRow?.role || meta.role) as string | undefined;
    if (residentId && (roleForLink === 'POA' || roleForLink === 'Resident')) {
      // Link the resident if not already linked
      const { data: resident, error: rErr } = await supabaseAdmin
        .from('residents')
        .select('id, linked_user_id')
        .eq('id', residentId)
        .maybeSingle();
      if (!rErr && resident && !resident.linked_user_id) {
        await supabaseAdmin
          .from('residents')
          .update({ linked_user_id: userRow.id })
          .eq('id', residentId);
      }
    }

    // Load facility row if present
    let facilityRow: any = null;
    const facilityIdToLoad = userRow?.facility_id || meta.facilityId;
    if (facilityIdToLoad) {
      const { data: fac } = await supabaseAdmin
        .from('facilities')
        .select('*')
        .eq('id', facilityIdToLoad)
        .maybeSingle();
      facilityRow = fac || null;
    }

    return res.json({ user: userRow, facility: facilityRow, companyId: (userRow as any)?.company_id || (facilityRow as any)?.company_id || null });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

app.get('/api/paypal/config', async (req, res) => {
  try {
    const facilityId = (req.query.facilityId as string) || undefined;
    const cfg = await loadFacilityPayPalConfig(supabaseAdmin, facilityId);
    const scriptUrl = cfg.environment === 'live'
      ? 'https://www.paypal.com/sdk/js'
      : 'https://www.paypal.com/sdk/js'; // Same base; env is passed via params

    return res.json({
      clientId: cfg.clientId,
      environment: cfg.environment,
      scriptUrl,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to load PayPal config' });
  }
});

// Save or update facility-specific PayPal settings
app.post('/api/paypal/config', async (req, res) => {
  try {
    const { facilityId, clientId, clientSecret, environment, returnUrl, cancelUrl } = req.body || {};
    if (!facilityId) {
      return res.status(400).json({ error: 'facilityId is required' });
    }
    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'clientId and clientSecret are required' });
    }

    // Ensure facility exists
    const { data: fac } = await supabaseAdmin
      .from('facilities')
      .select('id')
      .eq('id', facilityId)
      .maybeSingle();
    if (!fac) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    // Attempt to update facility row with PayPal fields; if columns don't exist, report a clear error
    const updatePayload: any = {
      paypal_client_id: clientId,
      paypal_secret_key: clientSecret,
      paypal_environment: (environment || 'sandbox').toLowerCase(),
      paypal_return_url: returnUrl || null,
      paypal_cancel_url: cancelUrl || null,
    };

    const { error: upErr } = await supabaseAdmin
      .from('facilities')
      .update(updatePayload)
      .eq('id', facilityId);

    if (upErr) {
      return res.status(400).json({
        error: `Failed to save PayPal settings: ${upErr.message}. Ensure facilities table has columns: paypal_client_id (text), paypal_secret_key (text), paypal_environment (text), paypal_return_url (text), paypal_cancel_url (text).`
      });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to save PayPal config' });
  }
});

app.post('/api/paypal/orders', async (req, res) => {
  try {
    const { amount, currency = 'USD', description, facilityId, residentId, returnUrl, cancelUrl } = req.body || {};
    if (!amount || !facilityId || !residentId) {
      return res.status(400).json({ error: 'amount, facilityId and residentId are required' });
    }

    const cfg = await loadFacilityPayPalConfig(supabaseAdmin, facilityId);
    const client = createPayPalClient(cfg);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      application_context: {
        return_url: returnUrl || cfg.returnUrl || undefined,
        cancel_url: cancelUrl || cfg.cancelUrl || undefined,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: String(amount.toFixed ? amount.toFixed(2) : amount),
          },
          description: description || 'Resident Trust Deposit',
          custom_id: JSON.stringify({ residentId, facilityId }),
          reference_id: residentId,
        },
      ],
    });

    const order = await client.execute(request);
    return res.json(order.result);
  } catch (err: any) {
    console.error('PayPal create order error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to create PayPal order' });
  }
});

app.post('/api/paypal/orders/:orderId/capture', async (req, res) => {
  try {
    // Validate user from auth header to attribute created_by
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
    let createdByUserId: string | null = null;
    if (token) {
      const { data: authData } = await supabaseAdmin.auth.getUser(token);
      if (authData?.user) {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('auth_user_id', authData.user.id)
          .maybeSingle();
        createdByUserId = userRow?.id || null;
      }
    }

    const { orderId } = req.params;
    const { facilityId } = req.body || {};
    if (!facilityId) {
      return res.status(400).json({ error: 'facilityId is required' });
    }
    const cfg = await loadFacilityPayPalConfig(supabaseAdmin, facilityId);
    const client = createPayPalClient(cfg);

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const capture = await client.execute(request);

    // Extract resident and facility from order metadata
    const pu = capture.result.purchase_units?.[0];
    let residentId: string | undefined;
    try {
      const parsed = pu?.custom_id ? JSON.parse(pu.custom_id) : null;
      residentId = parsed?.residentId;
    } catch (_) {}

    const amountStr = pu?.payments?.captures?.[0]?.amount?.value || pu?.amount?.value;
    const currency = pu?.payments?.captures?.[0]?.amount?.currency_code || pu?.amount?.currency_code || 'USD';
    const amount = amountStr ? Number(amountStr) : undefined;

    if (!residentId || !amount) {
      return res.status(400).json({ error: 'Missing residentId or amount from order' });
    }

    // Extract capture and fee breakdown
    const cap: any = pu?.payments?.captures?.[0] || null;
    const breakdown = cap?.seller_receivable_breakdown;
    const grossStr = breakdown?.gross_amount?.value || cap?.amount?.value || amountStr;
    const feeStr = breakdown?.paypal_fee?.value || '0.00';
    const netStr = breakdown?.net_amount?.value || undefined;
    const grossNum = grossStr ? Number(grossStr) : amount || 0;
    const feeNum = feeStr ? Number(feeStr) : 0;
    const netNum = netStr ? Number(netStr) : (grossNum - feeNum);

    // Try to parse trustTopUp/cardCharge if client created order with enriched custom_id
    let trustTopUpNum: number | null = null;
    let cardChargeNum: number | null = null;
    try {
      const parsedCustom = pu?.custom_id ? JSON.parse(pu.custom_id) : null;
      if (parsedCustom) {
        if (parsedCustom.trustTopUp) trustTopUpNum = Number(parsedCustom.trustTopUp);
        if (parsedCustom.cardCharge) cardChargeNum = Number(parsedCustom.cardCharge);
      }
    } catch {}

    const creditedAmount = (trustTopUpNum && !Number.isNaN(trustTopUpNum)) ? trustTopUpNum : netNum;

    const descriptionParts = [
      `Online Payment (PayPal ${currency})`,
      `Gross ${grossNum.toFixed(2)} ${currency}`,
      `PayPal fee ${feeNum.toFixed(2)} ${currency}`,
      `Net received ${netNum.toFixed(2)} ${currency}`,
    ];
    if (trustTopUpNum != null) {
      descriptionParts.push(`Top-up credited ${trustTopUpNum.toFixed(2)} ${currency}`);
    }
    if (cap?.id) {
      descriptionParts.push(`Capture ID ${cap.id}`);
    }

    const { error: insertErr } = await supabaseAdmin
      .from('transactions')
      .insert({
        resident_id: residentId,
        facility_id: facilityId,
        type: 'credit',
        amount: creditedAmount,
        method: 'manual',
        description: descriptionParts.join(' | '),
        created_by: createdByUserId,
      });

    if (insertErr) {
      console.error('Failed to save transaction:', insertErr);
    }

    return res.json({ success: true, capture: capture.result });
  } catch (err: any) {
    console.error('PayPal capture error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to capture PayPal order' });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${port}`);
});

// =============================
// Vendor Management Endpoints
// =============================

// List vendors linked to a facility (community)
app.get('/api/vendors', async (req, res) => {
  try {
    const facilityId = (req.query.facilityId as string) || '';
    if (!facilityId) {
      return res.status(400).json({ error: 'facilityId is required' });
    }

    // Validate UUID format early to avoid PostgREST errors
    const isValidUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!isValidUuid.test(facilityId)) {
      return res.json([]);
    }

    // Find vendor links for this facility
    const { data: links, error: linksErr } = await supabaseAdmin
      .from('vendor_facilities')
      .select('vendor_user_id')
      .eq('facility_id', facilityId);
    if (linksErr) return res.status(400).json({ error: linksErr.message });

    const vendorUserIds: string[] = (links || []).map((l: any) => l.vendor_user_id);
    if (vendorUserIds.length === 0) {
      return res.json([]);
    }

    // Load vendor profiles
    const { data: vendors, error: usersErr } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, created_at')
      .in('id', vendorUserIds)
      .eq('role', 'Vendor')
      .order('created_at', { ascending: true });
    if (usersErr) return res.status(400).json({ error: usersErr.message });

    return res.json(vendors || []);
  } catch (err: any) {
    console.error('[GET /api/vendors] unexpected error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Failed to list vendors' });
  }
});

// Create or link a vendor to a facility
app.post('/api/vendors', async (req, res) => {
  try {
    const { email, name, facilityId, password } = req.body || {};
    if (!facilityId) return res.status(400).json({ error: 'facilityId is required' });
    if (!email) return res.status(400).json({ error: 'email is required' });

    const normalizedEmail = String(email).trim().toLowerCase();

    // Check if a user profile already exists
    let { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    let authUserId: string | null = null;

    if (!existingProfile) {
      // Create auth user with mustResetPassword metadata
      const generatedPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
      const chosenPassword = typeof password === 'string' && password.length >= 6 ? password : generatedPassword;
      const mustResetFlag = !password; // if OM supplied a password, don't force immediate reset

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: chosenPassword,
        email_confirm: true,
        user_metadata: {
          role: 'Vendor',
          mustResetPassword: mustResetFlag,
        },
      });
      if (createErr) return res.status(400).json({ error: createErr.message });
      authUserId = created.user?.id || null;
      if (!authUserId) return res.status(500).json({ error: 'Failed to create auth user' });

      // Create app profile
      const { data: profile, error: profErr } = await supabaseAdmin
        .from('users')
        .insert({
          name: name || normalizedEmail,
          email: normalizedEmail,
          role: 'Vendor',
          facility_id: null,
          auth_user_id: authUserId,
        })
        .select('*')
        .single();
      if (profErr) return res.status(400).json({ error: profErr.message });
      existingProfile = profile as any;
    }

    // Ensure link exists
    const { error: linkErr } = await supabaseAdmin
      .from('vendor_facilities')
      .upsert({ vendor_user_id: (existingProfile as any).id, facility_id: facilityId }, { onConflict: 'vendor_user_id,facility_id' });
    if (linkErr) return res.status(400).json({ error: linkErr.message });

    return res.json({ success: true, vendor: existingProfile });
  } catch (err: any) {
    console.error('[POST /api/vendors] unexpected error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Failed to create/link vendor' });
  }
});

// Removed: vendor temp password reset endpoint

// Unlink a vendor from a facility
app.delete('/api/vendors/link', async (req, res) => {
  try {
    const vendorUserId = (req.query.vendorUserId as string) || '';
    const facilityId = (req.query.facilityId as string) || '';
    if (!vendorUserId || !facilityId) {
      return res.status(400).json({ error: 'vendorUserId and facilityId are required' });
    }
    const { error } = await supabaseAdmin
      .from('vendor_facilities')
      .delete()
      .eq('vendor_user_id', vendorUserId)
      .eq('facility_id', facilityId);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to unlink vendor' });
  }
});