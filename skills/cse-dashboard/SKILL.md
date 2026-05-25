---
name: cse-dashboard
description: >
  Build or refresh a Customer Success Engineer (CSE) dashboard for any ArmorCode customer account.
  Aggregates live data from Jira, Slack, and Zendesk into a dark-themed, self-contained HTML
  dashboard with stat cards, ticket tables, and an executive summary.
  Use this skill whenever Uma (or any CSE) says: "refresh the PayPal dashboard", "pull latest
  customer health", "update the dashboard", "build a CSE dashboard for [customer]", "what's the
  status on [customer]", or any request to aggregate cross-platform customer data into a dashboard.
  Also triggers on: "Jira + Slack + Zendesk", "customer health report", "CSE report for [customer]".
---

# CSE Customer Dashboard Skill

Build a self-contained, dark-themed HTML CSE dashboard for any ArmorCode customer.
Swap `paypal` → `<customer>` in config and re-run the data pipeline.

---

## Quick Start

1. Set config variables below for the target customer
2. Run data pipeline (Jira → Slack → Zendesk) in parallel
3. Render HTML dashboard with embedded data
4. Save to workspace as `<customer>_cse_dashboard.html`

---

## 1. Configuration Variables (change per customer)

| Variable | PayPal value | Description |
|---|---|---|
| `CUSTOMER_NAME` | `PayPal` | Display name |
| `JIRA_LABELS` | `["PayPal","PayPal_PoC","PayPal_Prod","paypal","paypal-poc-list","paypal_poc"]` | Discover dynamically — search for labels containing customer name substring |
| `SLACK_CHANNELS` | `ext-armorcode-paypal`, `paypal-prep`, `internal-paypal` | Customer-facing + internal channels |
| `ZENDESK_ORG` | `PayPal` | Zendesk org name filter |
| `JIRA_PROJECT` | `ENG` | Jira project key |
| `JIRA_CLOUD_ID` | `4af6aaa5-d149-4930-912e-b4b83218b9c6` | ArmorCode Jira Cloud ID |
| `JIRA_BASE_URL` | `https://armorcodeinc.atlassian.net` | Jira base URL |
| `CUSTOMER_COLOR_PRIMARY` | `#003087` | Brand primary color |
| `CUSTOMER_COLOR_SECONDARY` | `#009cde` | Brand accent color |

---

## 2. Data Pipeline

Run all three sources in parallel to save time.

### 2a. Jira — Active Stories/Tasks/Bugs

**Step 1: Discover labels** — query a sample of recent issues and inspect `labels` fields.
Never hardcode labels; always discover dynamically for each run.

**Step 2: Unified JQL** (from CLAUDE.md):
```
labels IN (paypal, PayPal, PayPal_Prod, paypal-poc-list, paypal_poc, PayPal_PoC)
AND created >= -90d
AND "zendesk status[short text]" !~ "Solved"
AND status NOT IN (Done, Invalid, "Won't Fix", "Wont Do", "Duplicate", "Deferred")
AND project IN (ENG, PROD, DEVOPS, SENTRY, Doc)
ORDER BY created DESC
```

**Step 3: Deduplicate** by issue key, sort: Urgent → Highest → High → Medium → Low, then created DESC.

**Fields per ticket:** `key`, `issuetype.name`, `summary`, `status.name`, `priority.name`,
`assignee.displayName`, `duedate`, `fixVersions` (ETA), `updated`, `created`

**Bug filter rule:**
- Include if: `statusCategory != Done AND updated >= -10d` (active open bug)
- Include if: `created >= -60d` (recent bug, any status — historical visibility)
- Exclude: `statusCategory != Done AND updated < -10d` (stale/abandoned)

### 2b. Slack — Customer Concerns & Internal Context

| Channel type | Channels | What to extract |
|---|---|---|
| Customer-facing | `ext-armorcode-<customer>` | Customer-raised issues/concerns (last 7 days) |
| Internal prep | `<customer>-prep`, `internal-<customer>` | ArmorCode action items, technical context (last 7 days) |

### 2c. Zendesk — Ticket History & In-Flight

- **Historical (last 90 days):** Closed/resolved → bucket into `Bugs`, `Feature Requests`, `Service Tickets` → trend data for chart
- **In-flight:** Open/active tickets → current status, assignee, ETA

---

## 3. Dashboard HTML Structure

### Header
```
[ArmorCode logo] | [Customer logo] | CSE Dashboard    [Last updated date]
```

