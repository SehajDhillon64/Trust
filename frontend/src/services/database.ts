import { rpc } from './rpc'
import type { User, Facility, Resident, Transaction, ServiceBatch, PreAuthDebit, MonthlyPreAuthList, SignupInvitation, Invoice, InvoiceItem } from '../types'

export async function signInUser(email: string, password: string): Promise<{ user: User; facility: Facility | null; authUser: any }> {
  return await rpc('database.signInUser', { email, password })
}

export async function signOutUser(): Promise<void> {
  await rpc('database.signOutUser')
}

export async function getCurrentUser(): Promise<{ user: User; facility: Facility | null } | null> {
  return await rpc('database.getCurrentUser')
}

export async function createFacility(facility: Omit<Facility, 'id' | 'createdAt' | 'uniqueCode'> & { uniqueCode?: string }): Promise<Facility> {
  return await rpc('database.createFacility', facility)
}

export async function getFacilities(companyId?: string): Promise<Facility[]> {
  return await rpc('database.getFacilities', companyId)
}

export async function getFacilityById(id: string): Promise<Facility> {
  return await rpc('database.getFacilityById', id)
}

export async function createResident(resident: Omit<Resident, 'id' | 'createdAt'>): Promise<Resident> {
  return await rpc('database.createResident', resident)
}

export async function createResidentWithLinkedUser(args: any): Promise<Resident> {
  return await rpc('database.createResidentWithLinkedUser', args)
}

export async function getResidentsByFacility(facilityId: string): Promise<Resident[]> {
  return await rpc('database.getResidentsByFacility', facilityId)
}

export async function getAllResidents(): Promise<Resident[]> {
  return await rpc('database.getAllResidents')
}

export async function getResidentById(id: string): Promise<Resident> {
  return await rpc('database.getResidentById', id)
}

export async function updateResident(id: string, updates: Partial<Resident>): Promise<Resident> {
  return await rpc('database.updateResident', [id, updates])
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>): Promise<Transaction> {
  return await rpc('database.createTransaction', transaction)
}

export async function getTransactionsByResident(residentId: string): Promise<Transaction[]> {
  return await rpc('database.getTransactionsByResident', residentId)
}

export async function getTransactionsByFacility(facilityId: string, limit?: number): Promise<Transaction[]> {
  return await rpc('database.getTransactionsByFacility', [facilityId, limit])
}

export async function recordResidentWithdrawal(args: any): Promise<void> {
  await rpc('database.recordResidentWithdrawal', args)
}

export async function createServiceBatch(batch: any) { return await rpc('database.createServiceBatch', batch) }
export async function getServiceBatchesByFacility(facilityId: string) { return await rpc('database.getServiceBatchesByFacility', facilityId) }
export async function getServiceBatchById(batchId: string) { return await rpc('database.getServiceBatchById', batchId) }
export async function addResidentToServiceBatch(batchId: string, residentId: string, amount: number) { return await rpc('database.addResidentToServiceBatch', [batchId, residentId, amount]) }
export async function removeResidentFromServiceBatch(batchId: string, residentId: string) { return await rpc('database.removeResidentFromServiceBatch', [batchId, residentId]) }
export async function updateServiceBatchItem(batchId: string, residentId: string, amount: number) { return await rpc('database.updateServiceBatchItem', [batchId, residentId, amount]) }
export async function postServiceBatch(batchId: string, postedBy: string, chequeNumber?: string) { return await rpc('database.postServiceBatch', [batchId, postedBy, chequeNumber]) }
export async function deleteServiceBatch(batchId: string) { return await rpc('database.deleteServiceBatch', batchId) }

export async function createDepositBatchDb(facilityId: string, userId: string, entries: any[], description?: string) { return await rpc('database.createDepositBatchDb', [facilityId, userId, entries, description]) }
export async function getDepositBatchesByFacilityDb(facilityId: string) { return await rpc('database.getDepositBatchesByFacilityDb', facilityId) }
export async function getDepositBatchByIdDb(batchId: string) { return await rpc('database.getDepositBatchByIdDb', batchId) }
export async function postDepositBatchDb(batchId: string, processedBy: string) { return await rpc('database.postDepositBatchDb', [batchId, processedBy]) }
export async function deleteDepositBatchDb(batchId: string) { return await rpc('database.deleteDepositBatchDb', batchId) }
export async function addEntryToDepositBatchDb(batchId: string, entry: any) { return await rpc('database.addEntryToDepositBatchDb', [batchId, entry]) }
export async function updateDepositBatchEntryDb(batchId: string, entryId: string, updates: any) { return await rpc('database.updateDepositBatchEntryDb', [batchId, entryId, updates]) }
export async function removeEntryFromDepositBatchDb(batchId: string, entryId: string) { return await rpc('database.removeEntryFromDepositBatchDb', [batchId, entryId]) }

