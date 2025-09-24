import express from 'express';
import cors from 'cors';
import { FRONTEND_URL, PORT } from '../config/env.js';
import { createOrder, captureOrder } from '../services/payments.js';
import { getItems } from '../services/db.js';

const app = express();

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Example DB route
app.get('/api/items', async (_req, res) => {
  try {
    const items = await getItems();
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Unknown error' });
  }
});

// PayPal routes
app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { amount, currency } = req.body ?? {};
    if (!amount || !currency) return res.status(400).json({ error: 'amount and currency are required' });
    const result = await createOrder({ amount, currency });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Unknown error' });
  }
});

app.post('/api/payments/capture-order', async (req, res) => {
  try {
    const { orderId } = req.body ?? {};
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    const result = await captureOrder(orderId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? 'Unknown error' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API server listening on http://localhost:${PORT}`);
});

