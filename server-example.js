/**
 * Example Node.js/Express server for Stripe Connect
 * This is a basic implementation showing the required endpoints
 * You'll need to adapt this to your specific backend framework
 */

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use('/webhooks/stripe', express.raw({ type: 'application/json' })); // Raw body for webhooks
app.use(express.json()); // JSON body parser for other routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create connected account
app.post('/api/stripe/accounts', async (req, res) => {
  try {
    const {
      type = 'express',
      country,
      email,
      business_type,
      business_profile,
      individual,
      company
    } = req.body;

    const account = await stripe.accounts.create({
      type,
      country,
      email,
      business_type,
      business_profile,
      individual,
      company,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    res.json({
      id: account.id,
      businessId: req.body.businessId || 'generated-business-id',
      stripeAccountId: account.id,
      accountType: account.type,
      status: 'pending',
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      country: account.country,
      currency: account.default_currency,
      businessProfile: account.business_profile,
      requirements: account.requirements,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message,
      type: error.type,
      code: error.code 
    });
  }
});

// Get connected account
app.get('/api/stripe/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await stripe.accounts.retrieve(accountId);

    res.json({
      id: accountId,
      businessId: 'business-id', // You'd get this from your database
      stripeAccountId: account.id,
      accountType: account.type,
      status: account.charges_enabled ? 'active' : 'pending',
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      country: account.country,
      currency: account.default_currency,
      businessProfile: account.business_profile,
      requirements: account.requirements,
      createdAt: new Date(account.created * 1000),
      updatedAt: new Date(),
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message,
      type: error.type,
      code: error.code 
    });
  }
});

// Create account link for onboarding
app.post('/api/stripe/account-links', async (req, res) => {
  try {
    const {
      account,
      refresh_url,
      return_url,
      type = 'account_onboarding'
    } = req.body;

    const accountLink = await stripe.accountLinks.create({
      account,
      refresh_url,
      return_url,
      type,
    });

    res.json({ url: accountLink.url });
  } catch (error) {
    res.status(400).json({ 
      error: error.message,
      type: error.type,
      code: error.code 
    });
  }
});

// Create payment intent
app.post('/api/stripe/payment-intents', async (req, res) => {
  try {
    const {
      amount,
      currency,
      payment_method_types = ['card'],
      description,
      metadata,
      application_fee_amount,
      transfer_data,
      on_behalf_of
    } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types,
      description,
      metadata,
      application_fee_amount,
      transfer_data,
      on_behalf_of,
    });

    res.json({
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      status: paymentIntent.status,
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message,
      type: error.type,
      code: error.code 
    });
  }
});

// Get account balance
app.get('/api/stripe/accounts/:accountId/balance', async (req, res) => {
  try {
    const { accountId } = req.params;
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });

    res.json(balance);
  } catch (error) {
    res.status(400).json({ 
      error: error.message,
      type: error.type,
      code: error.code 
    });
  }
});

// Get transaction history
app.get('/api/stripe/accounts/:accountId/transactions', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 10 } = req.query;

    const charges = await stripe.charges.list(
      { limit: parseInt(limit) },
      { stripeAccount: accountId }
    );

    const transactions = charges.data.map(charge => ({
      id: charge.id,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      description: charge.description,
      created: charge.created,
      fee: charge.application_fee_amount || 0,
      net: charge.amount - (charge.application_fee_amount || 0),
      customer: charge.customer ? {
        email: charge.receipt_email,
      } : null,
    }));

    res.json(transactions);
  } catch (error) {
    res.status(400).json({ 
      error: error.message,
      type: error.type,
      code: error.code 
    });
  }
});

// Get payouts
app.get('/api/stripe/accounts/:accountId/payouts', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { limit = 10 } = req.query;

    const payouts = await stripe.payouts.list(
      { limit: parseInt(limit) },
      { stripeAccount: accountId }
    );

    res.json(payouts.data);
  } catch (error) {
    res.status(400).json({ 
      error: error.message,
      type: error.type,
      code: error.code 
    });
  }
});

// Webhook endpoint
app.post('/webhooks/stripe', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  

  switch (event.type) {
    case 'account.updated':
      
      // Update your database with the account changes
      break;
    case 'payment_intent.succeeded':
      
      // Handle successful payment
      break;
    case 'payment_intent.payment_failed':
      
      // Handle failed payment
      break;
    case 'transfer.created':
      
      // Handle transfer creation
      break;
    case 'payout.paid':
      
      // Handle successful payout
      break;
    case 'payout.failed':
      
      // Handle failed payout
      break;
    default:
      
  }

  res.json({ received: true });
});

// Error handling middleware
app.use((error, req, res, next) => {
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(port, () => {
});

module.exports = app;