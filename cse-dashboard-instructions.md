# CSE Account Dashboard — Input Specification

This document describes every piece of information you need to provide in order to generate an exact replica of the ArmorCode CSE Dashboard for any customer account. Provide the data in the sections below and the dashboard will be built to match.

---

## 1. Account Identity

These fields drive the header, footer, and all Jira link domains.

| Field | Example | Description |
|---|---|---|
| **Account name** | PayPal | Customer's display name, used in title and headings |
| **Dashboard title** | CSE Dashboard | Subtitle shown in the header next to the logo |
| **Jira base URL** | `https://armorcodeinc.atlassian.net` | The root URL of your Jira instance |
| **CSE email** | `unarasimhan@armorcode.io` | Used to pre-fill Jira comment API calls |
| **Last updated date** | May 24, 2026 | Snapshot date shown in the header |
| **Account health status** | `NEEDS ATTENTION` | Badge in header — one of: `HEALTHY`, `NEEDS ATTENTION`, `AT RISK` |

---

## 2. Jira Labels for This Account

List **all** Jira label values that are used to tag tickets for this customer. Exact casing matters — include every variant.

**Example (PayPal):**
```
PayPal
PayPal_PoC
PayPal_Prod
paypal
paypal-poc-list
paypal_poc
```

These labels are used to build the "Active Bug" Jira link (broad query) and for the footer filter text.

---

## 3. Executive Summary

Write 2–4 sentences summarising the current account health, followed by 3–5 bullet-point action items. Each bullet should call out a specific ticket key, what it is, and why it matters.

**Format:**
```
[Account name] account has [N] open Jira tickets tracked via label [primary-label].
[X] active bugs — [one sentence on bug health].
Majority of open items are [type] in [stage], with [N] unassigned items including [N] Urgent/Highest priority.

Action items:
- [Action 1 — include ticket key(s), owner if relevant, and due date if set]
- [Action 2]
- [Action 3]
- [Action 4 — optional]
```

**Example:**
```
PayPal account has 16 open Jira tickets tracked via label PayPal. 0 active bugs — all recent PayPal bugs are resolved or closed. Majority of open items are Feature Requests / Stories in Requirements stage, with 9 unassigned items including 6 Urgent/Highest priority.

Action items:
- Assign owners to 6 Urgent/Highest unassigned FRs (PROD-2285, PROD-2286, PROD-2287, PROD-2831, PROD-3259, PROD-3316)
- Monitor ENG-118446 (CrowdStrike script update) — due June 3, 2026
- Advance ENG-123339 (ArmorCode Connect columns) from SCOPE — Urgent priority, Salim Khan assigned
- Progress PROD-2831 (Traceable Metrics) and PROD-3259 (Data Theorem correlation) — both Highest, unassigned
```

---

## 4. Stat Cards (7 total)

These are the seven summary numbers shown across the top of the dashboard. For each card, provide the count and the **complete list of Jira issue keys** that make up that number. The dashboard will build exact `key in (...)` Jira links from these lists so clicking a number opens precisely those tickets.

### Card 1 — Open Jira Tickets
Total count of all open non-bug tickets (Stories + Tasks combined).
```
Count: 16
Keys: PROD-2285, PROD-2287, PROD-2286, ENG-123339, PROD-3211, PROD-3316,
      ENG-113400, PROD-2831, PROD-3259, ENG-118446, PROD-2856, PROD-2843,
      PROD-3086, PROD-3127, DOC-3925, DOC-3963
```

### Card 2 — Active Bugs
Count of bugs that are still open AND were updated within the last 10 days. If zero, the card is green. The Jira link uses a dynamic "open + recently updated" JQL — no specific keys needed.
```
Count: 0
```

### Card 3 — Stories / FRs
Open Story/Feature Request tickets only.
```
Count: 14
Keys: PROD-2285, PROD-2287, PROD-2286, ENG-123339, PROD-3211, PROD-3316,
      ENG-113400, PROD-2831, PROD-3259, ENG-118446, PROD-2856, PROD-2843,
      PROD-3086, PROD-3127
```

### Card 4 — Tasks / Docs
Open Task and Documentation tickets only.
```
Count: 2
Keys: DOC-3925, DOC-3963
```

### Card 5 — Unassigned
Open tickets with no assignee.
```
Count: 9
Keys: PROD-2285, PROD-2287, PROD-2286, PROD-3316, PROD-2831, PROD-3259,
      PROD-2856, PROD-2843, PROD-3127
```

### Card 6 — Due Soon
Tickets with a due date within the next 7 days. Provide the single ticket key (or a comma-separated list if more than one).
```
Count: 1
Keys: ENG-118446
```

### Card 7 — In Progress
Tickets currently in "In Progress" status.
```
Count: 1
Keys: DOC-3925
```

---

## 5. Stories / Feature Requests Table

Provide one row per open Story/FR ticket. Columns: Key, Full Summary (used as tooltip), Display Summary (truncated version for the cell), Status, Priority, Assignee, ETA, Last Updated.

