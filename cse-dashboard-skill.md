# CSE Customer Dashboard — Reusable Skill

> **Purpose:** Build a self-contained, dark-themed HTML CSE dashboard for any ArmorCode customer account. Swap `paypal` → `<customer>` in config and re-run the data pipeline.

---

## 1. Configuration Variables (change per customer)

| Variable | PayPal value | Description |
|---|---|---|
| `CUSTOMER_NAME` | `PayPal` | Display name |
| `JIRA_LABELS` | `["PayPal","PayPal_PoC","PayPal_Prod","paypal","paypal-poc-list","paypal_poc"]` | All labels containing customer substring — **discover dynamically** |
| `SLACK_CHANNELS` | `ext-armorcode-paypal`, `paypal-prep`, `internal-paypal` | Customer-facing + internal channels |
| `ZENDESK_ORG` | `PayPal` | Zendesk org name filter |
| `JIRA_PROJECT` | `ENG` | Jira project key |
| `JIRA_CLOUD_ID` | `4af6aaa5-d149-4930-912e-b4b83218b9c6` | ArmorCode Jira Cloud ID |
| `JIRA_BASE_URL` | `https://armorcodeinc.atlassian.net` | Jira base URL |
| `CUSTOMER_COLOR_PRIMARY` | `#003087` | Brand primary color (e.g. PayPal blue) |
| `CUSTOMER_COLOR_SECONDARY` | `#009cde` | Brand accent color |

---

## 2. Data Pipeline

### 2a. Jira — Active Stories/Tasks/Bugs

**Step 1: Discover all labels matching `<customer>` substring**
- Use `searchJiraIssuesUsingJql` with a sample query, then inspect returned `labels` fields
- Never hardcode; always rediscover for each run

**Step 2: Run two parallel JQL queries**

Query A (label-based, no date limit):
```
project = ENG AND type in (Story, Task, Bug)
AND labels in ("<label1>","<label2>",...)
AND statusCategory != Done
ORDER BY priority ASC, created DESC
```

Query B (text-based, last 30 days):
```
project = ENG AND type in (Story, Task, Bug)
AND (summary ~ "<customer>" OR description ~ "<customer>")
AND statusCategory != Done AND created >= -30d
ORDER BY priority ASC, created DESC
```

**Step 3: Deduplicate by issue key, sort: Urgent→Highest→High→Medium→Low, then created DESC**

**Fields to extract per ticket:**
`key`, `issuetype.name`, `summary`, `status.name`, `priority.name`, `assignee.displayName`, `duedate`, `fixVersions` (ETA), `updated`, `created`

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

- **Historical (last 90 days):** Closed/resolved tickets → bucket into `Bugs`, `Feature Requests`, `Service Tickets` → trend data for chart
- **In-flight:** Open/active tickets → current status, assignee, ETA

---

## 3. Dashboard HTML Structure

### Header
```
[ArmorCode logo] | [Customer logo] | CSE Dashboard    [Last updated date] [User info]
```

### Stat Cards — "Jira Stats" section (single row, 7 cards)
1. Open Jira Tickets (all non-Done, non-Bug) → links to JQL
2. Active Bug (non-Done, updated ≥ -10d) → links to JQL
3. Stories / FRs → links to JQL
4. Tasks / Docs → links to JQL
5. Unassigned → links to JQL
6. Due Soon (duedate ≤ 1 week) → links to JQL
7. In Progress (status = "In Progress") → links to JQL

**Clicking the number** → opens Jira filtered view in new tab (Jira URL with encoded JQL)
**Clicking the card label/background** → filters the table below locally

### Executive Summary
Plain English paragraph: overall health, open count, active bugs, key priorities, unassigned owners.
Auto-generate from fetched data; do not contradict the table data.

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
- 5 rows per page
- Prev/Next buttons — **no scroll on page change** (remove `scrollIntoView`)
- Show pager only when > 5 filtered rows

---

## 4. Key CSS/JS Patterns

### Stat card click behavior
```javascript
// Card background → local filter; Number <a> → navigate to Jira
function filterStat(type, card, event) {
  if (event && event.target.closest('a')) return;  // let link navigate
  // ... apply filter
}
```

### data-filtered attribute pattern
Use `row.dataset.filtered = 'true'/'false'` to track filter state separately from `style.display` (used for pagination). This avoids class conflicts.

### Pagination (no scroll)
```javascript
function changePage(sec, dir) {
  sectionPages[sec] = Math.max(1, sectionPages[sec] + dir);
  applyPagination();
  // DO NOT call scrollIntoView here
}
```

### JQL URL encoding for stat card links
```javascript
const jql = `labels = "paypal" AND issuetype = Story AND statusCategory != Done ORDER BY updated DESC`;
const url = `https://armorcodeinc.atlassian.net/issues/?jql=${encodeURIComponent(jql)}`;
```

---

## 5. Brand / Theme

```css
:root {
  --bg: #0f1117;         /* page background */
  --surface: #1a1d27;    /* card/header background */
  --surface2: #222536;   /* secondary surface */
  --border: #2e3150;     /* borders */
  --accent: #6c63ff;     /* ArmorCode purple */
  --text: #e8eaf6;       /* primary text */
  --muted: #8b91b5;      /* secondary text */
  --red: #ff4d6d;        /* bugs/urgent */
  --orange: #ff9f43;     /* unassigned */
  --yellow: #ffd60a;     /* due soon */
  --green: #2ed573;      /* active bugs = 0 */
  --blue: #48cae4;       /* tasks */
  /* Customer overrides: */
  --pp-blue: #003087;    /* PayPal primary — replace per customer */
  --pp-light: #009cde;   /* PayPal accent — replace per customer */
}
```

ArmorCode logo: 3-circle SVG with `isolation:isolate` + `mix-blend-mode:multiply` (or embedded base64 PNG). Colors: pink top-left, blue top-right, yellow bottom, dark indigo center.

---

## 6. How to Extend to a New Customer

1. **Copy** `paypal_dashboard/` → `<customer>_dashboard/`
2. **Update config variables** at top of `index.html`
3. **Re-run Jira pipeline** with new customer's label set (use dynamic discovery)
4. **Replace customer logo** in header
5. **Update Slack channels** in sidebar/exec summary
6. **Update Zendesk filter** to new org name
7. **Regenerate executive summary** from fresh data
8. **Update stat card JQL** — replace `"paypal"` label with customer labels

### Files to update
- `paypal_dashboard/public/index.html` → main dashboard (all data is embedded as static HTML)
- `paypal_dashboard/server.js` → Google OAuth server (update session secret if needed)
- `paypal_dashboard/Dockerfile` → no changes needed
- `CLAUDE.md` → add new customer entry under "Key Accounts"

---

## 7. Jira Issue URL Formats

```
# Open specific issue
https://armorcodeinc.atlassian.net/browse/ENG-12345

# Filtered board view (JQL)
https://armorcodeinc.atlassian.net/issues/?jql=ENCODED_JQL_HERE

# Cloud ID (for REST API)
4af6aaa5-d149-4930-912e-b4b83218b9c6
```

---

## 8. Dashboard File Location Pattern

```
cse_assist/
├── CLAUDE.md                  ← working memory (update per customer)
├── cse-dashboard-skill.md     ← this file
├── paypal_dashboard/
│   ├── public/
│   │   └── index.html         ← self-contained dashboard
│   ├── server.js              ← Express + Google OAuth
│   ├── Dockerfile
│   └── package.json
└── <next_customer>_dashboard/ ← copy paypal_dashboard here
```

---

*Last updated: May 24, 2026 — built for Uma Somi Narasimhan, CSE @ ArmorCode*
