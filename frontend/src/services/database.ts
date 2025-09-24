import { rpcCall } from './rpc'
import type { User, Facility, Resident, Transaction, ServiceBatch, PreAuthDebit, MonthlyPreAuthList, SignupInvitation, Invoice, InvoiceItem } from '../types'

export async function signInUser(email: string, password: string) { return rpcCall('signInUser', [email, password]) }
export async function signOutUser() { return rpcCall('signOutUser') }
export async function getCurrentUser() { return rpcCall('getCurrentUser') }

export async function createFacility(facilityData: Omit<Facility, 'id' | 'createdAt'>) { return rpcCall<Facility>('createFacility', [facilityData]) }
export async function getFacilities(companyId?: string) { return rpcCall<Facility[]>('getFacilities', [companyId]) }
export async function getFacilityById(id: string) { return rpcCall<Facility>('getFacilityById', [id]) }

export async function createResident(residentData: Omit<Resident, 'id' | 'createdAt'>) { return rpcCall<Resident>('createResident', [residentData]) }
export async function createResidentWithLinkedUser(params: { resident: Omit<Resident, 'id' | 'createdAt' | 'linkedUserId'>; poa?: { email: string; name: string } | null; residentEmail?: string | null }) { return rpcCall<Resident>('createResidentWithLinkedUser', [params]) }
export async function updateResident(id: string, updates: Partial<Resident>) { return rpcCall<Resident>('updateResident', [id, updates]) }
export async function getResidentsByFacility(facilityId: string) { return rpcCall<Resident[]>('getResidentsByFacility', [facilityId]) }
export async function getAllResidents() { return rpcCall<Resident[]>('getAllResidents') }
export async function getResidentById(id: string) { return rpcCall<Resident>('getResidentById', [id]) }

export async function createTransaction(transactionData: Omit<Transaction, 'id' | 'timestamp'>) { return rpcCall<Transaction>('createTransaction', [transactionData]) }
export async function getTransactionsByResident(residentId: string) { return rpcCall<Transaction[]>('getTransactionsByResident', [residentId]) }
export async function getTransactionsByFacility(facilityId: string, limit?: number) { return rpcCall<Transaction[]>('getTransactionsByFacility', [facilityId, limit]) }
export async function recordResidentWithdrawal(params: { residentId: string; facilityId: string; amount: number; method: 'cash' | 'cheque'; description: string; withdrawnBy: string }) { return rpcCall('recordResidentWithdrawal', [params]) }

export async function createServiceBatch(batchData: Omit<ServiceBatch, 'id' | 'createdAt' | 'items'>) { return rpcCall<any>('createServiceBatch', [batchData]) }
export async function getServiceBatchesByFacility(facilityId: string) { return rpcCall<ServiceBatch[]>('getServiceBatchesByFacility', [facilityId]) }
export async function getServiceBatchById(batchId: string) { return rpcCall<ServiceBatch | null>('getServiceBatchById', [batchId]) }
export async function addResidentToServiceBatch(batchId: string, residentId: string, amount: number) { return rpcCall('addResidentToServiceBatch', [batchId, residentId, amount]) }
export async function removeResidentFromServiceBatch(batchId: string, residentId: string) { return rpcCall('removeResidentFromServiceBatch', [batchId, residentId]) }
export async function updateServiceBatchItem(batchId: string, residentId: string, amount: number) { return rpcCall('updateServiceBatchItem', [batchId, residentId, amount]) }
export async function postServiceBatch(batchId: string, postedBy: string, chequeNumber?: string) { return rpcCall('postServiceBatch', [batchId, postedBy, chequeNumber]) }
export async function deleteServiceBatch(batchId: string) { return rpcCall('deleteServiceBatch', [batchId]) }

