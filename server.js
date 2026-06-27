const express = require('express');
const cookieSession = require('cookie-session');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const path = require('path');
const fs   = require('fs');
require('dotenv').config();

// ── Customer Configs ──────────────────────────────────────────────────────────
const CUSTOMER_CONFIGS = {
  paypal: {
    id: 'paypal', name: 'PayPal',
    primaryColor: '#4A90FF', secondaryColor: '#00C2FF',
    jqlLabels: 'labels IN (paypal, PayPal, PayPal_Prod, paypal-poc-list, paypal_poc, PayPal_PoC)',
    slackChannels: ['ext-paypal-armorcode', 'paypal-prep', 'internal-paypal'],
  },
  beneva: {
    id: 'beneva', name: 'Beneva',
    primaryColor: '#A855F7', secondaryColor: '#C084FC',
    jqlLabels: 'labels IN (beneva)',
    slackChannels: ['internal-beneva'],
  },
  korber: {
    id: 'korber', name: 'Korber',
    primaryColor: '#FF5733', secondaryColor: '#FF8C69',
    jqlLabels: 'labels ~ "korber"',
    slackChannels: [],
  },
  solera: {
    id: 'solera', name: 'Solera',
    primaryColor: '#FFB132', secondaryColor: '#FFCC70',
    jqlLabels: 'labels IN (solera, Solera)',
    slackChannels: [],
  },
  visa: {
    id: 'visa', name: 'Visa',
    primaryColor: '#4169E1', secondaryColor: '#F7B600',
    jqlLabels: 'labels IN (visa)',
    slackChannels: [],
  },
  stancorp: {
    id: 'stancorp', name: 'StanCorp',
    primaryColor: '#22C55E', secondaryColor: '#4ADE80',
    jqlLabels: 'labels IN (Standard)',
    slackChannels: [],
  },
};

// Cache index.html at startup for fast customer page serving
let _indexHtmlCache = null;
function getIndexHtml() {
  if (!_indexHtmlCache) {
    _indexHtmlCache = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  }
  return _indexHtmlCache;
}

// Build a per-customer version of index.html by injecting config + swapping tokens
function buildCustomerPage(cfg) {
  let html = getIndexHtml();

  // 1. Inject window.CUSTOMER_CONFIG before </head>
  const safeConfig = { id: cfg.id, name: cfg.name, primaryColor: cfg.primaryColor, secondaryColor: cfg.secondaryColor, slackChannels: cfg.slackChannels };
  html = html.replace('</head>', `<script>window.CUSTOMER_CONFIG=${JSON.stringify(safeConfig)};</script>\n</head>`);

  // 2. CSS brand colors
  html = html.replace('--pp-blue: #003087;', `--pp-blue: ${cfg.primaryColor};`);
  html = html.replace('--pp-light: #009cde;', `--pp-light: ${cfg.secondaryColor};`);

  // 3. Page title + exec summary heading
  html = html.replace('<title>PayPal Customer 360 — ArmorCode</title>', `<title>${cfg.name} Customer 360 — ArmorCode</title>`);
  html = html.replace('Executive Summary — PayPal Account', `Executive Summary — ${cfg.name} Account`);
  html = html.replace('ArmorCode Customer 360 &nbsp;·&nbsp; PayPal Account', `ArmorCode Customer 360 &nbsp;·&nbsp; ${cfg.name} Account`);

  // 4. Customer logo in header: replace PayPal SVG with customer name text
  html = html.replace(
    /<div class="paypal-logo">[\s\S]*?<\/svg>\s*<\/div>\s*(<div class="logo-divider"><\/div>)\s*(<h1>Customer 360<\/h1>)/,
    `<div class="paypal-logo"><span style="font-weight:700;font-size:16px;color:${cfg.primaryColor}">${cfg.name}</span></div>\n    $1\n    $2`
  );

  // 5. Activate "← All Customers" back-nav slot in header (inject href + content)
  const backLogoSvg = `<svg width="18" height="20" viewBox="0 0 84 92" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="flex-shrink:0"><defs><clipPath id="bcp_p"><circle cx="30" cy="34" r="27"/></clipPath><clipPath id="bcp_b"><circle cx="54" cy="34" r="27"/></clipPath><clipPath id="bcp_y"><circle cx="42" cy="56" r="27"/></clipPath><mask id="bm_pb"><circle cx="54" cy="34" r="27" clip-path="url(#bcp_p)" fill="white"/></mask></defs><circle cx="30" cy="34" r="27" fill="#F9A8C0"/><circle cx="54" cy="34" r="27" fill="#A8C4F8"/><circle cx="42" cy="56" r="27" fill="#F8F8A0"/><circle cx="54" cy="34" r="27" clip-path="url(#bcp_p)" fill="#C89AD8"/><circle cx="42" cy="56" r="27" clip-path="url(#bcp_p)" fill="#F08098"/><circle cx="42" cy="56" r="27" clip-path="url(#bcp_b)" fill="#88CCA8"/><circle cx="42" cy="56" r="27" clip-path="url(#bcp_y)" mask="url(#bm_pb)" fill="#5C4A8A"/></svg>`;
  html = html.replace(
    '<a id="back-nav-slot" class="back-nav"></a>',
    `<a id="back-nav-slot" class="back-nav" href="/">${backLogoSvg}<span>← All Customers</span></a>`
  );

  // 6. Replace Slack section for non-PayPal customers
  if (cfg.id !== 'paypal') {
    const slackSection = buildSlackSection(cfg);
    html = html.replace(
      /<div class="section" id="section-slack">[\s\S]*?<\/div><!-- \/section-slack -->/,
      slackSection
    );
  }

  return html;
}

