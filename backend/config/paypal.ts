import paypal from '@paypal/checkout-server-sdk';
import { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV } from './env.js';

export function getPayPalClient(): any {
  const env = PAYPAL_ENV.toLowerCase() === 'live'
    ? new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
  return new paypal.core.PayPalHttpClient(env);
}
