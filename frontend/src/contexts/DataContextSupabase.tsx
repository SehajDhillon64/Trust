import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Facility, Resident, Transaction, ServiceBatch, ServiceBatchItem, PreAuthDebit, MonthlyPreAuthList, MonthlyCashBoxHistory, ManualMoneyEntry, BatchReport, DepositBatch, DepositBatchEntry, SignupInvitation, Invoice, InvoiceItem, Assignment } from '../types';
import { useAuth } from './AuthContext';
import {
  createResidentWithLinkedUser,
  createResident,
  updateResident as updateResidentDb,
  getResidentsByFacility,
  getResidentById,
  createTransaction,
  getTransactionsByResident,
  getTransactionsByFacility,
  createFacility,
  getFacilities,
  getFacilityById,
    createServiceBatch,
  getServiceBatchesByFacility,
  getServiceBatchById,
  addResidentToServiceBatch,
  removeResidentFromServiceBatch,
  updateServiceBatchItem,
  postServiceBatch,
  deleteServiceBatch,
  // deposit batch db functions
  createDepositBatchDb,
  getDepositBatchesByFacilityDb,
  postDepositBatchDb,
  deleteDepositBatchDb,
  subscribeToResidentChanges,
  subscribeToTransactionChanges,
  subscribeToServiceBatchChanges,
  createSignupInvitationForResident, createSignupInvitation, sendInvitationEmail as sendInvitationEmailDb,
  createPreAuthDebit,
  getPreAuthDebitsByResident,
  getPreAuthDebitsByFacility,
  updatePreAuthDebit,
  createMonthlyPreAuthList,
  getMonthlyPreAuthList,
  getFacilityMonthlyPreAuthLists,
  closeMonthlyPreAuthList,
  getAllResidents,
  addEntryToDepositBatchDb,
  updateDepositBatchEntryDb,
  removeEntryFromDepositBatchDb,
  getDepositBatchByIdDb,
  // invoice helpers
  getFacilitiesForVendor,
  createInvoiceDb,
  getInvoicesByVendorDb,
  getInvoicesByFacilityDb,
  addInvoiceItemDb,
  updateInvoiceItemDb,
  removeInvoiceItemDb,
  submitInvoiceDb,
  updateInvoiceOmNotesDb,
  markInvoicePaidDb,
  updateInvoiceVendorDetailsDb,
  linkVendorToFacility,
  recordResidentWithdrawal,
  createOfficeManagerUser,
  getOmUsers,
  clearFacilityForUser
} from '../services/database';
import { updateResidentMailPreference as updateResidentMailPreferenceDb } from '../services/database';
// Removed legacy emailService; using server-backed Supabase invites instead
// Import cash box functions from new service
import {
  getCashBoxBalance as getCashBoxBalanceDb,
  processCashBoxTransaction as processCashBoxTransactionDb,
  resetCashBoxMonthly as resetCashBoxMonthlyDb,
  getCashBoxTransactions,
  getMonthlyCashBoxHistory as getMonthlyCashBoxHistoryDb,
  subscribeToCashBoxBalance as subscribeToCashBoxBalanceDb,
  initializeCashBoxBalance as initializeCashBoxBalanceDb
} from '../services/cashbox-database';