function buildSlackSection(cfg) {
  if (!cfg.slackChannels || cfg.slackChannels.length === 0) {
    return `<div class="section" id="section-slack">
      <div class="section-header"><span class="section-title">💬 Slack Context</span></div>
      <div style="padding:16px 0;color:var(--muted);font-size:13px;">No Slack channels configured for ${cfg.name} yet.</div>
    </div><!-- /section-slack -->`;
  }
  const channelPills = cfg.slackChannels.map(c =>
    `<span style="background:#222536;padding:3px 10px;border-radius:4px;font-family:monospace;font-size:12px">#${c}</span>`
  ).join(' ');
  return `<div class="section" id="section-slack">
    <div class="section-header"><span class="section-title">💬 Slack Context</span></div>
    <div style="padding:12px 0">
      <p style="font-size:13px;color:var(--muted);margin-bottom:8px">Configured channels: ${channelPills}</p>
      <p style="font-size:12px;color:var(--muted);font-style:italic">Live Slack data will appear here once the channel integration is enabled for this account.</p>
    </div>
  </div><!-- /section-slack -->`;
}

// ── Google Sheets visitor tracking ────────────────────────────────────────────
const { google } = require('googleapis');

function getSheetsClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;
  try {
    const creds = JSON.parse(keyJson);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
  } catch (e) {
    console.error('[Sheets] Failed to init client:', e.message);
    return null;
  }
}

async function logVisit(user) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheets  = getSheetsClient();
  if (!sheetId || !sheets) return;
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Visits!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          new Date().toISOString(),
          user.name  || '',
          user.email || '',
          'Dashboard',
        ]],
      },
    });
  } catch (e) {
    console.error('[Sheets] logVisit error:', e.message);
  }
}

async function getVisits() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const sheets  = getSheetsClient();
  if (!sheetId || !sheets) return null;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Visits!A:D',
    });
    const rows = (res.data.values || []).slice(1); // skip header
    return rows;
  } catch (e) {
    console.error('[Sheets] getVisits error:', e.message);
    return null;
  }
}

const app = express();
const PORT = process.env.PORT || 8080;
const ALLOWED_DOMAIN = 'armorcode.io';
const BASE_URL = process.env.BASE_URL || 'https://customer-360-vosbz2bghq-ew.a.run.app';

// Trust Cloud Run's proxy so secure cookies work over HTTPS
app.set('trust proxy', 1);

// Guard: crash early if OAuth credentials are missing
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.');
  process.exit(1);
}

// ── Session (cookie-based — stateless, works across all Cloud Run instances) ──
app.use(cookieSession({
  name: 'ac_session',
  keys: [process.env.SESSION_SECRET || 'change-me-in-production'],
  maxAge: 8 * 60 * 60 * 1000,
  secure: true,
  sameSite: 'lax',
  httpOnly: true,
}));

// ── Passport compatibility shim for cookie-session ─────────────────────────
// passport >= 0.6 calls req.session.regenerate/save which cookie-session lacks
app.use((req, res, next) => {
  if (req.session && !req.session.regenerate) {
    req.session.regenerate = (cb) => cb();
  }
  if (req.session && !req.session.save) {
    req.session.save = (cb) => cb();
  }
  next();
});

// ── Passport ───────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${BASE_URL}/auth/google/callback`,
  scope: ['profile', 'email'],
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value || '';
  const domain = email.split('@')[1];

  if (domain !== ALLOWED_DOMAIN) {
    return done(null, false, { message: `Access restricted to @${ALLOWED_DOMAIN} accounts.` });
  }

  return done(null, {
    id: profile.id,
    name: profile.displayName,
    email,
    photo: profile.photos?.[0]?.value,
  });
}));

// ── Inactivity timeout (45 minutes) ────────────────────────────────────────
const INACTIVITY_MS = 45 * 60 * 1000;

app.use((req, res, next) => {
  // Skip auth routes themselves
  if (req.path.startsWith('/auth') || req.path === '/unauthorized') return next();

  if (req.isAuthenticated()) {
    const now = Date.now();
    const last = req.session.lastActivity || now;
    if (now - last > INACTIVITY_MS) {
      // Session expired due to inactivity — force re-login
      req.logout(() => {
        req.session = null;
        res.clearCookie('ac_session');
        res.clearCookie('ac_session.sig');
        res.redirect('/auth/google?prompt=select_account');
      });
      return;
    }
    req.session.lastActivity = now;
  }
  next();
});

