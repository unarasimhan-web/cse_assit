const express = require('express');
const cookieSession = require('cookie-session');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const ALLOWED_DOMAIN = 'armorcode.io';

// ── Session (cookie-based — works stateless on Cloud Run) ──────────────────
app.use(cookieSession({
  name: 'ac_session',
  keys: [process.env.SESSION_SECRET || 'change-me-in-production'],
  maxAge: 8 * 60 * 60 * 1000, // 8 hours
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
}));

// ── Passport ───────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
  hd: ALLOWED_DOMAIN, // hint Google to show only armorcode.io accounts
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

// ── Auth middleware ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/google');
}

// ── Routes ─────────────────────────────────────────────────────────────────

// Google OAuth start
app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    hd: ALLOWED_DOMAIN,
  })
);

// Google OAuth callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/unauthorized' }),
  (req, res) => {
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

// Unauthorised page
app.get('/unauthorized', (req, res) => {
  res.status(403).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <title>Access Denied — ArmorCode</title>
      <style>
        body { background: #0f1117; color: #e8eaf6; font-family: system-ui, sans-serif;
               display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .box { text-align: center; padding: 40px; background: #1a1d27;
               border: 1px solid #2e3150; border-radius: 16px; max-width: 400px; }
        .badge { background: #ff4d6d22; border: 1px solid #ff4d6d; color: #ff4d6d;
                 display: inline-block; padding: 4px 14px; border-radius: 20px;
                 font-size: 12px; font-weight: 700; margin-bottom: 20px; }
        h1 { font-size: 22px; margin-bottom: 10px; }
        p  { color: #8b91b5; font-size: 14px; line-height: 1.6; }
        a  { display: inline-block; margin-top: 24px; padding: 10px 24px;
             background: #6c63ff; color: #fff; border-radius: 8px;
             text-decoration: none; font-size: 14px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="badge">ACCESS DENIED</div>
        <h1>ArmorCode Employees Only</h1>
        <p>This dashboard is restricted to <strong>@armorcode.io</strong> Google accounts.<br/>
           Please sign in with your ArmorCode work email.</p>
        <a href="/auth/google">Try a different account</a>
      </div>
    </body>
    </html>
  `);
});

// Logout
app.get('/logout', (req, res) => {
  req.logout(() => {
    req.session = null;
    res.redirect('/');
  });
});

// API: current user info (for the dashboard header)
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email, photo: req.user.photo });
});

// Dashboard — protected
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Static assets
app.use(requireAuth, express.static(path.join(__dirname, 'public')));

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ PayPal CSE Dashboard running on port ${PORT}`);
  console.log(`🔒 Access restricted to @${ALLOWED_DOMAIN}`);
});
