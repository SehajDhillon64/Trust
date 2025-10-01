import express, { Request, Response } from 'express';
import cors from 'cors';
import { FRONTEND_URL, PORT } from '../config/env.js';
import { createOrder, captureOrder } from '../services/payments.js';
import { getItems } from '../services/db.js';
import * as appDb from '../services/app/database.js';
import * as appCashbox from '../services/app/cashbox-database.js';
import * as appPaypal from '../services/app/paypal.js';
import { getSupabaseAdmin } from '../config/supabase.js';

const app = express();

app.use(cors({ origin: [FRONTEND_URL, 'https://trust1.netlify.app'], credentials: true }));
// Explicitly handle CORS preflight for all routes
app.options('*', cors({ origin: [FRONTEND_URL, 'https://trust1.netlify.app'], credentials: true }));
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Example DB route
app.get('/api/items', async (_req: Request, res: Response) => {
  try {
    const items = await getItems();
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Unknown error' });
  }
});

// PayPal routes
app.post('/api/payments/create-order', async (req: Request, res: Response) => {
  try {
    const { amount, currency } = req.body ?? {};
    if (!amount || !currency) return res.status(400).json({ error: 'amount and currency are required' });
    const result = await createOrder({ amount, currency });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Unknown error' });
  }
});

app.post('/api/payments/capture-order', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body ?? {};
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    const result = await captureOrder(orderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Unknown error' });
  }
});

// Accept terms: records timestamp (and optional version) for the authenticated user
app.post('/api/users/accept-terms', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;
    if (!token) {
      return res.status(401).json({ error: 'Missing Authorization bearer token' });
    }

    const admin = getSupabaseAdmin();
    const { data: userData, error: userErr } = await (admin as any).auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const authUserId = userData.user.id as string;
    const nowIso = new Date().toISOString();
    const updatePayload: any = { terms_accepted_at: nowIso };
    if (req.body && typeof req.body.termsVersion === 'string' && req.body.termsVersion.trim().length > 0) {
      updatePayload.terms_version = req.body.termsVersion.trim();
    }

    const { data: profile, error: upErr } = await (admin as any)
      .from('users')
      .update(updatePayload)
      .eq('auth_user_id', authUserId)
      .select('id, terms_accepted_at, terms_version')
      .maybeSingle();

    if (upErr) {
      return res.status(500).json({ error: upErr.message || 'Failed to update terms' });
    }
    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.json({ success: true, termsAcceptedAt: profile.terms_accepted_at, termsVersion: profile.terms_version });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Unexpected error' });
  }
});