export async function createDepositBatchDb(facilityId: string, initiatedBy: string, entries: Array<{ residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>, notes?: string) { return rpcCall<any>('createDepositBatchDb', [facilityId, initiatedBy, entries, notes]) }
export async function getDepositBatchesByFacilityDb(facilityId: string) { return rpcCall<any[]>('getDepositBatchesByFacilityDb', [facilityId]) }
export async function getDepositBatchByIdDb(batchId: string) { return rpcCall<any | null>('getDepositBatchByIdDb', [batchId]) }
export async function addEntryToDepositBatchDb(batchId: string, entry: { residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }) { return rpcCall('addEntryToDepositBatchDb', [batchId, entry]) }
export async function updateDepositBatchEntryDb(batchId: string, entryId: string, updates: Partial<{ amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>) { return rpcCall('updateDepositBatchEntryDb', [batchId, entryId, updates]) }
export async function removeEntryFromDepositBatchDb(batchId: string, entryId: string) { return rpcCall('removeEntryFromDepositBatchDb', [batchId, entryId]) }
export async function postDepositBatchDb(batchId: string, processedBy: string) { return rpcCall('postDepositBatchDb', [batchId, processedBy]) }
export async function deleteDepositBatchDb(batchId: string) { return rpcCall('deleteDepositBatchDb', [batchId]) }

export async function getFacilitiesForVendor(vendorUserId: string) { return rpcCall<Facility[]>('getFacilitiesForVendor', [vendorUserId]) }
export async function createInvoiceDb(facilityId: string, vendorUserId: string) { return rpcCall<Invoice>('createInvoiceDb', [facilityId, vendorUserId]) }
export async function getInvoicesByVendorDb(vendorUserId: string, facilityId?: string) { return rpcCall<Invoice[]>('getInvoicesByVendorDb', [vendorUserId, facilityId]) }
export async function getInvoicesByFacilityDb(facilityId: string, status?: 'open' | 'submitted' | 'paid') { return rpcCall<Invoice[]>('getInvoicesByFacilityDb', [facilityId, status]) }
export async function addInvoiceItemDb(invoiceId: string, residentId: string, amount: number, description: string) { return rpcCall<InvoiceItem>('addInvoiceItemDb', [invoiceId, residentId, amount, description]) }
export async function updateInvoiceItemDb(invoiceId: string, itemId: string, updates: Partial<{ amount: number; description: string; residentId: string }>) { return rpcCall<InvoiceItem>('updateInvoiceItemDb', [invoiceId, itemId, updates]) }
export async function removeInvoiceItemDb(invoiceId: string, itemId: string) { return rpcCall('removeInvoiceItemDb', [invoiceId, itemId]) }
export async function submitInvoiceDb(invoiceId: string) { return rpcCall<Invoice>('submitInvoiceDb', [invoiceId]) }
export async function updateInvoiceOmNotesDb(invoiceId: string, omNotes: string) { return rpcCall<Invoice>('updateInvoiceOmNotesDb', [invoiceId, omNotes]) }
export async function markInvoicePaidDb(invoiceId: string, paidBy: string, omNotes?: string) { return rpcCall<Invoice>('markInvoicePaidDb', [invoiceId, paidBy, omNotes]) }
export async function updateInvoiceVendorDetailsDb(invoiceId: string, details: Partial<{ vendorName: string; vendorAddress: string; vendorEmail: string; invoiceDate: string }>) { return rpcCall<Invoice>('updateInvoiceVendorDetailsDb', [invoiceId, details]) }

export async function listVendorsForFacility(facilityId: string) { return rpcCall<Array<{ id: string; name: string; email: string }>>('listVendorsForFacility', [facilityId]) }
export async function createVendorUserAndLink(facilityId: string, email: string, name?: string, password?: string) { return rpcCall<User>('createVendorUserAndLink', [facilityId, email, name, password]) }
export async function unlinkVendorFromFacility(vendorUserId: string, facilityId: string) { return rpcCall('unlinkVendorFromFacility', [vendorUserId, facilityId]) }
export async function linkVendorToFacility(vendorUserId: string, facilityId: string) { return rpcCall('linkVendorToFacility', [vendorUserId, facilityId]) }

export async function createSignupInvitationForResident(residentData: { email: string; name: string; facilityId: string; isSelfManaged: boolean; poaEmail?: string; poaName?: string; residentId?: string }, invitedBy: string) { return rpcCall('createSignupInvitationForResident', [residentData, invitedBy]) }
export async function createSignupInvitation(facilityId: string, email: string, role: 'OM' | 'POA' | 'Resident', invitedBy: string) { return rpcCall<SignupInvitation>('createSignupInvitation', [facilityId, email, role, invitedBy]) }
export async function sendInvitationEmail(invitation: SignupInvitation, facilityName: string) { return rpcCall<boolean>('sendInvitationEmail', [invitation, facilityName]) }
export async function sendInviteByEmail(params: { email: string; role?: 'OM' | 'POA' | 'Resident'; facilityId?: string; residentId?: string; name?: string; redirectTo?: string }) { return rpcCall<boolean>('sendInviteByEmail', [params]) }

export async function getPreAuthDebitsByResident(residentId: string, month?: string) { return rpcCall<PreAuthDebit[]>('getPreAuthDebitsByResident', [residentId, month]) }
export async function getPreAuthDebitsByFacility(facilityId: string, month?: string) { return rpcCall<PreAuthDebit[]>('getPreAuthDebitsByFacility', [facilityId, month]) }
export async function createPreAuthDebit(preAuthDebitData: Omit<PreAuthDebit, 'id' | 'createdAt'>) { return rpcCall<PreAuthDebit>('createPreAuthDebit', [preAuthDebitData]) }
export async function updatePreAuthDebit(id: string, updates: Partial<PreAuthDebit>) { return rpcCall<PreAuthDebit>('updatePreAuthDebit', [id, updates]) }
export async function createMonthlyPreAuthList(facilityId: string, month: string) { return rpcCall<MonthlyPreAuthList>('createMonthlyPreAuthList', [facilityId, month]) }
export async function getMonthlyPreAuthList(facilityId: string, month: string) { return rpcCall<MonthlyPreAuthList | null>('getMonthlyPreAuthList', [facilityId, month]) }
export async function getFacilityMonthlyPreAuthLists(facilityId: string) { return rpcCall<MonthlyPreAuthList[]>('getFacilityMonthlyPreAuthLists', [facilityId]) }
export async function closeMonthlyPreAuthList(listId: string, closedBy: string) { return rpcCall<MonthlyPreAuthList>('closeMonthlyPreAuthList', [listId, closedBy]) }

export async function createOfficeManagerUser(facilityId: string, email: string, name?: string) { return rpcCall<User>('createOfficeManagerUser', [facilityId, email, name]) }
export async function getOmUsers(companyId?: string) { return rpcCall<User[]>('getOmUsers', [companyId]) }
export async function clearFacilityForUser(userId: string) { return rpcCall('clearFacilityForUser', [userId]) }

export function subscribeToResidentChanges(_facilityId: string, _cb: (r: Resident) => void) { return { unsubscribe() {} } }
export function subscribeToTransactionChanges(_facilityId: string, _cb: (t: Transaction) => void) { return { unsubscribe() {} } }
export function subscribeToServiceBatchChanges(_facilityId: string, _onChange: () => void) { return { unsubscribe() {} } }