const express = require('express');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Environment variables
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const PREMIUM_ROLE_ID = process.env.PREMIUM_ROLE_ID;
const VIP_ROLE_ID = process.env.VIP_ROLE_ID;
const LIFETIME_ROLE_ID = process.env.LIFETIME_ROLE_ID;

// Webhook endpoint
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    handleCheckoutComplete(event.data.object);
  }

  res.json({ received: true });
});

// Handle checkout completion
async function handleCheckoutComplete(session) {
  console.log('Checkout session completed:', session.id);

  const userId = session.client_reference_id;
  const lineItems = session.line_items || {};
  const items = lineItems.data || [];
  const productId = items.length > 0 ? items[0].price?.product : null;

  if (!userId) {
    console.error('No user ID found in session');
    return;
  }

  // Map product ID to role ID
  let roleId;
  if (productId === process.env.PREMIUM_PRODUCT_ID) {
    roleId = PREMIUM_ROLE_ID;
  } else if (productId === process.env.VIP_PRODUCT_ID) {
    roleId = VIP_ROLE_ID;
  } else if (productId === process.env.LIFETIME_PRODUCT_ID) {
    roleId = LIFETIME_ROLE_ID;
  }

  if (!roleId) {
    console.log('Product ID:', productId, '- Assigning based on first matching product');
    // Fallback: assign based on product name or first available role
    roleId = PREMIUM_ROLE_ID;
  }

  // Assign Discord role
  try {
    const response = await axios.put(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`,
      {},
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Role ${roleId} assigned to user ${userId}`);
  } catch (err) {
    console.error('Failed to assign role:', err.response?.status, err.response?.data || err.message);
  }
}

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'Stripe webhook server running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
