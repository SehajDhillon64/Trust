// Minimal Stripe webhook event typing for backend
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: any; previous_attributes?: any };
  account?: string;
  created: number;
  livemode: boolean;
  pending_webhooks: number;
  request?: { id?: string; idempotency_key?: string };
}
