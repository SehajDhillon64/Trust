import { rpcCall } from './rpc';

export interface PayPalConfig {
  clientId: string;
  environment: 'sandbox' | 'live';
  scriptUrl: string;
}

export async function fetchPayPalConfig(facilityId: string): Promise<PayPalConfig> {
  return rpcCall<PayPalConfig>('fetchPayPalConfig', [facilityId])
}

export async function createPayPalOrder(params: {
  facilityId: string;
  residentId: string;
  amount: number;
  currency?: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}): Promise<{ id: string }> {
  // Creation is handled by PayPal JS SDK via actions.order.create in component; this function is unused now
  throw new Error('createPayPalOrder should not be called directly. Use PayPal Buttons createOrder callback to create the order on client.');
}

export async function capturePayPalOrder(orderId: string, facilityId: string): Promise<void> {
  // Use dedicated backend payments routes if needed; placeholder
  return;
}