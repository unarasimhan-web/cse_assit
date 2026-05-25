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
    'AND "zendesk status[short text]" !~ "Solved"',
    'AND status NOT IN (Done, Invalid, "Won\'t Fix", "Wont Do", "Duplicate", "Deferred")',
    'AND project IN (ENG, PROD, DEVOPS, SENTRY, Doc)',
    'ORDER BY created DESC'
  ].join(' ');

  const fields = ['key','id','issuetype','summary','status','priority','assignee','duedate','fixVersions','created','updated','labels','customfield_10020'];
  const auth   = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64');
  const url    = 'https://armorcodeinc.atlassian.net/rest/api/3/search/jql';

  try {
    const jiraRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jql, fields, maxResults: 100 })
    });

    if (!jiraRes.ok) {
      const errText = await jiraRes.text().catch(() => '');
      console.error(`Jira API error ${jiraRes.status}:`, errText.slice(0, 300));
      return res.status(502).json({ error: `Jira returned ${jiraRes.status}`, details: errText.slice(0, 200) });
    }

    const data = await jiraRes.json();

    const tickets = (data.issues || []).map(issue => {
      const f = issue.fields;
      // Sprint: returned as customfield_10020 in Jira REST API v3
      const sprintArr = f['customfield_10020'] || [];
      const activeSprint = Array.isArray(sprintArr)
        ? sprintArr.find(s => s.state === 'active') || sprintArr[sprintArr.length - 1]
        : (sprintArr && typeof sprintArr === 'object' ? sprintArr : null);

      return {
        key:       issue.key,
        id:        issue.id,          // numeric Jira ID — used for dev-status API
        type:      f.issuetype?.name  || 'Story',
        summary:   f.summary          || '',
        status:    f.status?.name     || '',
        priority:  f.priority?.name   || 'Medium',
        assignee:  f.assignee?.displayName || null,
        duedate:   f.duedate          || null,
        eta:       (f.fixVersions || [])[0]?.releaseDate || null,
        etaName:   (f.fixVersions || [])[0]?.name       || null,
        created:   f.created          || null,
        updated:   f.updated          || null,
        labels:    f.labels           || [],
        sprint:    activeSprint?.name || null,
        sprintEnd: activeSprint?.endDate || null,
      };
    });

    res.json({ tickets, total: data.total, fetched: tickets.length, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Jira proxy error:', err);
    res.status(502).json({ error: 'Failed to reach Jira', details: err.message });
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