// ── Auth middleware ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/google');
}

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/auth/google', (req, res, next) => {
  const opts = { scope: ['profile', 'email'] };
  if (req.query.prompt) opts.prompt = req.query.prompt;
  passport.authenticate('google', opts)(req, res, next);
});

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/unauthorized' }),
  (req, res) => {
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

app.get('/unauthorized', (req, res) => {
  res.status(403).send(`
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
    <title>Access Denied — ArmorCode</title>
    <style>
      body { background:#0f1117;color:#e8eaf6;font-family:system-ui,sans-serif;
             display:flex;align-items:center;justify-content:center;height:100vh;margin:0; }
      .box { text-align:center;padding:40px;background:#1a1d27;border:1px solid #2e3150;
             border-radius:16px;max-width:400px; }
      .badge { background:#ff4d6d22;border:1px solid #ff4d6d;color:#ff4d6d;
               display:inline-block;padding:4px 14px;border-radius:20px;
               font-size:12px;font-weight:700;margin-bottom:20px; }
      h1 { font-size:22px;margin-bottom:10px; }
      p  { color:#8b91b5;font-size:14px;line-height:1.6; }
      a  { display:inline-block;margin-top:24px;padding:10px 24px;background:#6c63ff;
           color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600; }
    </style></head>
    <body><div class="box">
      <div class="badge">ACCESS DENIED</div>
      <h1>ArmorCode Employees Only</h1>
      <p>This dashboard is restricted to <strong>@armorcode.io</strong> Google accounts.</p>
      <a href="/auth/google">Try a different account</a>
    </div></body></html>
  `);
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    req.session = null;
    res.clearCookie('ac_session');
    res.clearCookie('ac_session.sig');
    // Add prompt=select_account so Google doesn't silently re-authenticate
    res.redirect('/auth/google?prompt=select_account');
  });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email, photo: req.user.photo });
});