**Priority values:** `Urgent` | `Highest` | `High` | `Medium` | `Low`
**Status values:** `Requirements` | `SCOPE` | `SCHEDULE` | `FINALIZE` | `To Do` | `In Progress` | `Dev Done` | `Backlog` | `Need Info` | `Done`
**Assignee:** Use `Unassigned` for unowned tickets. Mark as `⚠ urgent-unassigned` if the ticket is Urgent or Highest priority and unassigned.
**ETA:** Use `—` if no due date is set in Jira.

```
Key        | Full Summary                                                               | Display Summary                                     | Status       | Priority | Assignee          | ETA        | Updated
-----------|----------------------------------------------------------------------------|-----------------------------------------------------|--------------|----------|-------------------|------------|------------
PROD-2285  | [FR] Agent Monitoring and Metrics                                          | [FR] Agent Monitoring and Metrics                   | Requirements | Urgent   | Unassigned ⚠      | —          | 2026-05-24
PROD-2287  | [FR] Data Sync Validation and Monitoring Setup                             | [FR] Data Sync Validation and Monitoring Setup      | Requirements | Urgent   | Unassigned ⚠      | —          | 2026-05-24
PROD-2286  | [FR] Post-Sync Security Engineer Workflows                                 | [FR] Post-Sync Security Engineer Workflows          | Requirements | Urgent   | Unassigned ⚠      | —          | 2026-05-24
ENG-123339 | [FR] AC Connect - Default Columns Configuration based on Issue Type        | [FR] AC Connect - Default Columns Config by Type    | SCOPE        | Urgent   | Salim Khan        | —          | 2026-05-22
PROD-3211  | [FR] Discovery support for Traceable                                       | [FR] Discovery support for Traceable                | Requirements | Urgent   | Sreejith S Menon  | —          | 2026-05-22
PROD-3316  | [FR] Extend Data Theorem - exploitability field (EASY/MODERATE/DIFFICULT)  | [FR] Extend Data Theorem: ingest exploitability field | Requirements | Urgent  | Unassigned ⚠      | —          | 2026-05-20
ENG-113400 | Add GCP Cloud Identifier Asset - Asset Correlation Rules                   | Add GCP Cloud Identifier Asset Correlation Rules    | SCHEDULE     | Highest  | Ritik Bansal      | —          | 2026-05-21
PROD-2831  | [Help] Enable Metrics & Monitoring for Traceable Integration               | [Help] Enable Metrics & Monitoring for Traceable    | Requirements | Highest  | Unassigned ⚠      | —          | 2026-05-20
PROD-3259  | [FR] Data Theorem: correlate findings between production and pre-production | [FR] Data Theorem: correlate prod & pre-prod findings | Requirements | Highest | Unassigned ⚠     | —          | 2026-05-20
ENG-118446 | CrowdStrike Container Security Data Script Update (rce/dos boolean flags)  | CrowdStrike Container Security Data Script Update   | To Do        | High     | Tarun Yadav       | 2026-06-03 | 2026-05-22
PROD-2856  | FR: Subgroups auto-generated in Non-Production even with no scans          | FR: Subgroups auto-generated in Non-Prod            | Requirements | High     | Unassigned        | —          | 2026-05-20
PROD-2843  | [FR] Enable Runbook Config JSON sync to GitHub for version control         | [FR] Runbook Config JSON sync to GitHub             | Backlog      | High     | Unassigned        | —          | 2026-05-20
PROD-3086  | [FR] CrowdStrike Container Runtime - use image_created_at with relative age filter | [FR] CrowdStrike Container: image_created_at filter | Requirements | Medium | Shagun Attri      | —          | 2026-05-22
PROD-3127  | [FR] Slack integration: trigger details + always execute Post to Slack step | [FR] Slack integration: trigger details & alert    | Requirements | Medium   | Unassigned        | —          | 2026-05-20
```

---

## 6. Tasks / Documentation Table

Same columns as Stories, but for Task and Documentation type tickets.

```
Key      | Full Summary                                                                           | Display Summary                                      | Status      | Priority | Assignee         | ETA | Updated
---------|----------------------------------------------------------------------------------------|------------------------------------------------------|-------------|----------|------------------|-----|------------
DOC-3925 | Docs: [PayPal] ArmorCode Connect Plugin Support for Custom Fields as Columns           | Docs: ArmorCode Connect Plugin — Custom Fields as Columns | In Progress | Medium | Varsha Madathil  | —   | 2026-05-21
DOC-3963 | Docs: [PayPal] ArmorCode Connect - Show for all work items limited to specific Issue Types | Docs: ArmorCode Connect — Issue Type Restriction | To Do      | Medium   | Puneet Kumar     | —   | 2026-05-21
```

---

## 7. Recent Bugs Table

