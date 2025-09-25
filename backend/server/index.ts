import express from 'express';
import cors from 'cors';
import { FRONTEND_URL, PORT } from '../config/env.js';
import { createOrder, captureOrder } from '../services/payments.js';
import { getItems } from '../services/db.js';
import * as appDb from '../services/app/database.js';
import * as appPaypal from '../services/app/paypal.js';

const app = express();

app.use(cors({ origin: FRONTEND_URL||'https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--96435430.local-credentialless.webcontainer-api.io/', credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Example DB route
app.get('/api/items', async (_req, res) => {
  try {
    const items = await getItems();
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Unknown error' });
  }
});

// PayPal routes
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { amount, currency } = req.body ?? {};
    if (!amount || !currency) return res.status(400).json({ error: 'amount and currency are required' });
    const result = await createOrder({ amount, currency });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Unknown error' });
  }
});

app.post('/api/payments/capture-order', async (req, res) => {
  try {
    const { orderId } = req.body ?? {};
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    const result = await captureOrder(orderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Unknown error' });
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
  createSignupInvitation: appDb.createSignupInvitation,
  createSignupInvitationForResident: appDb.createSignupInvitationForResident,
  sendInvitationEmail: appDb.sendInvitationEmail,
  sendInviteByEmail: appDb.sendInviteByEmail,
  provisionUser: appDb.provisionUser,
  // cashbox
  updateCashBoxBalanceWithTransaction: appDb.updateCashBoxBalanceWithTransaction,
  resetCashBoxToMonthly: appDb.resetCashBoxToMonthly,
  getMonthlyCashBoxHistory: appDb.getMonthlyCashBoxHistory,
  // paypal config
  fetchPayPalConfig: appPaypal.fetchPayPalConfig,
};

app.post('/api/rpc', async (req, res) => {
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
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${PORT}`);
});