// ── Jira tickets proxy (PayPal JQL) ────────────────────────────────────────
app.get('/api/tickets', requireAuth, async (req, res) => {
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;

  if (!jiraEmail || !jiraToken) {
    return res.status(503).json({ error: 'Jira credentials not configured. Set JIRA_EMAIL and JIRA_API_TOKEN env vars.' });
  }

  const jql = [
    'labels IN (paypal, PayPal, PayPal_Prod, paypal-poc-list, paypal_poc, PayPal_PoC)',
    'AND project IN (ENG, PROD, DEVOPS, SENTRY, Doc)',
    'AND status NOT IN (Done, Invalid, "Won\'t Fix", "Wont Do", "Duplicate", "Deferred")',
    'AND created >= -365d',
    'ORDER BY created DESC'
  ].join(' ');

  const fields = 'key,id,issuetype,summary,status,priority,assignee,duedate,fixVersions,created,updated,labels,customfield_10020,subtasks,issuelinks,comment';
  const auth   = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const params = new URLSearchParams({ jql, fields, maxResults: 100, startAt: 0, expand: 'changelog' });
  const url    = `https://armorcodeinc.atlassian.net/rest/api/3/search/jql?${params}`;

  try {
    const jiraRes = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!jiraRes.ok) {
      const errText = await jiraRes.text().catch(() => '');
      console.error(`Jira API error ${jiraRes.status}:`, errText.slice(0, 300));
      return res.status(502).json({ error: `Jira returned ${jiraRes.status}`, details: errText.slice(0, 200) });
    }

    const data = await jiraRes.json();

    // Log top-level keys so we can see the actual response shape in Cloud Run logs
    console.log('[Jira] response keys:', Object.keys(data));
    console.log('[Jira] total:', data.total, '| issues count:', (data.issues || data.values || []).length);

    // New /search/jql endpoint returns 'issues'; fallback to 'values' just in case
    const rawIssues = data.issues || data.values || [];

    const CLOSED_STATUSES = ['done','invalid',"won't fix",'wont fix','wont do','duplicate','deferred'];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // CS team account IDs (Nick Palaszewski + Ubaidur Rahman)
    const CS_ACCOUNT_IDS = new Set([
      '712020:3097823e-a9a8-4a91-a242-6cee8c91b020', // Nick Palaszewski
      '712020:95408ab1-292f-4529-a380-b8d8cb5742a1', // Ubaidur Rahman
    ]);

    const tickets = rawIssues.map(issue => {
      const f = issue.fields || {};
      // Sprint: returned as customfield_10020 in Jira REST API v3
      const sprintArr = f['customfield_10020'] || [];
      const activeSprint = Array.isArray(sprintArr)
        ? sprintArr.find(s => s.state === 'active') || sprintArr[sprintArr.length - 1]
        : (sprintArr && typeof sprintArr === 'object' ? sprintArr : null);

      return {
        key:       issue.key,
        id:        issue.id,
        type:      f.issuetype?.name       || 'Story',
        summary:   f.summary               || '',
        status:    f.status?.name          || '',
        priority:  f.priority?.name        || 'Medium',
        assignee:  f.assignee?.displayName || null,
        duedate:   f.duedate               || null,
        eta:       (f.fixVersions || [])[0]?.releaseDate || null,
        etaName:   (f.fixVersions || [])[0]?.name       || null,
        created:   f.created               || null,
        updated:   f.updated               || null,
        labels:         f.labels                || [],
        sprint:         activeSprint?.name      || null,
        sprintEnd:      activeSprint?.endDate   || null,
        closedRecently: CLOSED_STATUSES.includes((f.status?.name || '').toLowerCase()) &&
                        f.updated && new Date(f.updated).getTime() >= sevenDaysAgo,
        subtasks: (f.subtasks || [])
          .filter(s => s && s.key && s.fields?.summary)   // must have key + summary
          .map(s => ({
            key:      s.key,
            id:       s.id,
            type:     s.fields?.issuetype?.name || 'Sub-task',
            summary:  s.fields?.summary         || '',
            status:   s.fields?.status?.name    || '',
            priority: s.fields?.priority?.name  || '',
            linkType: 'Sub-task',
          })),
        linkedIssues: (f.issuelinks || []).map(l => {
          const linked = l.inwardIssue || l.outwardIssue;
          // Require a valid key AND a non-empty summary to count as a real link
          if (!linked || !linked.key || !linked.fields?.summary) return null;
          const dir = l.inwardIssue ? l.type?.inward : l.type?.outward;
          return {
            key:       linked.key,
            id:        linked.id,
            type:      linked.fields?.issuetype?.name || '',
            summary:   linked.fields?.summary         || '',
            status:    linked.fields?.status?.name    || '',
            priority:  linked.fields?.priority?.name  || '',
            linkType:  dir || l.type?.name            || 'Link',
            direction: l.inwardIssue ? 'inward' : 'outward',
          };
        }).filter(Boolean),
        // Sprint rollovers: full trail from changelog, sorted chronologically
        ...(() => {
          const histories = (issue.changelog?.histories || [])
            .slice()
            .sort((a, b) => new Date(a.created) - new Date(b.created));
          const changes = [];
          for (const h of histories) {
            for (const item of (h.items || [])) {
              if (item.field === 'Sprint') {
                changes.push({ from: item.fromString || null, to: item.toString || null });
              }
            }
          }
          // A true rollover = moved FROM one sprint TO another (both must be non-null)
          // Removals (from=sprint, to=null) and initial assignments (from=null, to=sprint) are NOT rollovers
          const rollovers    = changes.filter(c => c.from && c.to).length;
          const firstSprint  = changes.find(c => !c.from && c.to)?.to || null;
          // trail = only entries where ticket was actively placed in a sprint (to is non-null)
          const allSprints   = changes.filter(c => c.to).map(c => c.to);
          const sprintTrail  = allSprints.filter((s, i) => i === 0 || s !== allSprints[i - 1]);
          return { rollovers, firstSprint, sprintTrail };
        })(),
        // CS team ETA/update requests: comments from Nick or Ubaidur that ask for an ETA or status
        csReachouts: (() => {
          const ETA_RE = /\beta\b|timeline|any update|updates here|please pick|get eyes on|pushing for this|keep getting asked|please share|please confirm|going to be released|go live|when will|blocker|can you please|can we please/i;
          const comments = f.comment?.comments || [];
          return comments.filter(c =>
            CS_ACCOUNT_IDS.has(c.author?.accountId) && ETA_RE.test(adfToText(c.body))
          ).length;
        })(),
        csReachoutBy: (() => {
          const ETA_RE = /\beta\b|timeline|any update|updates here|please pick|get eyes on|pushing for this|keep getting asked|please share|please confirm|going to be released|go live|when will|blocker|can you please|can we please/i;
          const comments = f.comment?.comments || [];
          const names = [...new Set(
            comments
              .filter(c => CS_ACCOUNT_IDS.has(c.author?.accountId) && ETA_RE.test(adfToText(c.body)))
              .map(c => c.author?.displayName || '')
              .filter(Boolean)
          )];
          return names;
        })(),
      };
    });

    // Filter out PROD tickets that have no customer engagement AND aren't actively being worked on
    const ACTIVE_WORKING = new Set([
      'in progress','in review','in development','with engineering','in qa',
      'code review','testing','ready for release','under review','in progress - waiting for customer',
    ]);
    const filtered = tickets.filter(t => {
      if (!t.key.startsWith('PROD-')) return true;
      const isActive = ACTIVE_WORKING.has((t.status || '').toLowerCase());
      const hasCustomerPush = (t.csReachouts || 0) > 0;
      return isActive || hasCustomerPush;
    });

    console.log('[Jira] mapped tickets:', tickets.length, '| after PROD filter:', filtered.length, '| first key:', filtered[0]?.key || 'none');
    res.json({ tickets: filtered, total: data.total, fetched: filtered.length, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Jira proxy error:', err);
    res.status(502).json({ error: 'Failed to reach Jira', details: err.message });
  }
});

// ── Generic Jira tickets proxy (any customer) ─────────────────────────────
app.get('/api/tickets/:customer', requireAuth, async (req, res) => {
  const cfg = CUSTOMER_CONFIGS[req.params.customer];
  if (!cfg) return res.status(404).json({ error: 'Unknown customer: ' + req.params.customer });

  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  if (!jiraEmail || !jiraToken) {
    return res.status(503).json({ error: 'Jira credentials not configured.' });
  }

  const jql = [
    cfg.jqlLabels,
    'AND project IN (ENG, PROD)',
    'AND status NOT IN (Done, Invalid, "Won\'t Fix", "Wont Do", "Duplicate", "Deferred")',
    'AND created >= -365d',
    'ORDER BY created DESC'
  ].join(' ');

  // NOTE: 'comment' field omitted — this route never reads comments (csReachouts hard-coded to 0)
  const fields = 'key,id,issuetype,summary,status,priority,assignee,duedate,fixVersions,created,updated,labels,customfield_10020,subtasks,issuelinks';
  const auth   = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const params = new URLSearchParams({ jql, fields, maxResults: 100, startAt: 0, expand: 'changelog' });
  const url    = `https://armorcodeinc.atlassian.net/rest/api/3/search/jql?${params}`;

  try {
    const jiraRes = await fetch(url, { headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' } });
    if (!jiraRes.ok) {
      const errText = await jiraRes.text().catch(() => '');
      return res.status(502).json({ error: `Jira returned ${jiraRes.status}`, details: errText.slice(0, 200) });
    }
    const data = await jiraRes.json();
    const rawIssues = data.issues || data.values || [];
    const CLOSED_STATUSES = ['done','invalid',"won't fix",'wont fix','wont do','duplicate','deferred'];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const tickets = rawIssues.map(issue => {
      const f = issue.fields || {};
      const sprintArr = f['customfield_10020'] || [];
      const activeSprint = Array.isArray(sprintArr)
        ? sprintArr.find(s => s.state === 'active') || sprintArr[sprintArr.length - 1]
        : (sprintArr && typeof sprintArr === 'object' ? sprintArr : null);
      const histories = (issue.changelog?.histories || []).slice().sort((a, b) => new Date(a.created) - new Date(b.created));
      const changes = [];
      for (const h of histories) {
        for (const item of (h.items || [])) {
          if (item.field === 'Sprint') changes.push({ from: item.fromString || null, to: item.toString || null });
        }
      }
      const rollovers   = changes.filter(c => c.from && c.to).length;
      const allSprints  = changes.filter(c => c.to).map(c => c.to);
      const sprintTrail = allSprints.filter((s, i) => i === 0 || s !== allSprints[i - 1]);
      return {
        key:       issue.key,
        id:        issue.id,
        type:      f.issuetype?.name       || 'Story',
        summary:   f.summary               || '',
        status:    f.status?.name          || '',
        priority:  f.priority?.name        || 'Medium',
        assignee:  f.assignee?.displayName || null,
        duedate:   f.duedate               || null,
        eta:       (f.fixVersions || [])[0]?.releaseDate || null,
        etaName:   (f.fixVersions || [])[0]?.name       || null,
        created:   f.created               || null,
        updated:   f.updated               || null,
        labels:    f.labels                || [],
        sprint:    activeSprint?.name      || null,
        sprintEnd: activeSprint?.endDate   || null,
        closedRecently: CLOSED_STATUSES.includes((f.status?.name || '').toLowerCase()) &&
                        f.updated && new Date(f.updated).getTime() >= sevenDaysAgo,
        subtasks: (f.subtasks || []).filter(s => s && s.key && s.fields?.summary).map(s => ({
          key: s.key, id: s.id, type: s.fields?.issuetype?.name || 'Sub-task',
          summary: s.fields?.summary || '', status: s.fields?.status?.name || '',
          priority: s.fields?.priority?.name || '', linkType: 'Sub-task',
        })),
        linkedIssues: (f.issuelinks || []).map(l => {
          const linked = l.inwardIssue || l.outwardIssue;
          if (!linked || !linked.key || !linked.fields?.summary) return null;
          const dir = l.inwardIssue ? l.type?.inward : l.type?.outward;
          return { key: linked.key, id: linked.id, type: linked.fields?.issuetype?.name || '',
            summary: linked.fields?.summary || '', status: linked.fields?.status?.name || '',
            priority: linked.fields?.priority?.name || '', linkType: dir || l.type?.name || 'Link',
            direction: l.inwardIssue ? 'inward' : 'outward' };
        }).filter(Boolean),
        rollovers, sprintTrail,
        csReachouts: 0, csReachoutBy: [],
      };
    });

    // Filter out PROD tickets with no customer push and not actively being worked on
    const ACTIVE_WORKING = new Set([
      'in progress','in review','in development','with engineering','in qa',
      'code review','testing','ready for release','under review','in progress - waiting for customer',
    ]);
    const filtered = tickets.filter(t => {
      if (!t.key.startsWith('PROD-')) return true;
      return ACTIVE_WORKING.has((t.status || '').toLowerCase());
    });

    res.json({ tickets: filtered, total: data.total, fetched: filtered.length, fetchedAt: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Jira', details: err.message });
  }
});

// ── Customer config endpoint ──────────────────────────────────────────────────
app.get('/api/customer-config/:id', requireAuth, (req, res) => {
  const cfg = CUSTOMER_CONFIGS[req.params.id];
  if (!cfg) return res.status(404).json({ error: 'Unknown customer' });
  res.json({ id: cfg.id, name: cfg.name, primaryColor: cfg.primaryColor, secondaryColor: cfg.secondaryColor, slackChannels: cfg.slackChannels });
});

// ── Post Jira comment (uses server-side credentials) ───────────────────────
app.post('/api/comment/:key', requireAuth, express.json(), async (req, res) => {
  const key = req.params.key;
  if (!/^[A-Z]+-\d+$/.test(key)) return res.status(400).json({ error: 'Invalid key' });

  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  if (!jiraEmail || !jiraToken) return res.status(503).json({ error: 'Jira credentials not configured on server' });

  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Comment text is required' });

  // Convert plain text (newlines) → Jira ADF document
  const content = text.split('\n').map(line => ({
    type: 'paragraph',
    content: line.trim() ? [{ type: 'text', text: line }] : [{ type: 'text', text: ' ' }]
  }));
  const adfBody = { body: { type: 'doc', version: 1, content } };

  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const url  = `https://armorcodeinc.atlassian.net/rest/api/3/issue/${key}/comment`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(adfBody)
    });
    if (r.ok) {
      const data = await r.json();
      return res.json({ ok: true, commentId: data.id });
    }
    const errText = await r.text().catch(() => '');
    return res.status(r.status).json({ error: `Jira returned ${r.status}`, details: errText.slice(0, 200) });
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Jira', details: err.message });
  }
});

// ── Ticket gist: AI-generated 2-liner via Gemini ─────────────────────────────
const _gistCache = {};
let _lastGeminiCall = 0;
const GEMINI_MIN_GAP_MS = 3000;      // ~20 RPM ceiling — conservative
const GEMINI_CALL_TIMEOUT_MS = 8000; // hard 8s timeout per Gemini call

async function callGemini(prompt) {
  // Throttle: enforce minimum gap between calls
  const gap = GEMINI_MIN_GAP_MS - (Date.now() - _lastGeminiCall);
  if (gap > 0) await new Promise(r => setTimeout(r, gap));
  _lastGeminiCall = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_CALL_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      }
    );
    return res;
  } catch (e) {
    if (e.name === 'AbortError') {
      return { ok: false, status: 408, text: async () => 'Gemini timed out' };
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// 1 retry on 429 — wait 6s then try once more
async function callGeminiWithRetry(prompt) {
  const res = await callGemini(prompt);
  if (res.status === 429) {
    console.warn('[Gemini] 429 — retrying once after 6s');
    await new Promise(r => setTimeout(r, 6000));
    return callGemini(prompt);
  }
  return res;
}

function adfToPlainText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return ' ';
  if (Array.isArray(node.content)) {
    const parts = node.content.map(adfToPlainText);
    if (node.type === 'paragraph') return parts.join('').trim();
    return parts.join('');
  }
  return '';
}

function adfToText(node) {
  if (!node) return '';
  return adfToPlainText(node).replace(/\s+/g, ' ').trim();
}

app.get('/api/gist/:key', requireAuth, async (req, res) => {
  const key = req.params.key;
  if (!/^[A-Z]+-\d+$/.test(key)) return res.status(400).json({ error: 'Invalid key' });
  if (_gistCache[key]) return res.json(_gistCache[key]);

  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  if (!jiraEmail || !jiraToken) return res.status(503).json({ error: 'Jira not configured' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not set' });

  try {
    // 1. Fetch ticket from Jira
    const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
    const r = await fetch(
      `https://armorcodeinc.atlassian.net/rest/api/3/issue/${key}?fields=summary,description,issuetype`,
      { headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' } }
    );
    if (!r.ok) return res.status(r.status).json({ error: `Jira ${r.status}` });
    const issue   = await r.json();
    const summary = (issue.fields?.summary || '').trim();
    const desc    = adfToText(issue.fields?.description).slice(0, 1200);

    // 2. Gemini Flash — layman-terms 2-liner
    const prompt =
      `Jira ticket summary: "${summary}"\n` +
      `Description: ${desc || '(none)'}\n\n` +
      `Write exactly 2 sentences (max 20 words each):\n` +
      `1. What problem this ticket is fixing, in plain English.\n` +
      `2. What the end result will look like once done.\n` +
      `No jargon. No bullet points. No ticket ID mentions.`;

    const gRes = await callGeminiWithRetry(prompt);
    if (!gRes.ok) {
      const errText = await gRes.text().catch(() => '');
      console.error('Gemini error:', gRes.status, errText.slice(0, 200));
      if (gRes.status === 429) return res.status(429).json({ error: 'Rate limited', retryAfterMs: 7000 });
      return res.status(502).json({ error: `Gemini returned ${gRes.status}` });
    }
    const gData  = await gRes.json();
    const gist   = (gData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    const lines  = gist.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const result = { line1: lines[0] || summary, line2: lines[1] || '' };
    _gistCache[key] = result;
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Latest comment fetch (for status cell hover tooltip) ──────────────────
app.get('/api/comments/:key', requireAuth, async (req, res) => {
  const key = req.params.key;
  if (!/^[A-Z]+-\d+$/.test(key)) return res.status(400).json({ error: 'Invalid key' });

  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  if (!jiraEmail || !jiraToken) return res.status(503).json({ error: 'Jira credentials not configured' });

  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  try {
    const r = await fetch(
      `https://armorcodeinc.atlassian.net/rest/api/3/issue/${key}?fields=comment`,
      { headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' } }
    );
    if (!r.ok) return res.status(r.status).json({ error: `Jira ${r.status}` });
    const data = await r.json();
    const comments = data.fields?.comment?.comments || [];
    if (!comments.length) return res.json({ text: null });

    const last   = comments[comments.length - 1];
    const author = last.author?.displayName || 'Someone';
    const date   = (last.created || '').substring(0, 10);
    const body   = adfToText(last.body);
    res.json({ author, date, body });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── Single issue fetch (for tree child rows — always returns links) ─────────
app.get('/api/issue/:key', requireAuth, async (req, res) => {
  const key = req.params.key;
  if (!/^[A-Z]+-\d+$/.test(key)) return res.status(400).json({ error: 'Invalid key' });

  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  if (!jiraEmail || !jiraToken) return res.status(503).json({ error: 'Jira credentials not configured' });

  const fields = 'key,id,issuetype,summary,status,priority,assignee,duedate,fixVersions,created,updated,subtasks,issuelinks,customfield_10020';
  const auth   = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const url    = `https://armorcodeinc.atlassian.net/rest/api/3/issue/${key}?fields=${fields}`;

  try {
    const r    = await fetch(url, { headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' } });
    if (!r.ok) return res.status(r.status).json({ error: `Jira returned ${r.status}` });
    const issue = await r.json();
    const f     = issue.fields || {};

    const subtasks = (f.subtasks || [])
      .filter(s => s && s.key && s.fields?.summary)
      .map(s => ({
        key: s.key, id: s.id,
        type: s.fields?.issuetype?.name || 'Sub-task',
        summary: s.fields?.summary || '',
        status:  s.fields?.status?.name || '',
        priority: s.fields?.priority?.name || '',
        linkType: 'Sub-task',
      }));

    const linkedIssues = (f.issuelinks || []).map(l => {
      const linked = l.inwardIssue || l.outwardIssue;
      if (!linked || !linked.key || !linked.fields?.summary) return null;
      const dir = l.inwardIssue ? l.type?.inward : l.type?.outward;
      return {
        key:       linked.key, id: linked.id,
        type:      linked.fields?.issuetype?.name || '',
        summary:   linked.fields?.summary || '',
        status:    linked.fields?.status?.name || '',
        priority:  linked.fields?.priority?.name || '',
        linkType:  dir || l.type?.name || 'Link',
        direction: l.inwardIssue ? 'inward' : 'outward',
      };
    }).filter(Boolean);

    res.json({ key, subtasks, linkedIssues });
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Jira', details: err.message });
  }
});

// ── Batch issue fetch (for tree child rows) ────────────────────────────────
app.get('/api/issues', requireAuth, async (req, res) => {
  const rawKeys = (req.query.keys || '').split(',').map(k => k.trim()).filter(k => /^[A-Z]+-\d+$/.test(k)).slice(0, 50);
  if (!rawKeys.length) return res.json({ tickets: [] });

  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  if (!jiraEmail || !jiraToken) return res.status(503).json({ error: 'Jira credentials not configured' });

  const jql    = `key IN (${rawKeys.join(',')}) ORDER BY created DESC`;
  const fields = 'key,id,issuetype,summary,status,priority,assignee,duedate,fixVersions,created,updated,customfield_10020';
  const auth   = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const params = new URLSearchParams({ jql, fields, maxResults: 50 });
  const url    = `https://armorcodeinc.atlassian.net/rest/api/3/search/jql?${params}`;

  try {
    const jiraRes = await fetch(url, { headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' } });
    if (!jiraRes.ok) return res.status(502).json({ error: `Jira returned ${jiraRes.status}` });
    const data = await jiraRes.json();
    const tickets = (data.issues || []).map(issue => {
      const f = issue.fields || {};
      const sprintArr   = f['customfield_10020'] || [];
      const activeSprint = Array.isArray(sprintArr)
        ? sprintArr.find(s => s.state === 'active') || sprintArr[sprintArr.length - 1] : null;
      return {
        key:       issue.key,
        id:        issue.id,
        type:      f.issuetype?.name            || 'Story',
        summary:   f.summary                    || '',
        status:    f.status?.name               || '',
        priority:  f.priority?.name             || 'Medium',
        assignee:  f.assignee?.displayName      || null,
        duedate:   f.duedate                    || null,
        eta:       (f.fixVersions || [])[0]?.releaseDate || null,
        created:   f.created                    || null,
        updated:   f.updated                    || null,
        sprint:    activeSprint?.name           || null,
        sprintEnd: activeSprint?.endDate        || null,
      };
    });
    res.json({ tickets });
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Jira', details: err.message });
  }
});

// ── Debug: diagnose auth + search in one shot ───────────────────────────────
app.get('/api/debug', requireAuth, async (req, res) => {
  const jiraEmail = process.env.JIRA_EMAIL;
  const jiraToken = process.env.JIRA_API_TOKEN;
  if (!jiraEmail || !jiraToken) {
    return res.json({ error: 'env vars missing', emailSet: !!jiraEmail, tokenSet: !!jiraToken });
  }

  const auth = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const headers = { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' };

  try {
    // 1. Verify auth identity
    const meRes  = await fetch('https://armorcodeinc.atlassian.net/rest/api/3/myself', { headers });
    const meData = await meRes.json().catch(() => ({}));

    // 2. Minimal search — just project = ENG, no labels filter
    const p1 = new URLSearchParams({ jql: 'project = ENG ORDER BY created DESC', maxResults: 3 });
    const s1  = await fetch(`https://armorcodeinc.atlassian.net/rest/api/3/search/jql?${p1}`, { headers });
    const d1  = await s1.json().catch(() => ({}));

    // 3. Label search — PayPal labels only
    const p2 = new URLSearchParams({ jql: 'labels = PayPal ORDER BY created DESC', maxResults: 3 });
    const s2  = await fetch(`https://armorcodeinc.atlassian.net/rest/api/3/search/jql?${p2}`, { headers });
    const d2  = await s2.json().catch(() => ({}));

    res.json({
      credentials: {
        emailUsed:  jiraEmail,
        tokenFirst8: jiraToken.substring(0, 8) + '…',
      },
      identity: {
        status:     meRes.status,
        accountId:  meData.accountId,
        email:      meData.emailAddress,
        displayName: meData.displayName,
      },
      engSearch: {
        status: s1.status,
        total:  d1.total,
        count:  (d1.issues || []).length,
        keys:   Object.keys(d1),
        error:  d1.errorMessages,
      },
      labelSearch: {
        status: s2.status,
        total:  d2.total,
        count:  (d2.issues || []).length,
        keys:   Object.keys(d2),
        error:  d2.errorMessages,
        sample: (d2.issues || []).slice(0, 2).map(i => i.key),
      }
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// ── Landing page ─────────────────────────────────────────────────────────────
app.get('/', requireAuth, (req, res) => {
  logVisit(req.user).catch(() => {});
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// ── PayPal dashboard (existing, served with injected config) ─────────────────
app.get('/paypal', requireAuth, (req, res) => {
  logVisit(req.user).catch(() => {});
  try {
    const html = buildCustomerPage(CUSTOMER_CONFIGS.paypal);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch (e) {
    console.error('Error building PayPal page:', e);
    res.status(500).send('Error loading dashboard');
  }
});

// ── Generic customer dashboard ────────────────────────────────────────────────
app.get('/:customer', requireAuth, (req, res) => {
  const cfg = CUSTOMER_CONFIGS[req.params.customer];
  if (!cfg) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), () => res.status(404).send('Not found'));
  logVisit(req.user).catch(() => {});
  try {
    const html = buildCustomerPage(cfg);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  } catch (e) {
    console.error('Error building customer page for', cfg.id, ':', e);
    res.status(500).send('Error loading dashboard');
  }
});

// ── Visitor stats ─────────────────────────────────────────────────────────────
app.get('/api/visits', requireAuth, async (req, res) => {
  const rows = await getVisits();
  if (!rows) return res.json({ enabled: false });

  // rows: [timestamp, name, email, page]
  const byEmail = {};
  for (const [ts, name, email] of rows) {
    if (!email) continue;
    if (!byEmail[email]) byEmail[email] = { name, email, count: 0, lastSeen: ts };
    byEmail[email].count++;
    if (ts > byEmail[email].lastSeen) byEmail[email].lastSeen = ts;
  }
  const visitors = Object.values(byEmail).sort((a, b) => b.count - a.count);
  res.json({
    enabled:      true,
    totalVisits:  rows.length,
    uniqueVisitors: visitors.length,
    visitors,
  });
});

app.use(requireAuth, express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  maxAge: '1h',          // browser may cache static assets up to 1h
  setHeaders: (res, filePath) => {
    // HTML should always revalidate so dashboard updates are picked up immediately
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ PayPal CSE Dashboard running on port ${PORT}`);
  console.log(`🔒 Access restricted to @${ALLOWED_DOMAIN}`);
});