### Stat Cards — "Jira Stats" section (single row, 7 cards)
1. Open Jira Tickets (all non-Done, non-Bug) → links to JQL
2. Active Bugs (non-Done, updated ≥ -10d) → links to JQL
3. Stories / FRs → links to JQL
4. Tasks / Docs → links to JQL
5. Unassigned → links to JQL
6. Due Soon (duedate ≤ 1 week) → links to JQL
7. In Progress (status = "In Progress") → links to JQL

**Clicking the number** → opens Jira filtered view in new tab (encoded JQL URL)
**Clicking the card label/background** → filters the table below locally

### Executive Summary
Auto-generate a plain-English paragraph from fetched data. Do not contradict table data.
Include: overall health, open count, active bugs, key priorities, unassigned owners.

### Filter Bar
Type buttons: All · Stories · Tasks · Bugs + Search input

### Tables (paginated, 5 rows/page)

**Stories / Feature Requests**
Columns: Key (linked) | Summary | Status | Priority | Assignee | ETA | Updated

**Tasks / Documentation**
Columns: Key (linked) | Summary | Status | Priority | Assignee | ETA | Updated

**Recent Bugs**
Columns: Key (linked) | Summary | Status | Priority | Assignee | ETA | Created | Last Updated

### Pagination
- 5 rows per page, Prev/Next buttons
- **No scrollIntoView on page change** — stay in place
- Show pager only when > 5 filtered rows

---

## 4. Key CSS/JS Patterns

### Stat card click (link vs. filter)
```javascript
function filterStat(type, card, event) {
  if (event && event.target.closest('a')) return; // let Jira link navigate
  // apply local filter to tables
}
```

### data-filtered pattern
Use `row.dataset.filtered = 'true'/'false'` to track filter state separately from
`style.display` (used for pagination). Prevents class conflicts.

### Pagination (no scroll)
```javascript
function changePage(sec, dir) {
  sectionPages[sec] = Math.max(1, sectionPages[sec] + dir);
  applyPagination();
  // DO NOT call scrollIntoView here
}
```

### JQL URL encoding
```javascript
const jql = `labels = "paypal" AND issuetype = Story AND statusCategory != Done ORDER BY updated DESC`;
const url = `https://armorcodeinc.atlassian.net/issues/?jql=${encodeURIComponent(jql)}`;
```

---

## 5. Brand / Theme

```css
:root {
  --bg: #0f1117;       /* page background */
  --surface: #1a1d27;  /* card/header background */
  --surface2: #222536; /* secondary surface */
  --border: #2e3150;   /* borders */
  --accent: #6c63ff;   /* ArmorCode purple */
  --text: #e8eaf6;     /* primary text */
  --muted: #8b91b5;    /* secondary text */
  --red: #ff4d6d;      /* bugs/urgent */
  --orange: #ff9f43;   /* unassigned */
  --yellow: #ffd60a;   /* due soon */
  --green: #2ed573;    /* healthy state */
  --blue: #48cae4;     /* tasks */
}
```

ArmorCode logo: 3-circle SVG with `isolation:isolate` + `mix-blend-mode:multiply`.
Colors: pink top-left, blue top-right, yellow bottom, dark indigo center.

---

## 6. How to Extend to a New Customer

1. Set `CUSTOMER_NAME` and dynamically discover Jira labels matching that name
2. Identify Slack channels: `ext-armorcode-<customer>`, `<customer>-prep`, `internal-<customer>`
3. Update Zendesk org filter
4. Replace stat card JQL — substitute customer labels
5. Replace customer logo in header
6. Save as `<customer>_cse_dashboard.html` in workspace
7. Update CLAUDE.md → add new customer entry under "Key Accounts"

---

## 7. Jira URL Formats

```
# Open specific issue
https://armorcodeinc.atlassian.net/browse/ENG-12345

# Filtered board view (JQL)
https://armorcodeinc.atlassian.net/issues/?jql=ENCODED_JQL_HERE

# Cloud ID (REST API)
4af6aaa5-d149-4930-912e-b4b83218b9c6
```

---

## 8. File Location Pattern

```
cse_assist/
├── CLAUDE.md                        ← working memory (update per customer)
├── skills/
│   ├── cse-dashboard/SKILL.md       ← this file
│   └── cse-deployment-doc/SKILL.md  ← deployment PDF skill
├── paypal_dashboard/
│   ├── public/index.html            ← self-contained dashboard
│   ├── server.js                    ← Express + Google OAuth
│   ├── Dockerfile
│   └── package.json
└── <next_customer>_dashboard/       ← copy paypal_dashboard here
```

---

*Last updated: May 2026 — built for Uma Somi Narasimhan, CSE @ ArmorCode*