interface DataContextType {
  residents: Resident[];
  transactions: Transaction[];
  facilities: Facility[];
  assignments: Assignment[];
  serviceBatches: ServiceBatch[];
  cashBoxBalances: Record<string, number>; // facilityId -> cash box balance
  monthlyCashBoxHistory: MonthlyCashBoxHistory[];
  manualMoneyEntries: ManualMoneyEntry[];
  batchReports: BatchReport[];
  preAuthDebits: PreAuthDebit[];
  monthlyPreAuthLists: MonthlyPreAuthList[];
  signupInvitations: SignupInvitation[];
  invoices: Invoice[];
  vendorFacilities?: Facility[];
  vendors: Array<{ id: string; name: string; email: string }>;
  isLoading: boolean;
  error: string | null;
  addResident: (resident: Omit<Resident, 'id' | 'createdAt'> & { 
    email?: string; 
    poaEmail?: string; 
    poaName?: string; 
    skipEmail?: boolean 
  }) => Promise<void>;
  updateResident: (id: string, updates: Partial<Resident>) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => Promise<void>;
  getResidentTransactions: (residentId: string) => Transaction[];
  getCashBoxTransactions: (facilityId: string) => Transaction[];
  updateBalance: (residentId: string, amount: number, type: 'credit' | 'debit') => Promise<void>;
  addFacility: (facility: Omit<Facility, 'id' | 'createdAt' | 'uniqueCode'>) => Promise<Facility>;
  updateFacility: (id: string, updates: Partial<Facility>) => Promise<void>;
  getFacilityResidents: (facilityId: string) => Resident[];
  getFacilityTransactions: (facilityId: string) => Transaction[];
  checkResidentIdExists: (residentId: string, facilityId: string) => boolean;
  addAssignment: (assignment: Omit<Assignment, 'id' | 'assignedAt'>) => void;
  deleteAssignment: (assignmentId: string) => void;
  getFacilityAssignments: (facilityId: string) => Assignment[];
  generateUniqueCode: (prefix?: string) => string;
  getCashBoxBalance: (facilityId: string) => number;
  updateCashBoxBalance: (facilityId: string, balance: number) => void;
  getTotalTrustBalance: (facilityId: string) => number;
  getMonthlyTransactionHistory: (residentId: string, year: number, month: number) => Transaction[];
  generateMonthlyReport: (residentId: string, year: number, month: number) => {
    transactions: Transaction[];
    totalCredits: number;
    totalDebits: number;
    netChange: number;
    startingBalance: number;
    endingBalance: number;
  };
  // Cash box additional functions
  resetCashBoxToMonthlyAmount: (facilityId: string, userId: string) => Promise<void>;
  getMonthlyCashBoxHistory: (facilityId: string, year?: number, month?: number) => MonthlyCashBoxHistory[];
  getMonthlyManualMoneyReport: (facilityId: string, year?: number, month?: number) => ManualMoneyEntry[];
  getBatchReports: (facilityId: string) => BatchReport[];
  closeResidentTrust: (residentId: string, options?: { method?: 'cash' | 'cheque'; note?: string }) => Promise<{ success: boolean; error?: string }>;
  // Service Batch functions
  createServiceBatch: (serviceType: ServiceBatch['serviceType'], facilityId: string, createdBy: string) => Promise<string>;
  addResidentToBatch: (batchId: string, residentId: string, amount: number) => Promise<void>;
  removeResidentFromBatch: (batchId: string, residentId: string) => Promise<void>;
  updateBatchItem: (batchId: string, residentId: string, amount: number) => Promise<void>;
  postServiceBatch: (batchId: string, postedBy: string, chequeNumber?: string) => Promise<void>;
  deleteOpenServiceBatch?: (batchId: string) => Promise<{ success: boolean; error?: string }>;
  getFacilityServiceBatches: (facilityId: string, serviceType?: ServiceBatch['serviceType']) => ServiceBatch[];
  getServiceBatch: (batchId: string) => ServiceBatch | undefined;
  refreshData: () => Promise<void>;
  // Pre-Auth Debit functions
  addPreAuthDebit: (preAuthDebit: Omit<PreAuthDebit, 'id' | 'createdAt'>) => Promise<void>;
  updatePreAuthDebit: (id: string, updates: Partial<PreAuthDebit>) => Promise<void>;
  getResidentPreAuthDebits: (residentId: string, month?: string) => PreAuthDebit[];
  getFacilityPreAuthDebits: (facilityId: string, month?: string) => PreAuthDebit[];
  // Monthly Pre-Auth List functions
  createMonthlyPreAuthList: (facilityId: string, month: string) => string;
  closeMonthlyPreAuthList: (listId: string, closedBy: string) => void;
  getMonthlyPreAuthList: (facilityId: string, month: string) => MonthlyPreAuthList | undefined;
  getFacilityMonthlyPreAuthLists: (facilityId: string) => MonthlyPreAuthList[];
  generatePreAuthListReport: (listId: string) => string;
  // Additional pre-auth functions
  getMonthlyPreAuthDebits: (month: string) => PreAuthDebit[];
  processPreAuthDebit: (debitId: string) => Promise<{ success: boolean; error?: string }>;
  processAllPreAuthDebits: (debitIds: string[]) => Promise<{ successCount: number; failedCount: number; errors: Array<{ debitId: string; error: string }> }>;
  // Deposit batch functions
  createDepositBatch: (facilityId: string, entries: Array<{ residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>, description?: string) => Promise<{ success: boolean; batchId?: string; error?: string }>;
  createDepositBatchRemote?: (facilityId: string, entries: Array<{ residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>, description?: string) => Promise<{ success: boolean; batchId?: string; error?: string }>;
  getDepositBatches: (facilityId: string, status?: 'open' | 'closed') => DepositBatch[];
  closeDepositBatch: (batchId: string) => Promise<{ success: boolean; error?: string }>;
  closeDepositBatchRemote?: (batchId: string) => Promise<{ success: boolean; error?: string }>;
  addEntryToDepositBatch?: (batchId: string, entry: { residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }) => Promise<{ success: boolean; error?: string }>;
  updateDepositBatchEntry?: (batchId: string, entryId: string, updates: Partial<{ amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>) => Promise<{ success: boolean; error?: string }>;
  removeEntryFromDepositBatch?: (batchId: string, entryId: string) => Promise<{ success: boolean; error?: string }>;
  deleteOpenDepositBatch?: (batchId: string) => Promise<{ success: boolean; error?: string }>;
  createCashBoxTransaction: (
    facilityId: string,
    type: 'withdrawal' | 'deposit',
    amount: number,
    description: string,
    residentId?: string
  ) => Promise<{ success: boolean; balance?: number; error?: string }>;
    // Admin: create OM directly (auth.users then public.users)
  createOfficeManagerAccount: (facilityId: string, email: string, name?: string) => Promise<User>;
  // Newly exposed invitation helpers
  createSignupInvitation: (facilityId: string, email: string, role: 'OM' | 'POA' | 'Resident', invitedBy: string) => Promise<SignupInvitation>;
  sendInvitationEmail: (invitation: SignupInvitation, facilityName: string) => Promise<boolean>;
  sendInviteByEmail: (params: { email: string; role?: 'OM' | 'POA' | 'Resident'; facilityId?: string; residentId?: string; name?: string; redirectTo?: string }) => Promise<boolean>;
  provisionUser: (params: { email: string; name?: string; role: 'OM' | 'POA' | 'Resident'; facilityId?: string; residentId?: string; communityName?: string }) => Promise<{ success: boolean }>;
  // Invoices
  getFacilityInvoices: (facilityId: string, status?: 'open' | 'submitted' | 'paid') => Invoice[];
  getVendorInvoices: (vendorUserId: string, facilityId?: string) => Invoice[];
  createInvoice: (facilityId: string) => Promise<Invoice>;
  addInvoiceItem: (invoiceId: string, residentId: string, amount: number, description: string) => Promise<void>;
  updateInvoiceItem: (invoiceId: string, itemId: string, updates: Partial<{ amount: number; description: string; residentId: string }>) => Promise<void>;
  removeInvoiceItem: (invoiceId: string, itemId: string) => Promise<void>;
  submitInvoice: (invoiceId: string) => Promise<void>;
  updateInvoiceOmNotes: (invoiceId: string, notes: string) => Promise<void>;
  markInvoicePaid: (invoiceId: string, notes?: string) => Promise<void>;
  updateInvoiceVendorDetails: (invoiceId: string, details: Partial<{ vendorName: string; vendorAddress: string; vendorEmail: string; invoiceDate: string }>) => Promise<void>;
  linkVendorToFacility: (facilityId: string, vendorUserId?: string) => Promise<void>;
  // Vendor management for OM
  refreshVendorsForFacility?: (facilityId: string) => Promise<void>;
  addVendorToFacility?: (facilityId: string, email: string, name?: string, password?: string) => Promise<void>;
  unlinkVendorFromFacility?: (vendorUserId: string, facilityId: string) => Promise<void>;
  // Office Manager admin helpers
  listOfficeManagers: () => Promise<User[]>;
  clearOfficeManagerFacility: (userId: string) => Promise<void>;
  updateResidentMailPreference: (residentId: string, preference: 'resident_room' | 'reception' | 'other', note?: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, currentFacility, isAuthenticated } = useAuth();
  
  // State
  const [residents, setResidents] = useState<Resident[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [serviceBatches, setServiceBatches] = useState<ServiceBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pre-auth debits state
  const [preAuthDebits, setPreAuthDebits] = useState<PreAuthDebit[]>([]);
  const [monthlyPreAuthLists, setMonthlyPreAuthLists] = useState<MonthlyPreAuthList[]>([]);
  
  // Mock data for features not yet implemented with Supabase
  const [assignments] = useState<Assignment[]>([]);
  const [cashBoxBalances, setCashBoxBalances] = useState<Record<string, number>>({});
  const [monthlyCashBoxHistory] = useState<MonthlyCashBoxHistory[]>([]);
  const [manualMoneyEntries] = useState<ManualMoneyEntry[]>([]);
  const [batchReports] = useState<BatchReport[]>([]);
  const [signupInvitations] = useState<SignupInvitation[]>([]);
  const [depositBatches, setDepositBatches] = useState<DepositBatch[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vendorFacilities, setVendorFacilities] = useState<Facility[]>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string; email: string }>>([]);

  // Load initial data and set up subscriptions
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
      
      // Set up subscriptions only if we have a facility
      if (currentFacility) {
        const reloadServiceBatches = async () => {
          try {
            const latest = await getServiceBatchesByFacility(currentFacility.id);
            setServiceBatches(latest as ServiceBatch[]);
          } catch (e) {
          }
        };
        // Set up subscriptions
        const residentSub = subscribeToResidentChanges(currentFacility.id, (change) => {
          refreshData();
        });
        
        const transactionSub = subscribeToTransactionChanges(currentFacility.id, (change) => {
          refreshData();
        });

        const serviceBatchesSub = subscribeToServiceBatchChanges(currentFacility.id, () => {
          reloadServiceBatches();
        });

        // Set up cash box subscription
        const cashBoxSub = subscribeToCashBoxBalanceDb(currentFacility.id, (balance) => {
          setCashBoxBalances(prev => ({
            ...prev,
            [currentFacility.id]: balance
          }));
        });
        
        return () => {
          residentSub.unsubscribe();
          transactionSub.unsubscribe();
          serviceBatchesSub.unsubscribe();
          cashBoxSub.unsubscribe();
        };
      }
    }
  }, [isAuthenticated, currentFacility?.id, user?.role]);

