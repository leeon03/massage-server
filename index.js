require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const { sendInvoice } = require('./emailService');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:8080',
    'file://',
    'https://willowy-nougat-e119e3.netlify.app'
  ],
  credentials: true
}));

// Raw body für Webhook
app.use('/webhook', express.raw({ type: 'application/json' }));
// JSON für andere Routes
app.use(express.json());

// Health Check
app.get('/', (req, res) => {
  res.json({ message: 'Stripe Server läuft' });
});

// Payment Intent erstellen
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'eur', description, metadata } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount erforderlich' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // In Cent umrechnen
      currency,
      description,
      metadata: metadata || {},
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (error) {
    console.error('Payment Intent Fehler:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook für Zahlungsbestätigungen
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook Signatur Fehler:', error.message);
    return res.status(400).send(`Webhook Fehler: ${error.message}`);
  }

  // Handle verschiedene Events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('✓ Zahlung erfolgreich:', paymentIntent.id);

      // Rechnung versenden
      const metadata = paymentIntent.metadata || {};
      const chargeAmount = paymentIntent.amount;

      if (metadata.email && metadata.name && metadata.serviceType) {
        // Rechnung versenden an Kunde und Shop
        await sendInvoice({
          customerName: metadata.name,
          customerEmail: metadata.email,
          productName: metadata.serviceType,
          amount: chargeAmount,
          paymentId: paymentIntent.id,
          date: new Date(),
          shopName: process.env.SHOP_NAME || 'Lenka Novotná',
        });
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('✗ Zahlung fehlgeschlagen:', failedPayment.id);
      // Hier kannst du Fehler-Handling machen
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
  console.log(`💳 Stripe Secret Key: ${process.env.STRIPE_SECRET_KEY ? '✓ geladen' : '✗ nicht gefunden'}`);
});
