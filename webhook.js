const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.raw({type: 'application/json'}));

// Configuration from environment
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const GUILD_ID = process.env.GUILD_ID || '1492355946750410825';

// Role name to tier mapping
const ROLE_MAPPING = {
  'Incoming Whale🐋': 'incoming_whale',
  'Whale🐳': 'whale',
  'Lifetime': 'lifetime'
};

// Function to fetch guild roles and find role IDs by name
async function getRoleIdByName(roleName) {
  try {
    const response = await axios.get(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/roles`,
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const roles = response.data;
    const role = roles.find(r => r.name === roleName);

    if (role) {
      console.log(`Found role "${roleName}" with ID: ${role.id}`);
      return role.id;
    } else {
      console.error(`Role "${roleName}" not found in guild`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching roles:', error.message);
    return null;
  }
}

// Function to assign role to Discord user
async function assignRoleToUser(userId, roleId) {
  try {
    const response = await axios.put(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`,
      {},
      {
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`Successfully assigned role ${roleId} to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error assigning role:', error.message);
    return false;
  }
}

// Function to determine tier from Stripe product ID
function getTierFromProductId(productId) {
  const tierMapping = {
    'prod_UJqbXaJ7Jq8k4C': 'Lifetime',           // Lifetime💎
    'prod_UJqXgMAyw3j3hw': 'Whale🐳',             // Whale🐳
    'prod_UJn60JOT37QlcA': 'Incoming Whale🐋'    // Incoming Whale🐋
  };

  return tierMapping[productId] || null;
}

// Webhook endpoint
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    console.log('\n=== CHECKOUT SESSION COMPLETED ===');
    console.log('Session ID:', session.id);
    console.log('Customer Email:', session.customer_email);
    console.log('Line Items Count:', session.line_items?.count || 0);
    console.log('Client Reference ID (Discord User ID):', session.client_reference_id);

    try {
      // Get line items to find product ID
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

      if (lineItems.data.length === 0) {
        console.error('No line items found in session');
        return res.status(200).json({ received: true });
      }

      const lineItem = lineItems.data[0];
      const price = lineItem.price;
      const productId = price.product;

      console.log('Product ID:', productId);

      // Determine tier from product ID
      const roleName = getTierFromProductId(productId);

      if (!roleName) {
        console.error('Unknown product ID:', productId);
        return res.status(200).json({ received: true });
      }

      console.log('Tier/Role Name:', roleName);

      // Get Discord user ID from client_reference_id
      const discordUserId = session.client_reference_id;

      if (!discordUserId) {
        console.error('No Discord user ID found in session');
        return res.status(200).json({ received: true });
      }

      console.log('Discord User ID:', discordUserId);

      // Fetch role ID by name
      const roleId = await getRoleIdByName(roleName);

      if (!roleId) {
        console.error('Could not find role ID for:', roleName);
        return res.status(200).json({ received: true });
      }

      // Assign role to user
      const assigned = await assignRoleToUser(discordUserId, roleId);

      if (assigned) {
        console.log('✓ Role assignment successful');
        console.log('User', discordUserId, 'now has role', roleName, '(', roleId, ')');
      } else {
        console.error('✗ Role assignment failed');
      }

    } catch (error) {
      console.error('Error processing checkout session:', error.message);
    }
  }

  // Return 200 OK
  res.status(200).json({ received: true });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n=== STRIPE WEBHOOK SERVER STARTED ===`);
  console.log(`Listening on port ${PORT}`);
  console.log(`Webhook endpoint: /webhook`);
  console.log(`Health check: /health`);
  console.log(`Guild ID: ${GUILD_ID}`);
  console.log(`Bot Token: ${DISCORD_BOT_TOKEN ? 'CONFIGURED' : 'NOT SET'}`);
  console.log(`Webhook Secret: ${WEBHOOK_SECRET ? 'WILL BE SET' : 'NOT SET'}`);
});

module.exports = app;
