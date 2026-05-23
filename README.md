# PayPal CSE Dashboard — ArmorCode

Restricted-access internal dashboard showing active PayPal Jira tickets.
**Access:** @armorcode.io Google accounts only.

---

## File Structure

```
paypal_dashboard/
├── server.js          # Express + Google OAuth2 (domain-restricted)
├── package.json
├── Dockerfile         # For Cloud Run
├── .env.example       # Copy to .env for local dev
├── .gitignore
├── public/
│   └── index.html     # The dashboard UI
└── README.md
```

---

## Step 1 — Create Google OAuth Credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (e.g. `armorcode-cse-dashboard`) or use an existing one
3. Navigate to **APIs & Services → OAuth consent screen**
   - User type: **Internal** (limits to your Google Workspace org automatically)
   - App name: `PayPal CSE Dashboard`
   - Authorised domain: `armorcode.io`
4. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorised redirect URIs — add **both**:
     - `http://localhost:8080/auth/google/callback` (local dev)
     - `https://YOUR-CLOUD-RUN-URL/auth/google/callback` (update after deploy)
5. Copy the **Client ID** and **Client Secret**

---

## Step 2 — Local Development

```bash
cd paypal_dashboard

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET

# Run locally
npm start
# Visit http://localhost:8080
```

---

## Step 3 — Push to GitHub

```bash
cd paypal_dashboard

git init
git add .
git commit -m "feat: PayPal CSE Dashboard with Google OAuth"

# Create repo on GitHub then:
git remote add origin https://github.com/YOUR_ORG/paypal-cse-dashboard.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Deploy via Google AI Studio → Cloud Run

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Build** → **New app** → **Import from GitHub**
3. Select your `paypal-cse-dashboard` repo
4. AI Studio detects the `Dockerfile` and configures Cloud Run automatically
5. Click **Deploy**
6. Once deployed, copy the `*.run.app` URL

**After deploy — add Cloud Run URL to OAuth:**
- Go back to Google Cloud Console → Credentials → your OAuth client
- Add `https://YOUR-CLOUD-RUN-URL/auth/google/callback` to Authorised redirect URIs
- Update `BASE_URL` in Cloud Run environment variables to `https://YOUR-CLOUD-RUN-URL`

**Set Cloud Run environment variables:**
```
GOOGLE_CLIENT_ID     = your-client-id
GOOGLE_CLIENT_SECRET = your-client-secret
SESSION_SECRET       = (random 64-char hex string)
BASE_URL             = https://your-cloud-run-url.run.app
NODE_ENV             = production
```

---

## Refresh Dashboard Data

Ask Claude in Cowork:
> "Refresh the PayPal dashboard with the latest Jira tickets"

Claude will re-fetch from Jira and update `public/index.html`. Then:
```bash
git add public/index.html
git commit -m "chore: refresh Jira data"
git push
```
Cloud Run redeploys automatically from GitHub.

---

## Security Notes

- OAuth consent screen set to **Internal** = only your Google Workspace org can see the app
- Server additionally checks `@armorcode.io` domain on every login as a second guard
- Sessions are cookie-based (signed + encrypted) — stateless, works across Cloud Run instances
- `.env` is gitignored — secrets are set as Cloud Run env vars, never in code

---

*Built by ArmorCode CSE Assist · May 23, 2026*