// Generic RPC endpoint with allowlist
const rpcAllowlist: Record<string, any> = {
  // database service
  signInUser: appDb.signInUser,
  signOutUser: appDb.signOutUser,
  getCurrentUser: appDb.getCurrentUser,
  getFacilities: appDb.getFacilities,
  getFacilityById: appDb.getFacilityById,
  createFacility: appDb.createFacility,
  getResidentsByFacility: appDb.getResidentsByFacility,
  getAllResidents: appDb.getAllResidents,
  getResidentById: appDb.getResidentById,
  updateResident: appDb.updateResident,
  createResident: appDb.createResident,
  createResidentWithLinkedUser: appDb.createResidentWithLinkedUser,
  createTransaction: appDb.createTransaction,
  getTransactionsByResident: appDb.getTransactionsByResident,
  getTransactionsByFacility: appDb.getTransactionsByFacility,
  recordResidentWithdrawal: appDb.recordResidentWithdrawal,
  createServiceBatch: appDb.createServiceBatch,
  getServiceBatchesByFacility: appDb.getServiceBatchesByFacility,
  getServiceBatchById: appDb.getServiceBatchById,
  addResidentToServiceBatch: appDb.addResidentToServiceBatch,
  removeResidentFromServiceBatch: appDb.removeResidentFromServiceBatch,
  updateServiceBatchItem: appDb.updateServiceBatchItem,
  postServiceBatch: appDb.postServiceBatch,
  deleteServiceBatch: appDb.deleteServiceBatch,
  // pre-authorization debits
  getPreAuthDebitsByResident: appDb.getPreAuthDebitsByResident,
  getPreAuthDebitsByFacility: appDb.getPreAuthDebitsByFacility,
  createPreAuthDebit: appDb.createPreAuthDebit,
  updatePreAuthDebit: appDb.updatePreAuthDebit,
  createMonthlyPreAuthList: appDb.createMonthlyPreAuthList,
  getMonthlyPreAuthList: appDb.getMonthlyPreAuthList,
  getFacilityMonthlyPreAuthLists: appDb.getFacilityMonthlyPreAuthLists,
  closeMonthlyPreAuthList: appDb.closeMonthlyPreAuthList,
  createDepositBatchDb: appDb.createDepositBatchDb,
  getDepositBatchesByFacilityDb: appDb.getDepositBatchesByFacilityDb,
  getDepositBatchByIdDb: appDb.getDepositBatchByIdDb,
  addEntryToDepositBatchDb: appDb.addEntryToDepositBatchDb,
  updateDepositBatchEntryDb: appDb.updateDepositBatchEntryDb,
  removeEntryFromDepositBatchDb: appDb.removeEntryFromDepositBatchDb,
  postDepositBatchDb: appDb.postDepositBatchDb,
  deleteDepositBatchDb: appDb.deleteDepositBatchDb,
  createInvoiceDb: appDb.createInvoiceDb,
  getInvoicesByVendorDb: appDb.getInvoicesByVendorDb,
  getInvoicesByFacilityDb: appDb.getInvoicesByFacilityDb,
  addInvoiceItemDb: appDb.addInvoiceItemDb,
  updateInvoiceItemDb: appDb.updateInvoiceItemDb,
  removeInvoiceItemDb: appDb.removeInvoiceItemDb,
  submitInvoiceDb: appDb.submitInvoiceDb,
  updateInvoiceOmNotesDb: appDb.updateInvoiceOmNotesDb,
  markInvoicePaidDb: appDb.markInvoicePaidDb,
  updateInvoiceVendorDetailsDb: appDb.updateInvoiceVendorDetailsDb,
  listVendorsForFacility: appDb.listVendorsForFacility,
  createVendorUserAndLink: appDb.createVendorUserAndLink,
  unlinkVendorFromFacility: appDb.unlinkVendorFromFacility,
  linkVendorToFacility: appDb.linkVendorToFacility,
  // mail delivery preferences
  updateResidentMailPreference: appDb.updateResidentMailPreference,
  listResidentMailPreferencesByFacility: appDb.listResidentMailPreferencesByFacility,
  createSignupInvitation: appDb.createSignupInvitation,
  createSignupInvitationForResident: appDb.createSignupInvitationForResident,
  sendInvitationEmail: appDb.sendInvitationEmail,
  sendInviteByEmail: appDb.sendInviteByEmail,
  provisionUser: appDb.provisionUser,
  // OM admin helpers
  createOfficeManagerUser: appDb.createOfficeManagerUser,
  getOmUsers: appDb.getOmUsers,
  clearFacilityForUser: appDb.clearFacilityForUser,
  // auth email helpers
  sendRoleBasedResetPasswordEmail: appDb.sendRoleBasedResetPasswordEmail,
  // cashbox
  updateCashBoxBalanceWithTransaction: appDb.updateCashBoxBalanceWithTransaction,
  resetCashBoxToMonthly: appDb.resetCashBoxToMonthly,
  getMonthlyCashBoxHistory: appDb.getMonthlyCashBoxHistory,
  getCashBoxTransactionsByMonthYear: appDb.getCashBoxTransactionsByMonthYear,
  getCashBoxBalanceServer: appCashbox.getCashBoxBalance,
  // paypal config
  fetchPayPalConfig: appPaypal.fetchPayPalConfig,
};

app.post('/api/rpc', async (req: Request, res: Response) => {
  try {
    const { method, params } = req.body || {};
    if (!method || typeof method !== 'string') {
      return res.status(400).json({ error: 'method is required' });
    }
    const fn = rpcAllowlist[method];
    if (!fn) {
      return res.status(404).json({ error: 'Unknown RPC method' });
    }
    const result = await fn.apply(null, Array.isArray(params) ? params : [params]);
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'RPC error' });
  }
});

app.listen(PORT, () => {
});

