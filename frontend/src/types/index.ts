export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'OM' | 'POA' | 'Resident' | 'Vendor';
  passwordHash?: string;
  facilityId?: string;
  companyId?: string;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  phone?: string; // Made optional
  email: string;
  officeManagerEmail: string; // New field for Office Manager email
  createdAt: string;
  status: 'active' | 'inactive';
  uniqueCode: string; // Added unique code field
  companyId: string;

}

// New interface for signup invitations
export interface SignupInvitation {
  id: string;
  facilityId: string;
  email: string;
  role: 'OM' | 'POA' | 'Resident';
  invitedBy: string;
  invitedAt: string;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  expiresAt: string;
  residentId?: string;
}


export interface Assignment {
  id: string;
  facilityId: string;
  managerEmail: string;
  managerName: string;
  assignedBy: string;
  assignedAt: string;
  status: 'active' | 'inactive';
}

export interface Resident {
  id: string;
  residentId: string; // Unique resident ID per facility
  name: string;
  dob: string;
  trustBalance: number;
  isSelfManaged: boolean;
  linkedUserId?: string;
  ltcUnit?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  facilityId: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    transitNumber: string;
    institutionNumber: string;
    accountType: 'checking' | 'savings';
    notes?: string;
  };
  allowedServices: {
    haircare: boolean;
    footcare: boolean;
    pharmacy: boolean;
    cable: boolean;
    wheelchairRepair: boolean;
    miscellaneous: boolean;
  };
  serviceAuthorizations?: {
    haircare: boolean;
    footcare: boolean;
    pharmacy: boolean;
    cable: boolean;
    wheelchairRepair: boolean;
    miscellaneous: boolean;
  };
  mailDeliveryPreference?: 'resident_room' | 'reception' | 'other';
  mailDeliveryNote?: string;
}

export interface Transaction {
  id: string;
  residentId: string;
  facilityId: string;
  type: 'credit' | 'debit';
  amount: number;
  method: 'manual' | 'cash' | 'cheque';
  description: string;
  createdBy: string;
  timestamp: string;

}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentFacility: Facility | null;
}

export interface ServiceBatch {
  id: string;
  facilityId: string;
  serviceType: 'haircare' | 'footcare' | 'pharmacy' | 'cable' | 'wheelchairRepair' | 'miscellaneous';
  status: 'open' | 'posted';
  createdAt: string;
  postedAt?: string;
  createdBy: string;
  postedBy?: string;
  items: ServiceBatchItem[];
  totalAmount: number;
  processedCount: number;
}

export interface ServiceBatchItem {
  id: string;
  residentId: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  errorMessage?: string;
  processedAt?: string;
}

export interface MonthlyCashBoxHistory {
  id: string;
  facilityId: string;
  month: number;
  year: number;
  startingBalance: number;
  endingBalance: number;
  resetAmount: number;
  resetDate: string;
  resetBy: string;
  transactions: Transaction[];
  createdAt: string;
}

export interface ManualMoneyEntry {
  id: string;
  facilityId: string;
  amount: number;
  type: 'cash_addition' | 'cash_removal';
  description: string;
  addedBy: string;
  timestamp: string;
  month: number;
  year: number;
}

export interface BatchReport {
  id: string;
  batchId: string;
  facilityId: string;
  serviceType: string;
  reportContent: string;
  createdAt: string;
  createdBy: string;
}

export interface DepositBatch {
  id: string;
  facilityId: string;
  status: 'open' | 'closed';
  description?: string;
  totalAmount: number;
  totalCash: number;
  totalCheques: number;
  createdAt: string;
  createdBy: string;
  closedAt?: string;
  closedBy?: string;
  entries: DepositBatchEntry[];
  community_dbatch_number?: number | string;
}

export interface DepositBatchEntry {
  id: string;
  residentId: string;
  amount: number;
  method: 'cash' | 'cheque';
  description?: string;
  chequeNumber?: string;
  status: 'pending' | 'processed';
  processedAt?: string;
}

export interface PreAuthDebit {
  id: string;
  residentId: string;
  facilityId: string;
  authorizedBy: string; // User ID who authorized (POA or resident)
  description: string;
  authorizedDate: string; // When this specific authorization was created
  targetMonth: string; // YYYY-MM format - the specific month this authorization is for
  amount: number; // Amount for this specific month
  type: 'credit' | 'debit'; // Type of pre-authorization: credit adds money, debit removes money
  isActive: boolean;
  createdAt: string;
  processedAt?: string; // When this authorization was processed/charged
  status: 'pending' | 'processed' | 'cancelled';
}

export interface MonthlyPreAuthList {
  id: string;
  facilityId: string;
  month: string; // YYYY-MM format
  status: 'open' | 'closed';
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  authorizations: PreAuthDebit[];
  totalAmount: number;
}

export interface VendorFacility {
  id: string;
  vendorUserId: string;
  facilityId: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  residentId: string;
  amount: number;
  description: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Invoice {
  id: string;
  facilityId: string;
  vendorUserId: string;
  status: 'open' | 'submitted' | 'paid';
  omNotes?: string;
  createdAt: string;
  updatedAt?: string;
  submittedAt?: string;
  paidAt?: string;
  paidBy?: string;
  items: InvoiceItem[];
  invoice_no?: number | string;
  vendorName?: string;
  vendorAddress?: string;
  vendorEmail?: string;
  invoiceDate?: string; // ISO date
  amountPaid?: number; // Sum of payments recorded towards this invoice
}

