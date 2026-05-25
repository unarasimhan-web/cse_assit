# Working Memory — CSE Assist

## User
- **Name:** Uma Somi Narasimhan (NOT "Una")
- **Email:** unarasimhan@armorcode.io
- **Role:** Customer Success Engineer @ ArmorCode

## Key Accounts
- **PayPal** — Primary account. Slack channels: `#ext-armorcode-paypal`, `#paypal-prep`, `#internal-paypal`
  - Dashboard (local): `cse_assist/paypal_dashboard/public/index.html`
  - Dashboard (live): https://cse-assit-983405469928.europe-west1.run.app
  - GitHub repo: https://github.com/unarasimhan-web/cse_assit
  - Cloud Run project: `cse-kyc` (europe-west1)
  - Jira labels: `PayPal`, `PayPal_PoC`, `PayPal_Prod`, `paypal`, `paypal-poc-list`, `paypal_poc`

## Jira Query Methodology for Customer Dashboards

### PayPal JQL (single unified query)
```
labels IN (paypal, PayPal, PayPal_Prod, paypal-poc-list, paypal_poc, PayPal_PoC)
AND created >= -90d
AND "zendesk status[short text]" !~ "Solved"
AND status NOT IN (Done, Invalid, "Won't Fix", "Wont Do", "Duplicate", "Deferred")
AND project IN (ENG, PROD, DEVOPS, SENTRY, Doc)
ORDER BY created DESC
```

### Enrich
Per ticket extract: `key`, `issuetype.name`, `summary`, `status.name`, `priority.name`, `assignee.displayName`, `duedate`, `fixVersions` (for ETA), `created`, `updated`.

## Dashboard Architecture (Customer CSE Dashboard)
See `cse-dashboard-skill.md` in this folder for the full reusable skill.
