import type { StripeWebhookEvent } from '../types/stripe';

export interface WebhookHandler {
  (event: StripeWebhookEvent): Promise<void>;
}

class StripeWebhookService {
  private handlers: Map<string, WebhookHandler[]> = new Map();

  // Register a handler for a specific event type
  on(eventType: string, handler: WebhookHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  // Process a webhook event
  async processEvent(event: StripeWebhookEvent): Promise<void> {

    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.length === 0) {
      return;
    }

    // Execute all handlers for this event type
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          // Don't throw - we want to continue processing other handlers
        }
      })
    );
  }

  // Verify webhook signature (for security)
  verifySignature(payload: string, signature: string, secret: string): boolean {
    try {
      // In a real implementation, you would use crypto to verify the signature
      // For now, we'll return true for demonstration purposes
      // This should use Stripe's webhook signature verification
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create the singleton instance
export const webhookService = new StripeWebhookService();

// Default event handlers
webhookService.on('account.updated', async (event: StripeWebhookEvent) => {
  
  // Update local database with account changes
  const account = event.data.object;
  
  // Example: Update account status in your database
  try {
    // await updateConnectedAccountInDatabase(account.id, {
    //   chargesEnabled: account.charges_enabled,
    //   payoutsEnabled: account.payouts_enabled,
    //   detailsSubmitted: account.details_submitted,
    //   requirements: account.requirements,
    // });
    
  } catch (error) {
  }
});

webhookService.on('payment_intent.succeeded', async (event: StripeWebhookEvent) => {
  
  const paymentIntent = event.data.object;
  
  // Update your database with successful payment
  try {
    // await recordSuccessfulPayment({
    //   paymentIntentId: paymentIntent.id,
    //   amount: paymentIntent.amount,
    //   currency: paymentIntent.currency,
    //   connectedAccountId: event.account,
    //   status: 'succeeded',
    //   createdAt: new Date(paymentIntent.created * 1000),
    // });
    
    
    // Send confirmation email to customer
    // await sendPaymentConfirmationEmail(paymentIntent);
    
    // Trigger any business logic (e.g., fulfill order, send receipt)
    // await fulfillOrder(paymentIntent.metadata.order_id);
    
  } catch (error) {
  }
});

webhookService.on('payment_intent.payment_failed', async (event: StripeWebhookEvent) => {
  
  const paymentIntent = event.data.object;
  
  try {
    // Update payment status in database
    // await updatePaymentStatus(paymentIntent.id, 'failed');
    
    // Send failure notification to customer
    // await sendPaymentFailureNotification(paymentIntent);
    
  } catch (error) {
  }
});

webhookService.on('payment_method.attached', async (event: StripeWebhookEvent) => {
  
  const paymentMethod = event.data.object;
  
  try {
    // Update customer's saved payment methods
    // await updateCustomerPaymentMethods(paymentMethod.customer, paymentMethod);
    
  } catch (error) {
  }
});

webhookService.on('transfer.created', async (event: StripeWebhookEvent) => {
  
  const transfer = event.data.object;
  
  try {
    // Record transfer in your database
    // await recordTransfer({
    //   transferId: transfer.id,
    //   amount: transfer.amount,
    //   currency: transfer.currency,
    //   destination: transfer.destination,
    //   sourceTransaction: transfer.source_transaction,
    //   createdAt: new Date(transfer.created * 1000),
    // });
    
  } catch (error) {
  }
});

webhookService.on('payout.paid', async (event: StripeWebhookEvent) => {
  
  const payout = event.data.object;
  
  try {
    // Update payout status in database
    // await updatePayoutStatus(payout.id, 'paid');
    
    // Notify the connected account about the payout
    // await notifyAccountOfPayout(event.account, payout);
    
  } catch (error) {
  }
});

webhookService.on('payout.failed', async (event: StripeWebhookEvent) => {
  
  const payout = event.data.object;
  
  try {
    // Update payout status and failure reason
    // await updatePayoutStatus(payout.id, 'failed', payout.failure_message);
    
    // Notify the connected account about the failure
    // await notifyAccountOfPayoutFailure(event.account, payout);
    
  } catch (error) {
  }
});

webhookService.on('application_fee.created', async (event: StripeWebhookEvent) => {
  
  const fee = event.data.object;
  
  try {
    // Record application fee in your database
    // await recordApplicationFee({
    //   feeId: fee.id,
    //   amount: fee.amount,
    //   currency: fee.currency,
    //   charge: fee.charge,
    //   account: fee.account,
    //   createdAt: new Date(fee.created * 1000),
    // });
    
  } catch (error) {
  }
});

webhookService.on('customer.created', async (event: StripeWebhookEvent) => {
  
  const customer = event.data.object;
  
  try {
    // Sync customer data with your database
    // await syncCustomerData(customer);
    
  } catch (error) {
  }
});

webhookService.on('charge.dispute.created', async (event: StripeWebhookEvent) => {
  
  const dispute = event.data.object;
  
  try {
    // Handle dispute creation
    // await handleDispute(dispute);
    
    // Notify the connected account
    // await notifyAccountOfDispute(event.account, dispute);
    
  } catch (error) {
  }
});

// Utility function to create a webhook endpoint handler
export const createWebhookEndpoint = (endpointSecret: string) => {
  return async (request: Request): Promise<Response> => {
    try {
      const body = await request.text();
      const signature = request.headers.get('stripe-signature');
      
      if (!signature) {
        return new Response('Missing signature', { status: 400 });
      }
      
      // Verify the webhook signature
      if (!webhookService.verifySignature(body, signature, endpointSecret)) {
        return new Response('Invalid signature', { status: 400 });
      }
      
      // Parse the event
      const event: StripeWebhookEvent = JSON.parse(body);
      
      // Process the event
      await webhookService.processEvent(event);
      
      return new Response('OK', { status: 200 });
    } catch (error) {
      return new Response('Webhook processing failed', { status: 500 });
    }
  };
};

// Export types and service
export { StripeWebhookService };
export default webhookService;