// Stripe Connect types
export interface ConnectedAccount {
  id: string;
  businessId: string;
  stripeAccountId: string;
  accountType: 'express' | 'standard' | 'custom';
  status: 'pending' | 'active' | 'restricted' | 'rejected';
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  country: string;
  currency: string;
  businessProfile?: {
    name?: string;
    url?: string;
    mcc?: string;
    productDescription?: string;
  };
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessOnboardingData {
  businessName: string;
  businessType: 'individual' | 'company';
  country: string;
  email: string;
  phone?: string;
  url?: string;
  mcc?: string;
  productDescription?: string;
  individual?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: {
      day: number;
      month: number;
      year: number;
    };
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  company?: {
    name: string;
    taxId?: string;
    phone?: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  clientSecret?: string;
  paymentMethod?: string;
  connectedAccountId: string;
  applicationFeeAmount?: number;
  transferData?: {
    destination: string;
  };
  metadata?: Record<string, string>;
  createdAt: Date;
}

export interface Transfer {
  id: string;
  amount: number;
  currency: string;
  destination: string;
  sourceTransaction?: string;
  reversals?: any[];
  metadata?: Record<string, string>;
  createdAt: Date;
}

export interface ApplicationFee {
  id: string;
  amount: number;
  currency: string;
  charge: string;
  account: string;
  application: string;
  refunded: boolean;
  amountRefunded: number;
  refunds: any[];
  createdAt: Date;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  account?: string;
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: {
    id?: string;
    idempotency_key?: string;
  };
}

export interface PaymentFormData {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  connectedAccountId: string;
  applicationFeeAmount?: number;
  paymentMethodTypes?: string[];
}

export interface OnboardingStatus {
  accountId: string;
  hasCompletedOnboarding: boolean;
  requiresAction: boolean;
  currentlyDue: string[];
  eventuallyDue: string[];
  pastDue: string[];
  disabledReason?: string;
}