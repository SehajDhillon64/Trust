import { supabase } from '../../config/supabase.js';

export interface PayPalConfig {
  clientId: string;
  environment: 'sandbox' | 'live';
  scriptUrl: string;
}

export async function fetchPayPalConfig(facilityId: string): Promise<PayPalConfig> {
  // Load PayPal clientId/env from facilities row
  const { data: fac, error } = await supabase
    .from('facilities')
    .select('paypal_client_id, paypal_environment')
    .eq('id', facilityId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const anyFac = (fac || {}) as any;
  if (!anyFac.paypal_client_id) throw new Error('PayPal not configured for facility');

  const environment = (anyFac.paypal_environment as 'sandbox' | 'live') || 'sandbox';
  const scriptUrl = 'https://www.paypal.com/sdk/js';
  return { clientId: anyFac.paypal_client_id as string, environment, scriptUrl };
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
  // After approval/capture by JS SDK, persist transaction credit in Supabase
  // We cannot capture via client without secret; we rely on client capture and then record
  const { data: session } = await supabase.auth.getSession();
  const authUserId = session.session?.user?.id || null;

  // Retrieve order details via PayPal client SDK is not available here; require amount via separate path
  // This function becomes a no-op placeholder if capture is handled by SDK. Keep for API compatibility.
  return;
}