  // Load cash box balance for current facility and subscribe to changes
  useEffect(() => {
    if (currentFacility && user) {
      const loadCashBoxBalance = async () => {
        // First ensure balance is initialized
        await initializeCashBoxBalanceDb(currentFacility.id, user.id);
        
        // Load initial balance
        const balance = await getCashBoxBalanceDb(currentFacility.id);
        setCashBoxBalances(prev => ({
          ...prev,
          [currentFacility.id]: balance
        }));
      };
      
      loadCashBoxBalance();

      // Subscribe to balance changes
      const subscription = subscribeToCashBoxBalanceDb(
        currentFacility.id,
        (newBalance) => {
          setCashBoxBalances(prev => ({
            ...prev,
            [currentFacility.id]: newBalance
          }));
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [currentFacility?.id, user?.id]);

  const refreshData = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Vendor-specific loading
      if (user.role === 'Vendor') {
        // Prefer facility from users table if present
        if (user.facilityId) {
          const facilityData = await getFacilityById(user.facilityId);
          setFacilities([facilityData]);
          try {
            const [residentsData, vendorInvs] = await Promise.all([
              getResidentsByFacility(user.facilityId),
              getInvoicesByVendorDb(user.id)
            ]);
            setResidents(residentsData);
            setInvoices(vendorInvs);
          } catch (e) {
          }
          setIsLoading(false);
          return;
        }

        // Fallback: Load facilities the vendor is linked to via vendor_facilities
        const vendorFacs = await getFacilitiesForVendor(user.id);
        setFacilities(vendorFacs);

        // Load residents for those facilities for resident pickers
        try {
          const residentsByFacility = await Promise.all(
            vendorFacs.map(f => getResidentsByFacility(f.id))
          );
          setResidents(residentsByFacility.flat());
        } catch (e) {
        }

        // Load vendor invoices
        try {
          const vendorInvs = await getInvoicesByVendorDb(user.id);
          setInvoices(vendorInvs);
        } catch (e) {
        }

        setIsLoading(false);
        return;
      }

      // For POA/Resident users, we need to find their linked resident first
      if (user.role === 'POA' || user.role === 'Resident') {
        // Faster path: resolve linked resident via backend using cookie/bearer
        const API_BASE = ((((import.meta as any)?.env?.VITE_BACKEND_URL) || 'https://trust-3.onrender.com') as string).replace(/\/+$/, '');
        let linkedResident: Resident | null = null;
        try {
          const resp = await fetch(`${API_BASE}/api/residents/me`, { credentials: 'include' });
          if (resp.ok) {
            const r = await resp.json();
            if (r && r.id) {
              linkedResident = {
                id: r.id,
                residentId: r.resident_id || r.residentId,
                name: r.name,
                dob: r.dob,
                trustBalance: Number(r.trust_balance ?? r.trustBalance ?? 0),
                isSelfManaged: !!(r.is_self_managed ?? r.isSelfManaged),
                linkedUserId: r.linked_user_id || r.linkedUserId,
                ltcUnit: r.ltc_unit || r.ltcUnit,
                status: r.status,
                createdAt: r.created_at || r.createdAt,
                facilityId: r.facility_id || r.facilityId,
                bankDetails: r.bank_details || r.bankDetails,
                allowedServices: r.allowed_services || r.allowedServices || { haircare:false, footcare:false, pharmacy:false, cable:false, wheelchairRepair:false, miscellaneous:false },
                serviceAuthorizations: r.service_authorizations || r.serviceAuthorizations,
                mailDeliveryPreference: r.mail_delivery_preference || r.mailDeliveryPreference || undefined,
                mailDeliveryNote: r.mail_delivery_note || r.mailDeliveryNote || undefined,
              } as any;
            }
          }
        } catch {}

        if (linkedResident && linkedResident.facilityId) {
          const facilityData = await getFacilityById(linkedResident.facilityId);
          setFacilities([facilityData]);

          const [residentsData, transactionsData, preAuthDebitsData, cashBoxBalance] = await Promise.all([
            getResidentsByFacility(linkedResident.facilityId),
            getTransactionsByFacility(linkedResident.facilityId, 50),
            getPreAuthDebitsByFacility(linkedResident.facilityId),
            getCashBoxBalanceDb(linkedResident.facilityId)
          ]);

          setResidents(residentsData);
          setTransactions(transactionsData);
          setPreAuthDebits(preAuthDebitsData);

          setCashBoxBalances(prev => ({
            ...prev,
            [linkedResident.facilityId]: cashBoxBalance
          }));
        } else {
          // Minimal fallback: avoid loading every resident for performance
          setResidents([]);
        }
      } else {
        // Original logic for Admin and OM users
        // Load facilities
        if (user.role === 'Admin') {
          const facilitiesData = await getFacilities(user.companyId);
          setFacilities(facilitiesData);

          // Also load residents for all facilities so admin overview shows counts and balances
          try {
            const residentsByFacility = await Promise.all(
              facilitiesData.map(f => getResidentsByFacility(f.id))
            );
            setResidents(residentsByFacility.flat());
          } catch (e) {
          }
        } else if (currentFacility) {
          const facilityData = await getFacilityById(currentFacility.id);
          setFacilities([facilityData]);
        }

        // Load facility-specific data
        if (currentFacility) {
          const [residentsData, transactionsData, serviceBatchesData, preAuthDebitsData, monthlyPreAuthListsData, cashBoxBalance, depositBatchesData, facilityInvoices] = await Promise.all([
            getResidentsByFacility(currentFacility.id),
            getTransactionsByFacility(currentFacility.id, 50),
            getServiceBatchesByFacility(currentFacility.id),
            getPreAuthDebitsByFacility(currentFacility.id),
            getFacilityMonthlyPreAuthLists(currentFacility.id),
            getCashBoxBalanceDb(currentFacility.id),
            getDepositBatchesByFacilityDb(currentFacility.id),
            getInvoicesByFacilityDb(currentFacility.id)
          ]);

          setResidents(residentsData);
          setTransactions(transactionsData);
          setServiceBatches(serviceBatchesData as ServiceBatch[]);
          setPreAuthDebits(preAuthDebitsData);
          setMonthlyPreAuthLists(monthlyPreAuthListsData);
          setDepositBatches(depositBatchesData);
          setInvoices(facilityInvoices);
          // Load vendors for OM view
          try {
            const { listVendorsForFacility } = await import('../services/database');
            const v = await listVendorsForFacility(currentFacility.id);
            setVendors(v);
          } catch (e) {
          }
          
          // Update cash box balance
          setCashBoxBalances(prev => ({
            ...prev,
            [currentFacility.id]: cashBoxBalance
          }));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Resident functions
  const addResident = async (residentData: Omit<Resident, 'id' | 'createdAt'> & { 
    email?: string; 
    poaEmail?: string; 
    poaName?: string; 
    skipEmail?: boolean 
  }) => {
    try {
      // Only skip email setup when explicitly requested
      if (!residentData.skipEmail) {
        // Self-managed with resident email
        if (residentData.isSelfManaged && residentData.email) {
          const newResident = await createResidentWithLinkedUser({
            resident: {
              residentId: residentData.residentId,
              name: residentData.name,
              dob: residentData.dob,
              trustBalance: residentData.trustBalance,
              isSelfManaged: residentData.isSelfManaged,
              ltcUnit: residentData.ltcUnit,
              status: residentData.status,
              facilityId: residentData.facilityId,
              bankDetails: residentData.bankDetails,
              allowedServices: residentData.allowedServices,
              serviceAuthorizations: residentData.serviceAuthorizations,
              id: '' as any,
              createdAt: '' as any,
            } as any,
            residentEmail: residentData.email,
            poa: null
          });
          setResidents(prev => [...prev, newResident]);
          return;
        }

        // POA-managed with POA details
        if (!residentData.isSelfManaged && residentData.poaEmail && residentData.poaName) {
          const newResident = await createResidentWithLinkedUser({
            resident: {
              residentId: residentData.residentId,
              name: residentData.name,
              dob: residentData.dob,
              trustBalance: residentData.trustBalance,
              isSelfManaged: residentData.isSelfManaged,
              ltcUnit: residentData.ltcUnit,
              status: residentData.status,
              facilityId: residentData.facilityId,
              bankDetails: residentData.bankDetails,
              allowedServices: residentData.allowedServices,
              serviceAuthorizations: residentData.serviceAuthorizations,
              id: '' as any,
              createdAt: '' as any,
            } as any,
            poa: { email: residentData.poaEmail, name: residentData.poaName },
            residentEmail: null
          });
          setResidents(prev => [...prev, newResident]);
          return;
        }
      }

      // Fallback: create resident without email setup
      const newResident = await createResident(residentData);
      setResidents(prev => [...prev, newResident]);

    
    } catch (err) {
      throw err;
    }
  };

  const updateResident = async (id: string, updates: Partial<Resident>) => {
    try {
      const updatedResident = await updateResidentDb(id, updates);
      setResidents(prev => 
        prev.map(r => r.id === id ? updatedResident : r)
      );
    } catch (err) {
      throw err;
    }
  };

  const updateResidentMailPreference = async (residentId: string, preference: 'resident_room' | 'reception' | 'other', note?: string) => {
    try {
      const updated = await updateResidentMailPreferenceDb(residentId, preference, note);
      setResidents(prev => prev.map(r => r.id === residentId ? { ...r, mailDeliveryPreference: updated.mailDeliveryPreference, mailDeliveryNote: updated.mailDeliveryNote } : r));
    } catch (e) {
      throw e;
    }
  };

  // Transaction functions
  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'timestamp'>) => {
    try {
      const newTransaction = await createTransaction(transactionData);
      setTransactions(prev => [newTransaction, ...prev]);
      
      // Update resident balance locally for immediate feedback
      setResidents(prev => 
        prev.map(r => {
          if (r.id === transactionData.residentId) {
            const balanceChange = transactionData.type === 'credit' 
              ? transactionData.amount 
              : -transactionData.amount;
            return { ...r, trustBalance: r.trustBalance + balanceChange };
          }
          return r;
        })
      );

      // Save resident withdrawals into dedicated table for reporting (cash/cheque only)
      if (transactionData.type === 'debit' && (transactionData.method === 'cash' || transactionData.method === 'cheque') && currentFacility) {
        try {
          await recordResidentWithdrawal({
            residentId: transactionData.residentId,
            facilityId: currentFacility.id,
            amount: transactionData.amount,
            method: transactionData.method,
            description: transactionData.description,
            withdrawnBy: transactionData.createdBy
          });
        } catch (e) {
        }
      }

      // Update cash box when dealing with cash transactions
      if (currentFacility && transactionData.method === 'cash') {
        const cashBoxTransactionType = transactionData.type === 'credit' ? 'deposit' : 'withdrawal';
        const cashBoxDescription = `${transactionData.type === 'credit' ? 'Deposit' : 'Withdrawal'} - ${transactionData.description || ''} (Resident: ${residents.find(r => r.id === transactionData.residentId)?.name || 'Unknown'})`;
        
        // Process cash box transaction
        await processCashBoxTransactionDb(
          currentFacility.id,
          cashBoxTransactionType,
          transactionData.amount,
          cashBoxDescription,
          transactionData.residentId,
          transactionData.createdBy,
          generateUniqueCode('CBT')
        );
      }
    } catch (err) {
      throw err;
    }
  };

  const updateBalance = async (residentId: string, amount: number, type: 'credit' | 'debit') => {
    if (!user || !currentFacility) return;

    const transactionData: Omit<Transaction, 'id' | 'timestamp'> = {
      residentId,
      facilityId: currentFacility.id,
      type,
      amount,
      method: 'manual',
      description: `${type === 'credit' ? 'Credit' : 'Debit'} adjustment`,
      createdBy: user.id
    };

    await addTransaction(transactionData);
  };

  // Close resident trust: debit remaining balance, mark inactive, and log in resident_withdrawals
  const closeResidentTrust = async (
    residentId: string,
    options?: { method?: 'cash' | 'cheque'; note?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user || !currentFacility) {
        return { success: false, error: 'Not authenticated or no facility' };
      }
      const resident = residents.find(r => r.id === residentId);
      if (!resident) return { success: false, error: 'Resident not found' };
      const remaining = Number(resident.trustBalance || 0);
      // Update status to inactive first
      await updateResidentDb(residentId, { status: 'inactive' });
            if (remaining > 0) {
        // 1) Create a debit transaction to zero out trust
        await addTransaction({
          residentId,
          facilityId: currentFacility.id,
          type: 'debit',
          amount: remaining,
          method: options?.method ?? 'cash',
          description: options?.note || 'Close trust balance withdrawal',
          createdBy: user.id
        });
        // recordResidentWithdrawal occurs within addTransaction for debit cash/cheque

      }
      await refreshData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  };

  // Facility functions
  const addFacility = async (facilityData: Omit<Facility, 'id' | 'createdAt' | 'uniqueCode'>): Promise<Facility> => {
    try {
      // Prevent vendors from creating facilities
      if (user?.role === 'Vendor') {
        throw new Error('Vendors are not permitted to create facilities');
      }

      const facilityWithCode = {
        ...facilityData,
        uniqueCode: generateUniqueCode(),
        companyId: user?.companyId as any
      };
      
      const newFacility = await createFacility(facilityWithCode);
      setFacilities(prev => [...prev, newFacility]);
      return newFacility;
    } catch (err) {
      throw err;
    }
  };

  const updateFacility = async (id: string, updates: Partial<Facility>) => {
    // TODO: Implement updateFacility in database service
  };

  // Service batch functions
  const createServiceBatchFn = async (serviceType: ServiceBatch['serviceType'], facilityId: string, createdBy: string): Promise<string> => {
    try {
      const batchData = {
        facilityId,
        serviceType,
        status: 'open' as const,
        createdBy,
        totalAmount: 0,
        processedCount: 0
      };
      
      const created = await createServiceBatch(batchData);
      const newBatchId = created.id;
      // Immediately fetch full batch and update local state so UI reflects without refresh
      const full = await getServiceBatchById(newBatchId);
      if (full) {
        setServiceBatches(prev => [full, ...prev]);
      }
      return newBatchId;
    } catch (err) {
      throw err;
    }
  };

  // Helper functions
  const getResidentTransactions = (residentId: string): Transaction[] => {
    return transactions.filter(t => t.residentId === residentId);
  };
  // Helper functions
  const getCashBoxTransactions = (facilityId: string): Transaction[] => {
    return transactions.filter(t => t.facilityId === facilityId);
  };

  const getFacilityResidents = (facilityId: string): Resident[] => {
    return residents.filter(r => r.facilityId === facilityId);
  };

  const getFacilityTransactions = (facilityId: string): Transaction[] => {
    return transactions.filter(t => t.facilityId === facilityId);
  };

  const checkResidentIdExists = (residentId: string, facilityId: string): boolean => {
    return residents.some(r => r.residentId === residentId && r.facilityId === facilityId);
  };

  const generateUniqueCode = (prefix: string = ''): string => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const getCashBoxBalance = (facilityId: string): number => {
    return cashBoxBalances[facilityId] || 0;
  };

  const updateCashBoxBalance = async (facilityId: string, balance: number) => {
    // This function should not be called directly anymore
    // Use cash box transactions instead
  };

  // New cash box transaction function
  const createCashBoxTransaction = async (
    facilityId: string,
    type: 'withdrawal' | 'deposit',
    amount: number,
    description: string,
    residentId?: string
  ): Promise<{ success: boolean; balance?: number; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const transactionId = generateUniqueCode('CBT');
    const result = await processCashBoxTransactionDb(
      facilityId,
      type,
      amount,
      description,
      residentId || null,
      user.id,
      transactionId
    );

    if (result.success && result.balance !== undefined) {
      setCashBoxBalances(prev => ({
        ...prev,
        [facilityId]: result.balance!
      }));
    }

    return result;
  };

  const getTotalTrustBalance = (facilityId: string): number => {
    return residents
      .filter(r => r.facilityId === facilityId)
      .reduce((total, r) => total + r.trustBalance, 0);
  };

  const getMonthlyTransactionHistory = (residentId: string, year: number, month: number): Transaction[] => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.timestamp);
      return t.residentId === residentId &&
        transactionDate.getFullYear() === year &&
        transactionDate.getMonth() === month - 1;
    });
  };

  const generateMonthlyReport = (residentId: string, year: number, month: number) => {
    const monthlyTransactions = getMonthlyTransactionHistory(residentId, year, month);
    
    const totalCredits = monthlyTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalDebits = monthlyTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netChange = totalCredits - totalDebits;
    
    const resident = residents.find(r => r.id === residentId);
    const currentBalance = resident?.trustBalance || 0;
    const startingBalance = currentBalance - netChange;
    
    return {
      transactions: monthlyTransactions,
      totalCredits,
      totalDebits,
      netChange,
      startingBalance,
      endingBalance: currentBalance
    };
  };

  // Mock implementations for features not yet implemented
  const addAssignment = (assignment: Omit<Assignment, 'id' | 'assignedAt'>) => {
  };

  const deleteAssignment = (assignmentId: string) => {
  };

  const getFacilityAssignments = (facilityId: string): Assignment[] => {
    return assignments.filter(a => a.facilityId === facilityId);
  };

  const addResidentToBatch = async (batchId: string, residentId: string, amount: number) => {
    try {
      await addResidentToServiceBatch(batchId, residentId, amount);
      // Fetch updated batch and update local state immediately
      const updated = await getServiceBatchById(batchId);
      if (updated) {
        setServiceBatches(prev => prev.map(b => (b.id === batchId ? updated : b)));
      }
    } catch (error) {
      throw error;
    }
  };

  const removeResidentFromBatch = async (batchId: string, residentId: string) => {
    try {
      await removeResidentFromServiceBatch(batchId, residentId);
      // Fetch updated batch and update local state immediately
      const updated = await getServiceBatchById(batchId);
      if (updated) {
        setServiceBatches(prev => prev.map(b => (b.id === batchId ? updated : b)));
      }
    } catch (error) {
      throw error;
    }
  };

  const updateBatchItem = async (batchId: string, residentId: string, amount: number) => {
    try {
      await updateServiceBatchItem(batchId, residentId, amount);
      // Fetch updated batch and update local state immediately instead of full refresh
      const updated = await getServiceBatchById(batchId);
      if (updated) {
        setServiceBatches(prev => prev.map(b => (b.id === batchId ? updated : b)));
      }
    } catch (error) {
      throw error;
    }
  };

  const postServiceBatchFn = async (batchId: string, postedBy: string, chequeNumber?: string) => {
    try {
      await postServiceBatch(batchId, postedBy, chequeNumber);
      // Refresh only service batches to avoid heavy reload
      if (currentFacility) {
        const latest = await getServiceBatchesByFacility(currentFacility.id);
        setServiceBatches(latest as ServiceBatch[]);
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteOpenServiceBatch = async (batchId: string) => {
    try {
      await deleteServiceBatch(batchId);
      if (currentFacility) {
        const latest = await getServiceBatchesByFacility(currentFacility.id);
        setServiceBatches(latest as ServiceBatch[]);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete batch' };
    }
  };

  const getServiceBatch = (batchId: string): ServiceBatch | undefined => {
    return serviceBatches.find(batch => batch.id === batchId);
  };

  const getFacilityServiceBatches = (facilityId: string, serviceType?: ServiceBatch['serviceType']): ServiceBatch[] => {
    return serviceBatches
      .filter(batch => batch.facilityId === facilityId && (!serviceType || batch.serviceType === serviceType))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  // Pre-Auth Debit functions
  const addPreAuthDebit = async (preAuthDebitData: Omit<PreAuthDebit, 'id' | 'createdAt'>) => {
    try {
      const newPreAuthDebit = await createPreAuthDebit(preAuthDebitData);
      setPreAuthDebits(prev => [newPreAuthDebit, ...prev]);
    } catch (err) {
      throw err;
    }
  };

  const updatePreAuthDebitFn = async (id: string, updates: Partial<PreAuthDebit>) => {
    try {
      const updatedPreAuthDebit = await updatePreAuthDebit(id, updates);
      setPreAuthDebits(prev => 
        prev.map(debit => debit.id === id ? updatedPreAuthDebit : debit)
      );
    } catch (err) {
      throw err;
    }
  };

  const getResidentPreAuthDebits = (residentId: string, month?: string): PreAuthDebit[] => {
    return preAuthDebits.filter(debit => 
      debit.residentId === residentId && 
      debit.isActive && 
      (month ? debit.targetMonth === month : true)
    );
  };

  const getFacilityPreAuthDebits = (facilityId: string, month?: string): PreAuthDebit[] => {
    return preAuthDebits.filter(debit => 
      debit.facilityId === facilityId && 
      debit.isActive && 
      (month ? debit.targetMonth === month : true)
    );
  };

  // Monthly Pre-Auth List functions
  const createMonthlyPreAuthListFn = (facilityId: string, month: string) => {
    // For now, return a generated ID and handle async creation in background
    createMonthlyPreAuthList(facilityId, month)
      .then(newList => {
        setMonthlyPreAuthLists(prev => [newList, ...prev]);
      })
      .catch(err => {
      });
    
    // Return a temporary ID (in real implementation, this should be async)
    return `temp-${Date.now()}`;
  };

  const closeMonthlyPreAuthListFn = (listId: string, closedBy: string): void => {
    closeMonthlyPreAuthList(listId, closedBy)
      .then(updatedList => {
        setMonthlyPreAuthLists(prev => 
          prev.map(list => list.id === listId ? updatedList : list)
        );
      })
      .catch(err => {
      });
  };

  const getMonthlyPreAuthListFn = (facilityId: string, month: string): MonthlyPreAuthList | undefined => {
    return monthlyPreAuthLists.find(list => 
      list.facilityId === facilityId && list.month === month
    );
  };

  const getFacilityMonthlyPreAuthListsFn = (facilityId: string): MonthlyPreAuthList[] => {
    return monthlyPreAuthLists.filter(list => list.facilityId === facilityId);
  };

  const generatePreAuthListReport = (listId: string): string => {
    const list = monthlyPreAuthLists.find(l => l.id === listId);
    if (!list) return 'List not found';

    const [year, month] = list.month.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' });
    
    const reportContent = [
      `Pre-Authorization Debit List - ${monthName} ${year}`,
      `Facility ID: ${list.facilityId}`,
      `Status: ${list.status.toUpperCase()}`,
      `Created: ${new Date(list.createdAt).toLocaleDateString()}`,
      `Total Amount: $${list.totalAmount.toFixed(2)}`,
      '',
      'AUTHORIZATIONS:',
      '='.repeat(80),
      ...list.authorizations.map(auth => {
        const resident = residents.find(r => r.id === auth.residentId);
        return [
          `Resident: ${resident?.name || 'Unknown'}`,
          `Amount: $${auth.amount.toFixed(2)} (${auth.type.toUpperCase()})`,
          `Description: ${auth.description}`,
          `Authorized: ${new Date(auth.authorizedDate).toLocaleDateString()}`,
          `Status: ${auth.status}`,
          '-'.repeat(40)
        ].join('\n');
      }),
      '',
      `Total Authorizations: ${list.authorizations.length}`,
      `Grand Total: $${list.totalAmount.toFixed(2)}`
    ].join('\n');

    return reportContent;
  };

  const getMonthlyPreAuthDebits = (month: string): PreAuthDebit[] => {
    return preAuthDebits.filter(debit => debit.targetMonth === month && debit.isActive);
  };

  const processPreAuthDebit = async (debitId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const debit = preAuthDebits.find(d => d.id === debitId);
      if (!debit) return { success: false, error: 'Pre-auth debit not found' };
      
      const resident = residents.find(r => r.id === debit.residentId);
      if (!resident) return { success: false, error: 'Resident not found' };

      // Check if debit type and validate balance for debit operations
      if (debit.type === 'debit' && resident.trustBalance < debit.amount) {
        return { success: false, error: 'Insufficient funds in resident account' };
      }

      // Create transaction for the pre-auth debit
      const transactionData = {
        residentId: debit.residentId,
        facilityId: debit.facilityId,
        type: debit.type,
        amount: debit.amount,
        method: 'manual' as const,
        description: `Pre-authorized ${debit.type}: ${debit.description}`,
        createdBy: user?.id || '',
      };

      // Add the transaction
      await addTransaction(transactionData);

      // Update pre-auth debit status to processed
      await updatePreAuthDebitFn(debitId, { 
        status: 'processed', 
        processedAt: new Date().toISOString() 
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to process pre-auth debit' };
    }
  };

  const processAllPreAuthDebits = async (debitIds: string[]): Promise<{ successCount: number; failedCount: number; errors: Array<{ debitId: string; error: string }> }> => {
    const errors: Array<{ debitId: string; error: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    // Run with bounded concurrency to avoid UI lag and server overload
    const concurrency = Math.min(4, Math.max(1, navigator?.hardwareConcurrency ? Math.floor(navigator.hardwareConcurrency / 2) : 4));
    let index = 0;

    const worker = async () => {
      while (true) {
        const currentIndex = index++;
        if (currentIndex >= debitIds.length) break;
        const debitId = debitIds[currentIndex];
        try {
          const result = await processPreAuthDebit(debitId);
          if (result.success) {
            successCount++;
          } else {
            failedCount++;
            errors.push({ debitId, error: result.error || 'Unknown error' });
          }
        } catch (err: any) {
          failedCount++;
          errors.push({ debitId, error: err?.message || 'Unknown error' });
        }
      }
    };

    await Promise.all(new Array(concurrency).fill(0).map(() => worker()));

    return { successCount, failedCount, errors };
  };

  // Deposit batch functions (existing/local)
  const createDepositBatch = async (facilityId: string, entries: Array<{ residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>, description?: string) => {
    try {
      const batchData: DepositBatch = {
        id: `BATCH-${Date.now()}`,
        facilityId,
        status: 'open' as const,
        createdBy: user?.id || '',
        createdAt: new Date().toISOString(),
        description: description || '',
        totalAmount: entries.reduce((sum, e) => sum + e.amount, 0),
        totalCash: entries.filter(e => e.method === 'cash').reduce((sum, e) => sum + e.amount, 0),
        totalCheques: entries.filter(e => e.method === 'cheque').reduce((sum, e) => sum + e.amount, 0),
        entries: entries.map((entry, index) => ({
          id: `ENTRY-${Date.now()}-${index}`,
          residentId: entry.residentId,
          amount: entry.amount,
          method: entry.method,
          description: entry.description || '',
          chequeNumber: entry.chequeNumber || '',
          status: 'pending' as const
        }))
      };
      
      setDepositBatches(prev => [...prev, batchData]);
      return { success: true, batchId: batchData.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create deposit batch' };
    }
  };

  // New remote-backed deposit batch functions (DB)
  const createDepositBatchRemote = async (facilityId: string, entries: Array<{ residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>, description?: string) => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };
      const created = await createDepositBatchDb(facilityId, user.id, entries, description);
      if (created) {
        setDepositBatches(prev => [created, ...prev]);
        return { success: true, batchId: created.id };
      }
      return { success: false, error: 'Failed to create deposit batch' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create deposit batch' };
    }
  };

  const getDepositBatches = (facilityId: string, status?: 'open' | 'closed') => {
    return depositBatches
      .filter(batch => batch.facilityId === facilityId && (!status || batch.status === status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const closeDepositBatch = async (batchId: string) => {
    try {
      const batch = depositBatches.find(b => b.id === batchId);
      if (!batch) {
        return { success: false, error: 'Batch not found' };
      }

      // Process all pending entries locally
      for (const entry of batch.entries) {
        if (entry.status === 'pending') {
          await addTransaction({
            residentId: entry.residentId,
            type: 'credit',
            amount: entry.amount,
            method: entry.method,
            description: entry.description || `Deposit Batch: ${batch.description || 'Batch Deposit'}`,
            createdBy: user?.id || '',
            facilityId: batch.facilityId
          });
        }
      }

      setDepositBatches(prev => prev.map(b => 
        b.id === batchId 
          ? { 
              ...b, 
              status: 'closed' as const, 
              closedAt: new Date().toISOString(),
              closedBy: user?.id || '',
              entries: b.entries.map(e => ({
                ...e,
                status: 'processed' as const,
                processedAt: new Date().toISOString()
              }))
            }
          : b
      ));

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to close deposit batch' };
    }
  };

  // New remote-backed close function (DB)
  const closeDepositBatchRemote = async (batchId: string) => {
    try {
      if (!user) return { success: false, error: 'Not authenticated' };
      await postDepositBatchDb(batchId, user.id);
      if (currentFacility) {
        const [refreshedBatches] = await Promise.all([
          getDepositBatchesByFacilityDb(currentFacility.id)
        ]);
        setDepositBatches(refreshedBatches);
        // Ensure resident balances and recent transactions reflect posted batch
        await refreshData();
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to close deposit batch' };
    }
  };

  // Remote-backed deposit batch edit functions (DB)
  const addEntryToDepositBatch = async (
    batchId: string,
    entry: { residentId: string; amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }
  ) => {
    try {
      await addEntryToDepositBatchDb(batchId, entry);
      if (currentFacility) {
        const refreshed = await getDepositBatchesByFacilityDb(currentFacility.id);
        setDepositBatches(refreshed);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add entry' };
    }
  };

  const updateDepositBatchEntry = async (
    batchId: string,
    entryId: string,
    updates: Partial<{ amount: number; method: 'cash' | 'cheque'; description?: string; chequeNumber?: string }>
  ) => {
    try {
      await updateDepositBatchEntryDb(batchId, entryId, updates);
      if (currentFacility) {
        const refreshed = await getDepositBatchesByFacilityDb(currentFacility.id);
        setDepositBatches(refreshed);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update entry' };
    }
  };

  const removeEntryFromDepositBatch = async (batchId: string, entryId: string) => {
    try {
     
      await removeEntryFromDepositBatchDb(batchId, entryId);
      if (currentFacility) {
        const refreshed = await getDepositBatchesByFacilityDb(currentFacility.id);
        setDepositBatches(refreshed);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to remove entry' };
    }
  };

  const deleteOpenDepositBatch = async (batchId: string) => {
    try {
      await deleteDepositBatchDb(batchId);
      if (currentFacility) {
        const refreshed = await getDepositBatchesByFacilityDb(currentFacility.id);
        setDepositBatches(refreshed);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete batch' };
    }
  };
   const createOfficeManagerAccount = async (facilityId: string, email: string, name?: string) => {
    // No email sending or resident linking; just create auth and app user
    const created = await createOfficeManagerUser(facilityId, email, name);
    return created;
  };

  // Invoices
  const getFacilityInvoices = (facilityId: string, status?: 'open' | 'submitted' | 'paid'): Invoice[] => {
    return invoices.filter(inv => inv.facilityId === facilityId && (!status || inv.status === status));
  };

  const getVendorInvoices = (vendorUserId: string, facilityId?: string): Invoice[] => {
    return invoices.filter(inv => inv.vendorUserId === vendorUserId && (!facilityId || inv.facilityId === facilityId));
  };


  const createInvoice = async (facilityId: string): Promise<Invoice> => {
    if (!user) throw new Error('User not authenticated');
    const newInvoice = await createInvoiceDb(facilityId, user.id);
    setInvoices(prev => [newInvoice, ...prev]);
    return newInvoice;
  };

  const addInvoiceItem = async (invoiceId: string, residentId: string, amount: number, description: string) => {
    if (!user) throw new Error('User not authenticated');
    await addInvoiceItemDb(invoiceId, residentId, amount, description);
    // Refresh vendor invoices snapshot so UI reflects changes
    const vendorInvs = await getInvoicesByVendorDb(user.id);
    setInvoices(vendorInvs);
  };

  const updateInvoiceItem = async (invoiceId: string, itemId: string, updates: Partial<{ amount: number; description: string; residentId: string }>) => {
    if (!user) throw new Error('User not authenticated');
    await updateInvoiceItemDb(invoiceId, itemId, updates);
    const vendorInvs = await getInvoicesByVendorDb(user.id);
    setInvoices(vendorInvs);
  };

  const removeInvoiceItem = async (invoiceId: string, itemId: string) => {
    if (!user) throw new Error('User not authenticated');
    await removeInvoiceItemDb(invoiceId, itemId);
    const vendorInvs = await getInvoicesByVendorDb(user.id);
    setInvoices(vendorInvs);
  };

  const submitInvoice = async (invoiceId: string) => {
    if (!user) throw new Error('User not authenticated');
    await submitInvoiceDb(invoiceId);
    const vendorInvs = await getInvoicesByVendorDb(user.id);
    setInvoices(vendorInvs);
  };

  const updateInvoiceOmNotes = async (invoiceId: string, notes: string) => {
    if (!user) throw new Error('User not authenticated');
    await updateInvoiceOmNotesDb(invoiceId, notes);
    if (user.role === 'Vendor') {
      const vendorInvs = await getInvoicesByVendorDb(user.id);
      setInvoices(vendorInvs);
    } else if (currentFacility) {
      const facilityInvoices = await getInvoicesByFacilityDb(currentFacility.id);
      setInvoices(facilityInvoices);
    }
  };

  const markInvoicePaid = async (invoiceId: string, notes?: string) => {
    if (!user) throw new Error('User not authenticated');
    await markInvoicePaidDb(invoiceId, user.id, notes);
    if (user.role === 'Vendor') {
      const vendorInvs = await getInvoicesByVendorDb(user.id);
      setInvoices(vendorInvs);
    } else if (currentFacility) {
      const facilityInvoices = await getInvoicesByFacilityDb(currentFacility.id);
      setInvoices(facilityInvoices);
    }
  };

  const updateInvoiceVendorDetails = async (
    invoiceId: string,
    details: Partial<{ vendorName: string; vendorAddress: string; vendorEmail: string; invoiceDate: string }>
  ) => {
    if (!user) throw new Error('User not authenticated');
    const updated = await updateInvoiceVendorDetailsDb(invoiceId, details);
    // Optimistically merge updated invoice into local state
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updated : inv));
    // Also refresh lists for consistency in other views
    if (user.role === 'Vendor') {
      try {
        const vendorInvs = await getInvoicesByVendorDb(user.id);
        setInvoices(vendorInvs);
      } catch {}
    } else if (currentFacility) {
      try {
        const facilityInvoices = await getInvoicesByFacilityDb(currentFacility.id);
        setInvoices(facilityInvoices);
      } catch {}
    }
  };

  const linkVendorToFacilityFn = async (facilityId: string, vendorUserId?: string) => {
    if (!user) throw new Error('User not authenticated');
    if (user.role === 'Vendor') {
      throw new Error('Vendors cannot link themselves to facilities. Please contact your OM or Admin.');
    }
    await linkVendorToFacility(vendorUserId || user.id, facilityId);
    await refreshData();
  };

  // Vendor management methods for OM
  const refreshVendorsForFacility = async (facilityId: string) => {
    try {
      const { listVendorsForFacility } = await import('../services/database');
      const v = await listVendorsForFacility(facilityId);
      setVendors(v);
    } catch (e) {
    }
  };

  const addVendorToFacility = async (facilityId: string, email: string, name?: string, password?: string) => {
    const { createVendorUserAndLink } = await import('../services/database');
    await createVendorUserAndLink(facilityId, email, name, password);
    await refreshVendorsForFacility(facilityId);
  };

  const unlinkVendorFromFacilityFn = async (vendorUserId: string, facilityId: string) => {
    const { unlinkVendorFromFacility } = await import('../services/database');
    await unlinkVendorFromFacility(vendorUserId, facilityId);
    await refreshVendorsForFacility(facilityId);
  };

  const value: DataContextType = {
    residents,
    transactions,
    facilities,
    assignments,
    serviceBatches,
    cashBoxBalances,
    monthlyCashBoxHistory,
    manualMoneyEntries,
    batchReports,
    preAuthDebits,
    monthlyPreAuthLists,
    signupInvitations,
    invoices,
    vendorFacilities,
    vendors,
    isLoading,
    error,
    addResident,
    updateResident,
    addTransaction,
    getResidentTransactions,
    updateBalance,
    addFacility,
    updateFacility,
    getFacilityResidents,
    getFacilityTransactions,
    checkResidentIdExists,
    addAssignment,
    deleteAssignment,
    getFacilityAssignments,
    generateUniqueCode,
    getCashBoxBalance,
    updateCashBoxBalance,
    getTotalTrustBalance,
    getMonthlyTransactionHistory,
    generateMonthlyReport,
    createServiceBatch: createServiceBatchFn,
    addResidentToBatch,
    removeResidentFromBatch,
    updateBatchItem,
    postServiceBatch: postServiceBatchFn,
    deleteOpenServiceBatch,
    getFacilityServiceBatches,
    getServiceBatch,
    refreshData,
    addPreAuthDebit,
    updatePreAuthDebit: updatePreAuthDebitFn,
    getResidentPreAuthDebits,
    getFacilityPreAuthDebits,
    createMonthlyPreAuthList: createMonthlyPreAuthListFn,
    closeMonthlyPreAuthList: closeMonthlyPreAuthListFn,
    getMonthlyPreAuthList: getMonthlyPreAuthListFn,
    getFacilityMonthlyPreAuthLists: getFacilityMonthlyPreAuthListsFn,
    generatePreAuthListReport,
    getMonthlyPreAuthDebits,
    getCashBoxTransactions,
    processPreAuthDebit,
    processAllPreAuthDebits,
    createDepositBatch,
    getDepositBatches,
    closeDepositBatch,
    createDepositBatchRemote,
    closeDepositBatchRemote,
    addEntryToDepositBatch,
    updateDepositBatchEntry,
    removeEntryFromDepositBatch,
    deleteOpenDepositBatch,
    // Cash box functions
    resetCashBoxToMonthlyAmount: async (facilityId: string, userId: string) => {
      const result = await resetCashBoxMonthlyDb(facilityId, userId);
      if (result.success) {
        // Reload from DB to avoid hard-coded values
        const balance = await getCashBoxBalanceDb(facilityId);
        setCashBoxBalances(prev => ({
          ...prev,
          [facilityId]: balance
        }));
      } else {
        throw new Error(result.error || 'Failed to reset cash box');
      }
    },
    getMonthlyCashBoxHistory: (facilityId: string, year?: number, month?: number) => {
      // For now, return from local state, but in future should query Supabase
      return monthlyCashBoxHistory.filter(h => 
        h.facilityId === facilityId &&
        (!year || h.year === year) &&
        (!month || h.month === month)
      );
    },
    getMonthlyManualMoneyReport: (facilityId: string, year?: number, month?: number) => {
      // Return manual money entries for the facility
      return manualMoneyEntries.filter(e => 
        e.facilityId === facilityId &&
        (!year || new Date(e.timestamp).getFullYear() === year) &&
        (!month || new Date(e.timestamp).getMonth() + 1 === month)
      );
    },
    getBatchReports: (facilityId: string) => {
      return batchReports.filter(r => r.facilityId === facilityId);
    },
    closeResidentTrust,
    createCashBoxTransaction,
    // Newly exposed invitation helpers
    createSignupInvitation: async (facilityId, email, role, invitedBy) => {
      return await createSignupInvitation(facilityId, email, role, invitedBy);
    },
    sendInvitationEmail: async (invitation, facilityName) => {
      // Call the database helper directly to avoid recursion
      return await sendInvitationEmailDb(invitation, facilityName);
    },
    sendInviteByEmail: async (params) => {
      const { sendInviteByEmail: sendInviteByEmailDb } = await import('../services/database');
      return await sendInviteByEmailDb(params);
    },
    provisionUser: async (params) => {
      const { provisionUser } = await import('../services/database');
      return await provisionUser(params);
    },
    // Invoices
    getFacilityInvoices,
    getVendorInvoices,
    createInvoice,
    addInvoiceItem,
    updateInvoiceItem,
    removeInvoiceItem,
    submitInvoice,
    updateInvoiceOmNotes,
    markInvoicePaid,
    updateInvoiceVendorDetails,
    linkVendorToFacility: linkVendorToFacilityFn,
    // Vendor management for OM
    refreshVendorsForFacility,
    addVendorToFacility,
    unlinkVendorFromFacility: unlinkVendorFromFacilityFn,
    createOfficeManagerAccount,
    // OM admin helpers
    listOfficeManagers: async () => {
      return await getOmUsers(user?.companyId);
    },
    clearOfficeManagerFacility: async (userId: string) => {
      await clearFacilityForUser(userId);
    },
    updateResidentMailPreference,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};