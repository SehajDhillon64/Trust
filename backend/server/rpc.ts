import type { Request, Response } from 'express';

// Whitelist map of callable functions
// Key format: module.function
const registry: Record<string, Function> = {};

// Dynamically register functions from service modules
async function register() {
  const db = await import('../services/app/database.ts').catch(() => ({} as any));
  const cashbox = await import('../services/app/cashbox-database.ts').catch(() => ({} as any));
  const paypal = await import('../services/app/paypal.ts').catch(() => ({} as any));

  const expose = (moduleName: string, mod: any, allow: string[]) => {
    allow.forEach((fn) => {
      if (typeof mod[fn] === 'function') registry[`${moduleName}.${fn}`] = mod[fn];
    });
  };

  expose('database', db, [
    'signInUser','signOutUser','getCurrentUser','createFacility','getFacilities','getFacilityById',
    'createResident','createResidentWithLinkedUser','getResidentsByFacility','getAllResidents','getResidentById','updateResident',
    'createTransaction','getTransactionsByResident','getTransactionsByFacility','recordResidentWithdrawal',
    'createServiceBatch','getServiceBatchesByFacility','getServiceBatchById','addResidentToServiceBatch','removeResidentFromServiceBatch','updateServiceBatchItem','postServiceBatch','deleteServiceBatch',
    'createDepositBatchDb','getDepositBatchesByFacilityDb','getDepositBatchByIdDb','postDepositBatchDb','deleteDepositBatchDb','addEntryToDepositBatchDb','updateDepositBatchEntryDb','removeEntryFromDepositBatchDb',
    'createPreAuthDebit','getPreAuthDebitsByResident','getPreAuthDebitsByFacility','updatePreAuthDebit','createMonthlyPreAuthList','getMonthlyPreAuthList','getFacilityMonthlyPreAuthLists','closeMonthlyPreAuthList',
    'getFacilitiesForVendor','createInvoiceDb','getInvoicesByVendorDb','getInvoicesByFacilityDb','addInvoiceItemDb','updateInvoiceItemDb','removeInvoiceItemDb','submitInvoiceDb','updateInvoiceOmNotesDb','markInvoicePaidDb','updateInvoiceVendorDetailsDb',
    'listVendorsForFacility','createVendorUserAndLink','unlinkVendorFromFacility','provisionUser','createSignupInvitationForResident','createSignupInvitation','sendInvitationEmail','sendInviteByEmail','getOmUsers','clearFacilityForUser','getTotalTrustBalances'
  ]);

  expose('cashbox', cashbox, [
    'initializeCashBoxBalance','getCashBoxBalance','processCashBoxTransaction','resetCashBoxMonthly','getCashBoxTransactions','getCashBoxTransactionsByDate','getMonthlyCashBoxHistory'
  ]);

  expose('paypal', paypal, ['fetchPayPalConfig','createPayPalOrder','capturePayPalOrder']);
}

let registryReady: Promise<void> | null = null;
async function ensureRegistry() {
  if (!registryReady) registryReady = register();
  await registryReady;
}

export async function handleRpc(req: Request, res: Response) {
  try {
    await ensureRegistry();
    const { method, params } = req.body || {};
    if (!method || typeof method !== 'string') return res.status(400).json({ error: 'method is required' });
    const fn = registry[method];
    if (!fn) return res.status(404).json({ error: 'method not found' });

    // Execute with params as array or object
    const result = Array.isArray(params) ? await fn(...params) : await fn(params ?? undefined);
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'RPC error' });
  }
}