Bugs follow a different inclusion rule: include a bug if it was **created in the last 60 days** OR is **still open and updated in the last 10 days**. Resolved/closed bugs remain visible for historical context.

Bugs have an extra **Created** column (before Last Updated). ETA column is always present (use `—` if none).

**Status values for bugs:** `Done` | `Dev Done` | `Invalid` | `In Progress` | `To Do` | `Backlog`

```
Key        | Full Summary                                                                                          | Display Summary                                        | Status  | Priority | Assignee                    | Created    | Last Updated | ETA
-----------|-------------------------------------------------------------------------------------------------------|--------------------------------------------------------|---------|----------|-----------------------------|------------|--------------|----
ENG-116091 | [PayPal] Multiple repository names found in GitHub Mappings causing 404 Error                        | [PayPal] Multiple Repo Names in GitHub Mappings → 404  | Done    | Highest  | Saqeeb Shaikh               | 2026-04-09 | 2026-05-21   | —
ENG-121065 | Jira plugin is unable to load jira project on configuration screen                                   | Jira Plugin Unable to Load Project on Config Screen    | Done    | High     | Salim Khan                  | 2026-05-13 | 2026-05-18   | —
ENG-117566 | [PayPal] Tickets Automatically Reopen After Detachment from Findings and Manual Closure              | [PayPal] Tickets Auto-Reopen After Detachment & Close  | Invalid | High     | Uma Somi Narasimhan         | 2026-04-22 | 2026-05-11   | —
ENG-116604 | [PayPal] Same CVE vulnerability reported as both P1 and P2 in ArmorCode                             | [PayPal] Same CVE Reported as P1 and P2                | Done    | High     | Nilesh Tadha                | 2026-04-14 | 2026-05-07   | —
ENG-118723 | [PayPal] [BUG][URG] Unable to open multiple tickets manually                                         | [PayPal] Unable to Open Multiple Tickets Manually      | Invalid | Urgent   | Uma Somi Narasimhan         | 2026-04-30 | 2026-05-06   | —
ENG-115848 | [PayPal] [BUG] AQL Timing Out on RunBook multi-filter block                                          | [PayPal] AQL Timing Out in Runbook Multi-Filter Block  | Done    | Highest  | Uma Somi Narasimhan         | 2026-04-07 | 2026-05-06   | —
ENG-116695 | Investigate 12-34 hour delay between scan ingestion and New Scan runbook execution                   | 12–34h Delay: Scan Ingestion → New Scan Runbook Trigger | Invalid | Urgent  | Uma Somi Narasimhan         | 2026-04-14 | 2026-05-04   | —
ENG-117758 | [PayPal] [BUG] Tickets being opened in Duplication for single finding                                | [PayPal] Duplicate Tickets Created for Single Finding  | Done    | Urgent   | Rohan Shah                  | 2026-04-23 | 2026-05-03   | —
ENG-117352 | [PayPal] [BUG] Found on and Age columns are swapped in AC Connect CSV export                         | [PayPal] 'Found On' & 'Age' Columns Swapped in CSV     | Done    | Urgent   | Balgovind Yadav             | 2026-04-21 | 2026-04-24   | —
ENG-116616 | [PayPal] Scheduled Runbook Not Processing Newly Ingested Findings — Manual Trigger Works             | [PayPal] Scheduled Runbook Skipping Ingested Findings  | Invalid | Highest  | Ehtesham Hussain Pradhan    | 2026-04-14 | 2026-04-22   | —
ENG-116586 | [PayPal] Component affected version and fixed version are switched on Jira Plugin                    | [PayPal] Affected & Fixed Versions Switched in Jira    | Done    | Urgent   | Balgovind Yadav             | 2026-04-13 | 2026-04-22   | —
```

---

## 8. Bug Section Subtitle

The subtitle line shown next to the "Recent Bugs" heading. Summarise the open bug count and any notable caveats.

**Example:**
```
Created in last 60 days OR open & updated in last 10 days · ✅ 0 open bugs · ⚠ No ETAs set in Jira
```

---

## Quick Reference — Priority / Assignee Rules

The dashboard applies two visual highlight rules automatically — you just need to supply correct data:

- **Urgent or Highest + Unassigned** → assignee cell shown in red with a ⚠ warning icon
- **High + Unassigned** → assignee cell shown in muted grey (no warning icon)
- **ETA within 7 days** → ETA cell highlighted in orange (`.due-soon`)
- **No ETA set** → display a dash `—`

---

## What You Do NOT Need to Provide

The following are hardcoded in the template and do not require input:

- Dashboard colour scheme and dark-mode styling
- Filter bar buttons (All / Stories / Tasks / Urgent / Unassigned / Bugs / Search)
- Pagination (5 rows per page, auto-shown when section has more than 5 rows)
- "Post on-track check" Jira comment action button (📊) on every row
- ArmorCode and PayPal logos in the header
- User info bar (populated via `/api/me` at runtime)
- Logout link

---

*Template version: May 2026 · ArmorCode CSE*
