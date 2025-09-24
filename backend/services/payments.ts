import paypal from '@paypal/checkout-server-sdk';
import { getPayPalClient } from '../config/paypal.js';

export async function createOrder(params: { amount: string; currency: string }) {
  const client = getPayPalClient();
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: params.currency,
          value: params.amount
        }
      }
    ]
  });
  const response = await client.execute(request);
  return { orderId: response.result.id };
}

export async function captureOrder(orderId: string) {
  const client = getPayPalClient();
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await client.execute(request);
  return response.result;
}
