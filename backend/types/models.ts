// Shared app-level model types for backend re-use
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'OM' | 'POA' | 'Resident' | 'Vendor';
  facilityId?: string;
  companyId?: string;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email: string;
  officeManagerEmail: string;
  createdAt: string;
  status: 'active' | 'inactive';
  uniqueCode: string;
  companyId?: string;
}

export interface Resident {
  id: string;
  residentId: string;
  name: string;
  dob: string;
  trustBalance: number;
  isSelfManaged: boolean;
  linkedUserId?: string;
  ltcUnit?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  facilityId: string;
  bankDetails?: any;
  allowedServices: any;
  serviceAuthorizations?: any;
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

export interface ServiceBatchItem {
  id: string;
  residentId: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  errorMessage?: string;
  processedAt?: string;
}

export interface ServiceBatch {
  id: string;
  facilityId: string;
  serviceType: 'haircare' | 'footcare' | 'pharmacy' | 'cable' | 'wheelchairRepair';
  status: 'open' | 'posted';
  createdAt: string;
  postedAt?: string;
  createdBy: string;
  postedBy?: string;
  items: ServiceBatchItem[];
  totalAmount: number;
  processedCount: number;
  service_batch_no?: number | string;
  cheque_number?: string;
}

export interface PreAuthDebit {
  id: string;
  residentId: string;
  facilityId: string;
  authorizedBy: string;
  description: string;
  authorizedDate: string;
  targetMonth: string;
  amount: number;
  type: 'credit' | 'debit';
  isActive: boolean;
  createdAt: string;
  processedAt?: string;
  status: 'pending' | 'processed' | 'cancelled';
}

export interface MonthlyPreAuthList {
  id: string;
  facilityId: string;
  month: string;
  status: 'open' | 'closed';
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  authorizations: PreAuthDebit[];
  totalAmount: number;
}

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
