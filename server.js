const express = require('express');
const cookieSession = require('cookie-session');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const ALLOWED_DOMAIN = 'armorcode.io';
const BASE_URL = 'https://cse-assit-983405469928.europe-west1.run.app';

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
  hd: ALLOWED_DOMAIN,
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
  const opts = { scope: ['profile', 'email'], hd: ALLOWED_DOMAIN };
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
    'AND created >= -90d',
    'AND status NOT IN (Done, Invalid, "Won\'t Fix", "Wont Do", "Duplicate", "Deferred")',
    'AND project IN (ENG, PROD, DEVOPS, SENTRY, Doc)',
    'ORDER BY created DESC'
  ].join(' ');

  const fields = 'key,id,issuetype,summary,status,priority,assignee,duedate,fixVersions,created,updated,labels,customfield_10020,subtasks,issuelinks';
  const auth   = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const params = new URLSearchParams({ jql, fields, maxResults: 100, startAt: 0 });
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
        labels:    f.labels                || [],
        sprint:    activeSprint?.name      || null,
        sprintEnd: activeSprint?.endDate   || null,
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
      };
    });

    console.log('[Jira] mapped tickets:', tickets.length, '| first key:', tickets[0]?.key || 'none');
    res.json({ tickets, total: data.total, fetched: tickets.length, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Jira proxy error:', err);
    res.status(502).json({ error: 'Failed to reach Jira', details: err.message });
  }
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

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(requireAuth, express.static(path.join(__dirname, 'public')));

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ PayPal CSE Dashboard running on port ${PORT}`);
  console.log(`🔒 Access restricted to @${ALLOWED_DOMAIN}`);
});
