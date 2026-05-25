# CSE Assist — Master Documentation
**Owner:** Uma Somi Narasimhan · unarasimhan@armorcode.io · CSE @ ArmorCode  
**Last Updated:** May 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [File Locations — Where Everything Lives](#2-file-locations)
3. [Architecture — How It All Works Together](#3-architecture)
4. [Git Workflow — How to Commit & Push Changes](#4-git-workflow)
5. [Deployment Pipeline — How Code Goes Live](#5-deployment-pipeline)
6. [Google OAuth Setup](#6-google-oauth-setup)
7. [MCP Integrations — Jira, Slack, Zendesk](#7-mcp-integrations)
8. [Skills — Reusable AI Workflows](#8-skills)
9. [PayPal Dashboard — Feature Reference](#9-paypal-dashboard)
10. [Expanding to a New Customer](#10-expanding-to-a-new-customer)
11. [Troubleshooting](#11-troubleshooting)
12. [Quick Reference Cheatsheet](#12-quick-reference-cheatsheet)

---

## 1. System Overview

The CSE Assist system is a set of tools that help ArmorCode Customer Success Engineers:

- **Pull live data** from Jira, Slack, and Zendesk via MCP (Model Context Protocol) servers
- **Generate dashboards** — dark-themed HTML pages showing ticket health, stat cards, and executive summaries per customer
- **Document deployments** — ArmorCode-branded PDF reports capturing what was built and how
- **Automate repetitive CSE work** via reusable AI Skills

The live dashboard for PayPal is deployed on **Google Cloud Run** and protected by **Google OAuth2** (only ArmorCode employees can log in).

---

## 2. File Locations

### 2.1 Google Drive (Working Workspace)

**Path:** `/Users/unarasimhan/Library/CloudStorage/GoogleDrive-unarasimhan@armorcode.io/My Drive/ai_projects/cse_assist/cse_assist/`

This is the primary working folder. All new files are created here first. It auto-syncs to Google Drive — no manual upload needed.

```
cse_assist/                                   ← GOOGLE DRIVE ROOT
│
├── CLAUDE.md                                 ← AI working memory (accounts, JQL, URLs)
├── MASTER_DOCUMENTATION.md                   ← this file
├── cse-dashboard-skill.md                    ← full dashboard pipeline reference
├── cse-dashboard-instructions.md             ← dashboard build instructions
├── push_skills.sh                            ← script to push skills to GitHub
│
├── skills/                                   ← AI Skills (also pushed to GitHub)
│   ├── cse-dashboard/
│   │   └── SKILL.md                          ← dashboard skill definition
│   └── cse-deployment-doc/
│       ├── SKILL.md                          ← deployment PDF skill definition
│       └── scripts/
│           └── build_pdf.py                  ← reportlab PDF generator script
│
├── paypal_dashboard/                         ← PayPal dashboard app source code
│   ├── public/
│   │   └── index.html                        ← THE DASHBOARD (self-contained HTML)
│   ├── server.js                             ← Express + Google OAuth2 server
│   ├── Dockerfile                            ← Docker build instructions
│   ├── package.json                          ← Node.js dependencies
│   └── README.md
│
├── paypal_cse_dashboard.html                 ← standalone dashboard (no auth, local preview)
├── paypal_cse_dashboard_leadership.pptx      ← leadership presentation (PPTX)
├── PayPal_CSE_Deployment_Journey.pdf         ← deployment journey PDF
└── paypal-cse-dashboard.skill                ← packaged skill file
```

### 2.2 GitHub Repository

**URL:** https://github.com/unarasimhan-web/cse_assit  
**Branch:** `main`

This is the source of truth for deployment. When you push here, Cloud Run automatically redeploys.

```
cse_assit/                                    ← GITHUB REPO ROOT
│
├── .gitignore                                ← excludes .DS_Store, *.pdf, *.pptx, secrets
├── CLAUDE.md                                 ← AI working memory (synced from Drive)
├── cse-dashboard-skill.md
├── cse-dashboard-instructions.md
│
├── skills/                                   ← AI Skills
│   ├── cse-dashboard/SKILL.md
│   └── cse-deployment-doc/
│       ├── SKILL.md
│       └── scripts/build_pdf.py
│
└── paypal_dashboard/                         ← Dashboard app (auto-deployed to Cloud Run)
    ├── public/index.html                     ← Dashboard HTML
    ├── server.js                             ← Express server
    ├── Dockerfile
    └── package.json
```

**What is NOT in GitHub** (excluded by `.gitignore`):
- `.DS_Store`, `.mcp.json` — OS/secrets files
- `*.pdf`, `*.pptx`, `*.docx` — large binary files
- `cse_assit/` — the cloned repo itself (prevents circular nesting)
- `paypal_dashboard/` (in Drive root) — has its own git history
- `.env`, `.env*` — environment variables/secrets

### 2.3 Google Cloud Run (Live Production)

**Live URL:** https://cse-assit-983405469928.europe-west1.run.app  
**Project:** `cse-kyc`  
**Region:** `europe-west1`  
**Service Name:** `cse-assit`

This is where the PayPal dashboard runs in production. Access is restricted to Google accounts in the ArmorCode domain via OAuth2.

### 2.4 Local Outputs (Temporary)

**Path:** `/Users/unarasimhan/Library/Application Support/Claude/local-agent-mode-sessions/.../outputs/`

Temporary files generated during Claude sessions (PDFs, scripts). These are NOT persisted — copy anything you want to keep to the Google Drive folder.

---

## 3. Architecture

### How It All Works Together

```
┌─────────────────────────────────────────────────────────┐
│                    USER (Browser)                       │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Google Cloud Run                           │
│         cse-assit (europe-west1)                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │           server.js (Node.js + Express)          │   │
│  │                                                  │   │
│  │  • Google OAuth2 (Passport.js + cookie-session)  │   │
│  │  • 45-min inactivity timeout                     │   │
│  │  • Serves /public/index.html after auth          │   │
│  │  • Logout with prompt=select_account             │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   public/index.html     │
              │   (Self-contained HTML) │
              │                         │
              │ • Jira ticket tables    │
              │ • Stat cards            │
              │ • Executive summary     │
              │ • Slack context         │
              │ • Zendesk trends        │
              └─────────────────────────┘

Data Pipeline (run via Claude + MCP):
┌──────────┐   ┌──────────┐   ┌──────────┐
│  Jira    │   │  Slack   │   │ Zendesk  │
│  MCP     │   │  MCP     │   │  MCP     │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     └──────────────┴──────────────┘
                    │
                    ▼
              Claude AI (synthesis)
                    │
                    ▼
           index.html (updated)
                    │
                    ▼
            git push → Cloud Run
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Node.js 18 + Express 4 |
| Auth | Passport.js 0.7 + cookie-session + Google OAuth2 |
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| Container | Docker (node:18-alpine) |
| Hosting | Google Cloud Run (europe-west1) |
| CI/CD | GitHub → Google AI Studio → Cloud Run |
| Data sources | Jira Cloud, Slack, Zendesk (via MCP) |
| PDF generation | Python reportlab |
| AI | Anthropic Claude (Cowork mode) |

---

## 4. Git Workflow

### The Golden Rule

**Never run git commands directly inside the Google Drive folder.** Google Drive constantly creates `.git/index.lock` files that break git operations. Always use the `push_skills.sh` script which works outside Google Drive.

### 4.1 Pushing Skills / Docs to GitHub

Use the bundled script every time:

```bash
bash "/Users/unarasimhan/Library/CloudStorage/GoogleDrive-unarasimhan@armorcode.io/My Drive/ai_projects/cse_assist/cse_assist/push_skills.sh"
```

**What the script does (automatically):**
1. Clones the GitHub repo to `~/tmp_cse_push` (outside Google Drive)
2. Copies `skills/`, `CLAUDE.md`, `cse-dashboard-skill.md`, `cse-dashboard-instructions.md`
3. Commits with your name + email
4. Pushes to `origin main`
5. Deletes the temp folder

### 4.2 Pushing Dashboard Code Changes (server.js, index.html, Dockerfile)

When you've updated the dashboard app itself:

```bash
# Step 1: Clone to a temp location outside Google Drive
cd ~/Developer    # or any folder NOT in Google Drive
git clone https://github.com/unarasimhan-web/cse_assit
cd cse_assit

# Step 2: Copy updated files from Google Drive
cp "/Users/unarasimhan/Library/CloudStorage/GoogleDrive-unarasimhan@armorcode.io/My Drive/ai_projects/cse_assist/cse_assist/paypal_dashboard/public/index.html" paypal_dashboard/public/
cp "/Users/unarasimhan/Library/CloudStorage/GoogleDrive-unarasimhan@armorcode.io/My Drive/ai_projects/cse_assist/cse_assist/paypal_dashboard/server.js" paypal_dashboard/
# Copy any other changed files...

# Step 3: Commit and push
git config user.email "unarasimhan@armorcode.io"
git config user.name "Uma Somi Narasimhan"
git add paypal_dashboard/
git commit -m "update: paypal dashboard <describe what changed>"
git push origin main
```

**Pushing triggers an automatic Cloud Run redeploy** — your changes go live in ~2-3 minutes.

### 4.3 Commit Message Conventions

```
feat: add <feature>           ← new feature
update: <what changed>        ← dashboard/skill updates
fix: <what was broken>        ← bug fixes
docs: <what was documented>   ← documentation only
chore: <maintenance>          ← cleanup, refactor
```

### 4.4 Checking What's in Git

```bash
# From a cloned copy (outside Google Drive)
cd ~/Developer/cse_assit
git log --oneline -10        # last 10 commits
git status                   # what's changed
git diff                     # see exact changes
```

---

## 5. Deployment Pipeline

### 5.1 How It Works

```
Edit files in Google Drive
        ↓
Run push_skills.sh (or manual git push)
        ↓
GitHub repo updated (github.com/unarasimhan-web/cse_assit)
        ↓
Google AI Studio detects push (webhook/trigger)
        ↓
Builds Docker image from paypal_dashboard/Dockerfile
        ↓
Deploys to Cloud Run (europe-west1, project: cse-kyc)
        ↓
Live at: https://cse-assit-983405469928.europe-west1.run.app
```

### 5.2 Deployment Time

Typically **2-3 minutes** from git push to live.

### 5.3 Dockerfile (What Gets Built)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

### 5.4 Environment Variables (set in Cloud Run)

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret |
| `SESSION_SECRET` | Cookie session encryption key |
| `BASE_URL` | `https://cse-assit-983405469928.europe-west1.run.app` |
| `PORT` | `8080` (Cloud Run default) |

**⚠️ Never commit these to git.** They are set directly in the Cloud Run service configuration.

### 5.5 Verifying a Deployment

1. Go to: https://cse-assit-983405469928.europe-west1.run.app
2. Log in with your ArmorCode Google account
3. Confirm the dashboard loads and data is current

To check Cloud Run logs:
```bash
gcloud logs read --project=cse-kyc --limit=50
```

---

## 6. Google OAuth Setup

### How Authentication Works

```
User visits dashboard URL
        ↓
server.js checks cookie session
        ↓ (not logged in)
Redirects to Google OAuth2 consent screen
        ↓
User logs in with @armorcode.io Google account
        ↓
Google returns auth code → server exchanges for tokens
        ↓
Passport.js creates session, stores user profile
        ↓
User redirected to dashboard
        ↓
45-min inactivity timer starts
        ↓ (timeout reached)
Session cleared → redirect to login
```

### Session Configuration

- **Duration:** 45 minutes of inactivity (not 45 min from login)
- **Activity reset:** Every request resets the timer
- **Logout:** Clears session + redirects to Google with `prompt=select_account` so account switcher appears

### Passport 0.7 Compatibility Shim

Passport 0.7 removed `req.user` auto-population from `cookie-session`. The shim in `server.js` restores this:

```javascript
app.use((req, res, next) => {
  if (req.session && req.session.passport && req.session.passport.user) {
    req.user = req.session.passport.user;
  }
  next();
});
```

---

## 7. MCP Integrations

MCP (Model Context Protocol) servers let Claude access live data from external tools.

### 7.1 Jira MCP

**Cloud ID:** `4af6aaa5-d149-4930-912e-b4b83218b9c6`  
**Base URL:** `https://armorcodeinc.atlassian.net`

**PayPal JQL (canonical query):**
```jql
labels IN (paypal, PayPal, PayPal_Prod, paypal-poc-list, paypal_poc, PayPal_PoC)
AND created >= -90d
AND "zendesk status[short text]" !~ "Solved"
AND status NOT IN (Done, Invalid, "Won't Fix", "Wont Do", "Duplicate", "Deferred")
AND project IN (ENG, PROD, DEVOPS, SENTRY, Doc)
ORDER BY created DESC
```

**Jira URL formats:**
```
Browse issue:  https://armorcodeinc.atlassian.net/browse/ENG-12345
Filtered view: https://armorcodeinc.atlassian.net/issues/?jql=ENCODED_JQL
```

### 7.2 Slack MCP

**PayPal channels:**

| Channel | Type | Purpose |
|---------|------|---------|
| `ext-armorcode-paypal` | External (customer-facing) | Customer issues, concerns, requests |
| `paypal-prep` | Internal | ArmorCode prep notes, action items |
| `internal-paypal` | Internal | Engineering context, blockers |

**Data window:** Last 7 days for dashboard refresh.

### 7.3 Zendesk MCP

**Org filter:** `PayPal`  
**Historical window:** Last 90 days  
**Buckets:** Bugs · Feature Requests · Service Tickets

---

## 8. Skills

Skills are reusable AI workflow definitions. They tell Claude exactly how to do a task.

### 8.1 cse-dashboard

**Location:**
- Google Drive: `skills/cse-dashboard/SKILL.md`
- GitHub: `skills/cse-dashboard/SKILL.md`

**Triggers:** "refresh the PayPal dashboard", "pull customer health", "build CSE dashboard for [X]"

**What it does:**
1. Runs Jira JQL to fetch active tickets
2. Scans Slack channels for recent concerns
3. Pulls Zendesk ticket history
4. Generates a dark-themed HTML dashboard with stat cards, tables, and executive summary

**To use:** Tell Claude "refresh the PayPal dashboard" or "build a CSE dashboard for [customer]"

### 8.2 cse-deployment-doc

**Location:**
- Google Drive: `skills/cse-deployment-doc/SKILL.md` + `scripts/build_pdf.py`
- GitHub: `skills/cse-deployment-doc/SKILL.md` + `scripts/build_pdf.py`

**Triggers:** "document what I built", "create a deployment journey PDF", "write up the deployment for [customer]"

**What it does:**
1. Generates a 9-page ArmorCode-branded PDF
2. Covers: timeline, architecture diagram, deployment pipeline, MCP integrations, security, features, expansion roadmap, achievements
3. Uploads to Google Drive `Uma_AI_Mania` folder (ID: `1GVdjtVkljb77NH1SPUDfIpzLXpxszTdb`)

**To adapt for a new customer:** Copy `build_pdf.py`, update `CUSTOMER_NAME`, timeline, Slack channels, achievements. Architecture diagram stays the same.

### 8.3 Updating a Skill

1. Edit the SKILL.md in Google Drive
2. Run `push_skills.sh` to sync to GitHub

---

## 9. PayPal Dashboard

### 9.1 Dashboard File

**Source:** `paypal_dashboard/public/index.html`  
**Standalone preview:** `paypal_cse_dashboard.html` (no auth, open directly in browser)

### 9.2 Stat Cards (7 cards)

| Card | What it shows | Click behavior |
|------|--------------|----------------|
| Open Tickets | All non-Done, non-Bug tickets | Opens Jira filtered view |
| Active Bugs | Bugs updated in last 10 days | Opens Jira filtered view |
| Stories / FRs | Feature requests and stories | Filters table locally |
| Tasks / Docs | Task and doc tickets | Filters table locally |
| Unassigned | Tickets with no assignee | Filters table locally |
| Due Soon | Due within 1 week | Filters table locally |
| In Progress | Status = "In Progress" | Filters table locally |

**Card behavior:** Clicking the number opens Jira. Clicking the card label filters the tables below.

### 9.3 Tables

Three paginated tables (5 rows/page):
- **Stories / Feature Requests** — Key, Summary, Status, Priority, Assignee, ETA, Updated
- **Tasks / Documentation** — same columns
- **Recent Bugs** — adds Created and Last Updated columns

### 9.4 Refreshing Dashboard Data

1. Ask Claude: "refresh the PayPal dashboard"
2. Claude runs the data pipeline (Jira + Slack + Zendesk)
3. Claude regenerates `index.html` with fresh data
4. Push to GitHub → auto-deploys to Cloud Run

---

## 10. Expanding to a New Customer

### Step-by-step

**Step 1 — Gather customer info:**
- Customer name (for Jira label discovery)
- Slack channels (pattern: `ext-armorcode-<customer>`, `<customer>-prep`, `internal-<customer>`)
- Zendesk org name
- Customer brand colors (primary + accent hex)

**Step 2 — Create dashboard folder:**
```bash
cp -r paypal_dashboard <customer>_dashboard
```

**Step 3 — Update CLAUDE.md:**
Add new customer entry under "Key Accounts":
```markdown
- **<Customer>** — Slack: `ext-armorcode-<customer>`, `<customer>-prep`, `internal-<customer>`
  - Jira labels: <discover via JQL>
```

**Step 4 — Run data pipeline:**
Tell Claude: "build a CSE dashboard for [Customer]"

**Step 5 — Update config in index.html:**
- `CUSTOMER_NAME`
- Jira labels (discovered dynamically)
- Stat card JQL links
- Customer logo
- Brand colors (`--pp-blue`, `--pp-light`)

**Step 6 — Deploy:**
- Push `<customer>_dashboard/` to GitHub
- Set up new Cloud Run service or reuse existing with path routing

**Step 7 — Document:**
Tell Claude: "create a deployment journey PDF for [Customer]" — uses the `cse-deployment-doc` skill.

---

## 11. Troubleshooting

### Git index.lock error

**Problem:** `fatal: Unable to create '.git/index.lock': File exists`

**Cause:** Google Drive sync interferes with git inside Google Drive folders.

**Fix:**
```bash
rm -f "/Users/unarasimhan/Library/CloudStorage/GoogleDrive-unarasimhan@armorcode.io/My Drive/ai_projects/cse_assist/cse_assist/.git/index.lock"
```
Then use `push_skills.sh` — never run git directly in the Drive folder.

---

### Dashboard shows stale data

**Cause:** The HTML is static — data is embedded at generation time.

**Fix:** Ask Claude to refresh the dashboard and push the updated `index.html` to GitHub.

---

### Cloud Run not updating after push

**Check:**
1. Confirm push succeeded: `git log origin/main --oneline -3`
2. Check Cloud Run build logs in Google AI Studio
3. Wait up to 5 minutes for build + deploy

---

### Google OAuth login fails

**Symptoms:** Redirect loop, 401 error, "access denied"

**Checks:**
- `BASE_URL` in Cloud Run env vars must exactly match the live URL
- Authorized redirect URI in Google Cloud Console must include: `https://cse-assit-983405469928.europe-west1.run.app/auth/google/callback`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly in Cloud Run

---

### Session expires too quickly / too slowly

**File:** `paypal_dashboard/server.js`

Find and update the inactivity timeout (default 45 minutes):
```javascript
const INACTIVITY_TIMEOUT = 45 * 60 * 1000; // milliseconds
```

---

### PDF generation fails

**Common causes:**
- reportlab not installed: `pip install reportlab --break-system-packages`
- Unicode subscript characters in text → use `<sub>` tags in Paragraph objects instead
- Wrong output path → update `OUT` variable in `build_pdf.py`

---

## 12. Quick Reference Cheatsheet

### URLs

| Resource | URL |
|----------|-----|
| Live dashboard | https://cse-assit-983405469928.europe-west1.run.app |
| GitHub repo | https://github.com/unarasimhan-web/cse_assit |
| Jira (ArmorCode) | https://armorcodeinc.atlassian.net |
| Google Drive folder | `My Drive/ai_projects/cse_assist/cse_assist/` |
| Google Drive Uma_AI_Mania ID | `1GVdjtVkljb77NH1SPUDfIpzLXpxszTdb` |

### Key File Paths

| File | Location |
|------|----------|
| Working memory | `cse_assist/CLAUDE.md` |
| Dashboard HTML | `cse_assist/paypal_dashboard/public/index.html` |
| Auth server | `cse_assist/paypal_dashboard/server.js` |
| Dashboard skill | `cse_assist/skills/cse-dashboard/SKILL.md` |
| Deployment PDF skill | `cse_assist/skills/cse-deployment-doc/SKILL.md` |
| PDF generator script | `cse_assist/skills/cse-deployment-doc/scripts/build_pdf.py` |
| Git push script | `cse_assist/push_skills.sh` |

### Common Commands

```bash
# Push skills/docs to GitHub
bash "/Users/unarasimhan/Library/CloudStorage/GoogleDrive-unarasimhan@armorcode.io/My Drive/ai_projects/cse_assist/cse_assist/push_skills.sh"

# Remove git lock file (when needed)
rm -f "/Users/unarasimhan/Library/CloudStorage/GoogleDrive-unarasimhan@armorcode.io/My Drive/ai_projects/cse_assist/cse_assist/.git/index.lock"

# Generate deployment PDF
cd cse_assist/skills/cse-deployment-doc/scripts
python build_pdf.py

# Install reportlab
pip install reportlab --break-system-packages
```

### PayPal Jira Labels

`PayPal` · `PayPal_PoC` · `PayPal_Prod` · `paypal` · `paypal-poc-list` · `paypal_poc`

### ArmorCode Brand Colors

| Name | Hex | Use |
|------|-----|-----|
| Deep Purple | `#35198E` | Header backgrounds |
| Purple | `#9A84DF` | Accents, highlights |
| Lavender | `#EDE9FB` | Card backgrounds |
| Light BG | `#F6F4FE` | Page background |
| Dark BG | `#1A0E4F` | Dark slides |

---

*Built by Uma Somi Narasimhan · ArmorCode CSE · May 2026*
