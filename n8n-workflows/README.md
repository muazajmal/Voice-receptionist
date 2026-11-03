# Sara n8n workflows

The complete backend for Sara, exported from n8n. Secrets are removed: API keys, sheet IDs, data table IDs, emails and the n8n instance URL are replaced with placeholders, and credential IDs are blank so you connect your own.

## Import

1. In n8n, open **Workflows → Import from file** and pick a `.json` file.
2. Open each node marked with a credential warning and choose your own credential (Google Sheets, Gmail, Google Gemini, WhatsApp).
3. Search and replace the placeholders:

| Placeholder | Replace with |
|---|---|
| `YOUR_SARA_API_KEY` | Any long random string. Retell sends it with every function call, and the core workflow rejects calls without it |
| `YOUR_CLIENT_CONFIG_MASTER_SHEET_ID` | The ID of your Client Config Master Google Sheet |
| `YOUR-N8N-INSTANCE` | Your n8n host, e.g. `you.app.n8n.cloud` |
| `YOUR_PORTAL_ACCOUNTS_TABLE_ID` / `YOUR_CUSTOMERS_TABLE_ID` | n8n Data Tables you create for dashboard logins and sign-ups |
| `owner@example.com` | The email that should receive owner notifications |

4. Publish the workflows.

## Client Config Master sheet

One row per business:

| phone_number | client_name | sheet_id | sheet_url | status | whatsapp_phone_number_id |
|---|---|---|---|---|---|

Each business's own sheet has the tabs `Business_Info`, `Hours`, `Holiday`, `FAQs`, `Appointments`, `Tickets`, `Transfers`, `Call Backs` and `Call Logs`. The **New Client Setup** workflow creates these automatically.

## Retell custom functions

Point your Retell agent's functions at the core workflow's webhooks, each with `?key=YOUR_SARA_API_KEY`:

`check-hours` · `get-faq` · `book-appointment` · `check-status` · `manage-appointment` · `create-ticket` · `callback-schedule`

Set the agent's call-event webhook to `retell-webhook` and its call-ended webhook to `retell-call-ended` (with the same key) so every call is logged.

Open the core workflow in n8n to copy each webhook's exact production URL.