export async function createPreAuthDebit(preAuthDebit: Omit<PreAuthDebit, 'id' | 'createdAt'>) { return await rpc('database.createPreAuthDebit', preAuthDebit) }
export async function getPreAuthDebitsByResident(residentId: string, month?: string) { return await rpc('database.getPreAuthDebitsByResident', [residentId, month]) }
export async function getPreAuthDebitsByFacility(facilityId: string, month?: string) { return await rpc('database.getPreAuthDebitsByFacility', [facilityId, month]) }
export async function updatePreAuthDebit(id: string, updates: Partial<PreAuthDebit>) { return await rpc('database.updatePreAuthDebit', [id, updates]) }
export async function createMonthlyPreAuthList(facilityId: string, month: string) { return await rpc('database.createMonthlyPreAuthList', [facilityId, month]) }
export async function getMonthlyPreAuthList(facilityId: string, month: string) { return await rpc('database.getMonthlyPreAuthList', [facilityId, month]) }
export async function getFacilityMonthlyPreAuthLists(facilityId: string) { return await rpc('database.getFacilityMonthlyPreAuthLists', facilityId) }
export async function closeMonthlyPreAuthList(listId: string, closedBy: string) { return await rpc('database.closeMonthlyPreAuthList', [listId, closedBy]) }

export async function getFacilitiesForVendor(vendorUserId: string) { return await rpc('database.getFacilitiesForVendor', vendorUserId) }
export async function createInvoiceDb(facilityId: string, vendorUserId: string) { return await rpc('database.createInvoiceDb', [facilityId, vendorUserId]) }
export async function getInvoicesByVendorDb(vendorUserId: string, facilityId?: string) { return await rpc('database.getInvoicesByVendorDb', [vendorUserId, facilityId]) }
export async function getInvoicesByFacilityDb(facilityId: string, status?: 'open'|'submitted'|'paid') { return await rpc('database.getInvoicesByFacilityDb', [facilityId, status]) }
export async function addInvoiceItemDb(invoiceId: string, residentId: string, amount: number, description: string) { return await rpc('database.addInvoiceItemDb', [invoiceId, residentId, amount, description]) }
export async function updateInvoiceItemDb(invoiceId: string, itemId: string, updates: any) { return await rpc('database.updateInvoiceItemDb', [invoiceId, itemId, updates]) }
export async function removeInvoiceItemDb(invoiceId: string, itemId: string) { return await rpc('database.removeInvoiceItemDb', [invoiceId, itemId]) }
export async function submitInvoiceDb(invoiceId: string) { return await rpc('database.submitInvoiceDb', invoiceId) }
export async function updateInvoiceOmNotesDb(invoiceId: string, omNotes: string) { return await rpc('database.updateInvoiceOmNotesDb', [invoiceId, omNotes]) }
export async function markInvoicePaidDb(invoiceId: string, paidBy: string, omNotes?: string) { return await rpc('database.markInvoicePaidDb', [invoiceId, paidBy, omNotes]) }
export async function updateInvoiceVendorDetailsDb(invoiceId: string, details: any) { return await rpc('database.updateInvoiceVendorDetailsDb', [invoiceId, details]) }

export async function listVendorsForFacility(facilityId: string) { return await rpc('database.listVendorsForFacility', facilityId) }
export async function createVendorUserAndLink(facilityId: string, email: string, name?: string, password?: string) { return await rpc('database.createVendorUserAndLink', [facilityId, email, name, password]) }
export async function unlinkVendorFromFacility(vendorUserId: string, facilityId: string) { return await rpc('database.unlinkVendorFromFacility', [vendorUserId, facilityId]) }

export async function clearFacilityForUser(userId: string) { return await rpc('database.clearFacilityForUser', userId) }
export async function getOmUsers(companyId?: string) { return await rpc('database.getOmUsers', companyId) }

export async function createSignupInvitationForResident(args: any) { return await rpc('database.createSignupInvitationForResident', args) }
export async function createSignupInvitation(facilityId: string, email: string, role: 'OM'|'POA'|'Resident', invitedBy: string) { return await rpc('database.createSignupInvitation', [facilityId, email, role, invitedBy]) }
export async function sendInvitationEmail(invitation: SignupInvitation, facilityName: string) { return await rpc('database.sendInvitationEmail', [invitation, facilityName]) }
export async function sendInviteByEmail(params: any) { return await rpc('database.sendInviteByEmail', params) }
export async function provisionUser(params: any) { return await rpc('database.provisionUser', params) }

export function subscribeToResidentChanges(_facilityId: string, _cb: (r: Resident) => void) { return { unsubscribe() {} } }
export function subscribeToTransactionChanges(_facilityId: string, _cb: (t: Transaction) => void) { return { unsubscribe() {} } }
export function subscribeToServiceBatchChanges(_facilityId: string, _onChange: () => void) { return { unsubscribe() {} } }