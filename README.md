# Traders Syndicate Stripe Webhook Server

Automated webhook server that listens for Stripe checkout completion events and assigns Discord roles based on the tier purchased.

## Features

- **Stripe Integration**: Listens for `checkout.session.completed` events
- **Discord Role Assignment**: Automatically assigns roles based on purchased tier
- **Role Name Lookup**: Dynamically fetches role IDs by name from Discord Guild
- **Tier Mapping**:
  - `prod_UJqbXaJ7Jq8k4C` → `Lifetime` role
  - `prod_UJqXgMAyw3j3hw` → `Whale🐳` role
  - `prod_UJn60JOT37QlcA` → `Incoming Whale🐋` role

## Setup

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment Variables
Create a `.env` file with:
\`\`\`
STRIPE_SECRET_KEY=sk_test_...
DISCORD_BOT_TOKEN=your_bot_token
GUILD_ID=1492355946750410825
WEBHOOK_SECRET=your_webhook_signing_secret
PORT=3000
\`\`\`

### 3. Local Testing
\`\`\`bash
npm start
\`\`\`

Server runs on `http://localhost:3000`
- Health check: `GET /health`
- Webhook: `POST /webhook`

### 4. Deploy to Render.com

1. Create GitHub repository
2. Push code to GitHub
3. Connect Render.com to GitHub
4. Create Web Service from `render.yaml`
5. Set environment variables in Render dashboard
6. Deploy

### 5. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add new endpoint
3. **Endpoint URL**: \`https://your-app.onrender.com/webhook\`
4. **Events to Send**: \`checkout.session.completed\`
5. Copy **Signing Secret** and set as \`WEBHOOK_SECRET\` in Render env vars

### 6. Test Webhook

Use a test Stripe card:
- Number: \`4242 4242 4242 4242\`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

Monitor logs in Render dashboard to verify:
- ✓ Webhook signature verified
- ✓ Checkout session completed
- ✓ Role assigned to user

## Troubleshooting

| Error | Solution |
|-------|----------|
| 401 Unauthorized | Verify Discord bot token is correct and has access to guild |
| Role not found | Ensure role name exactly matches Discord server (case-sensitive, emojis must match) |
| Webhook not firing | Check Stripe dashboard → Events for error details |
| User not found | Verify Discord user ID in \`client_reference_id\` is correct |

## Architecture

\`\`\`
Stripe Checkout → Webhook Event → Verify Signature → Get Product ID → 
Look Up Role Name → Fetch Role ID from Discord → Assign Role to User
\`\`\`

## Logs

All events are logged to console. In Render, view logs via:
Render Dashboard → Service → Logs

Example successful output:
\`\`\`
=== CHECKOUT SESSION COMPLETED ===
Session ID: cs_test_...
Product ID: prod_UJqXgMAyw3j3hw
Tier/Role Name: Whale🐳
Discord User ID: 704814528449478726
Found role "Whale🐳" with ID: 1492366471238856704
✓ Role assignment successful
\`\`\`
