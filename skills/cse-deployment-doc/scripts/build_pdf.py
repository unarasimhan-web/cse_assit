"""
PayPal CSE Dashboard — Deployment Journey PDF
ArmorCode brand colors, slide-style pages, architecture diagram
"""
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import Table, TableStyle
import os

W, H = A4  # 595 x 842 pt

# ── Brand palette ──────────────────────────────────────────────────────────
DEEP_PURPLE = colors.HexColor("#35198E")
PURPLE      = colors.HexColor("#9A84DF")
LAVENDER    = colors.HexColor("#EDE9FB")
LIGHT_BG    = colors.HexColor("#F6F4FE")
DARK_BG     = colors.HexColor("#1A0E4F")
WHITE       = colors.white
GRAY        = colors.HexColor("#6B7280")
DARK_GRAY   = colors.HexColor("#1F2937")
SUCCESS     = colors.HexColor("#10B981")
WARNING     = colors.HexColor("#F59E0B")
INFO        = colors.HexColor("#3B82F6")
ACCENT      = colors.HexColor("#EC4899")
TEAL        = colors.HexColor("#0EA5E9")

OUT = "/sessions/optimistic-sleepy-edison/mnt/outputs/PayPal_CSE_Deployment_Journey.pdf"
c = canvas.Canvas(OUT, pagesize=A4)


# ── Helpers ────────────────────────────────────────────────────────────────
def page_bg(color=WHITE):
    c.setFillColor(color)
    c.rect(0, 0, W, H, fill=1, stroke=0)

def header_bar(title, subtitle="", bg=DEEP_PURPLE, text_color=WHITE, h=110):
    c.setFillColor(bg)
    c.rect(0, H-h, W, h, fill=1, stroke=0)
    # Accent line
    c.setFillColor(PURPLE)
    c.rect(0, H-h-4, W, 4, fill=1, stroke=0)
    c.setFillColor(text_color)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(36, H-h+20 if not subtitle else H-h+30, title)
    if subtitle:
        c.setFont("Helvetica", 11)
        c.setFillColor(LAVENDER)
        c.drawString(36, H-h+12, subtitle)

def section_card(x, y, w, h, title, body_lines, bg=LAVENDER, title_color=DEEP_PURPLE, body_color=DARK_GRAY, font_size=9, title_size=10):
    c.setFillColor(bg)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=0)
    c.setFillColor(title_color)
    c.setFont("Helvetica-Bold", title_size)
    c.drawString(x+10, y+h-16, title)
    c.setFillColor(body_color)
    c.setFont("Helvetica", font_size)
    ty = y+h-30
    for line in body_lines:
        if ty < y+5:
            break
        c.drawString(x+10, ty, str(line))
        ty -= (font_size + 3)

def bullet(x, y, text, color=DEEP_PURPLE, size=9, dot_color=PURPLE):
    c.setFillColor(dot_color)
    c.circle(x+4, y+3, 2.5, fill=1, stroke=0)
    c.setFillColor(color)
    c.setFont("Helvetica", size)
    c.drawString(x+12, y, text)

def tag(x, y, text, bg=PURPLE, fg=WHITE, size=8):
    tw = c.stringWidth(text, "Helvetica-Bold", size) + 12
    c.setFillColor(bg)
    c.roundRect(x, y-1, tw, 14, 4, fill=1, stroke=0)
    c.setFillColor(fg)
    c.setFont("Helvetica-Bold", size)
    c.drawString(x+6, y+2, text)
    return tw + 6

def footer(page_num, total=9):
    c.setFillColor(DEEP_PURPLE)
    c.rect(0, 0, W, 28, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 8)
    c.drawString(36, 9, "ArmorCode — Internal Use Only")
    c.drawRightString(W-36, 9, f"Page {page_num} of {total}")
    # Logo text
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(LAVENDER)
    c.drawCentredString(W/2, 9, "ArmorCode CSE Dashboard Project")

def divider(y, color=LAVENDER):
    c.setStrokeColor(color)
    c.setLineWidth(1)
    c.line(36, y, W-36, y)


# ═══════════════════════════════════════════════════════════════════
# PAGE 1 — TITLE
# ═══════════════════════════════════════════════════════════════════
page_bg(DARK_BG)

# Large purple gradient-like blocks
c.setFillColor(colors.HexColor("#2D1580"))
c.rect(0, 0, W, 220, fill=1, stroke=0)
c.setFillColor(colors.HexColor("#4A2AB0"))
c.rect(0, 200, W, 180, fill=1, stroke=0)
c.setFillColor(DEEP_PURPLE)
c.rect(0, 360, W, 200, fill=1, stroke=0)

# Decorative circles
c.setFillColor(colors.HexColor("#9A84DF40"))
c.circle(W-60, H-80, 120, fill=1, stroke=0)
c.setFillColor(colors.HexColor("#35198E60"))
c.circle(60, 120, 90, fill=1, stroke=0)
c.setFillColor(colors.HexColor("#9A84DF25"))
c.circle(W/2, H/2+40, 160, fill=1, stroke=0)

# ArmorCode label
c.setFillColor(PURPLE)
c.roundRect(36, H-80, 120, 24, 6, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 10)
c.drawString(48, H-70, "ArmorCode CSE")

# Title
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 32)
c.drawString(36, H-140, "PayPal CSE Dashboard")
c.setFont("Helvetica-Bold", 28)
c.setFillColor(LAVENDER)
c.drawString(36, H-178, "Deployment Journey")

# Subtitle
c.setFillColor(colors.HexColor("#C4B5FD"))
c.setFont("Helvetica", 13)
c.drawString(36, H-210, "From Idea to Live Production — May 2026")

# Stats row
stats = [
    ("2 Days", "Build & Deploy"),
    ("1 Live App", "on Google Cloud Run"),
    ("3 MCP Servers", "Jira · Slack · Zendesk"),
    ("1 Account", "PayPal (Expandable)"),
]
sx = 36
sy = 310
bw = (W - 72) / 4 - 6
for val, lbl in stats:
    c.setFillColor(colors.HexColor("#FFFFFF18"))
    c.roundRect(sx, sy, bw, 70, 8, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#C4B5FD"))
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(sx + bw/2, sy+42, val)
    c.setFillColor(colors.HexColor("#A78BFA"))
    c.setFont("Helvetica", 8)
    c.drawCentredString(sx + bw/2, sy+24, lbl)
    sx += bw + 8

# What was built label
c.setFillColor(colors.HexColor("#FFFFFF12"))
c.rect(36, 160, W-72, 100, fill=1, stroke=0)
c.setFillColor(LAVENDER)
c.setFont("Helvetica-Bold", 11)
c.drawString(50, 248, "What Was Built")
items = [
    "Customer Success Dashboard — live web app for PayPal account management",
    "Google OAuth2 authentication restricted to @armorcode.io accounts",
    "Real-time data from Jira, Zendesk & Slack via MCP server integrations",
    "Containerized & deployed on Google Cloud Run with auto-deploy from GitHub",
]
ty = 228
for item in items:
    bullet(50, ty, item, color=colors.HexColor("#C4B5FD"), dot_color=PURPLE, size=9)
    ty -= 16

# URL badge
c.setFillColor(SUCCESS)
c.roundRect(36, 120, W-72, 30, 6, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 10)
c.drawCentredString(W/2, 132, "Live at: https://cse-assit-983405469928.europe-west1.run.app")

# Author
c.setFillColor(colors.HexColor("#A78BFA"))
c.setFont("Helvetica", 9)
c.drawString(36, 90, "Prepared by: Uma Somi Narasimhan  |  Customer Success Engineer @ ArmorCode  |  May 2026")

footer(1)
c.showPage()


# ═══════════════════════════════════════════════════════════════════
# PAGE 2 — 2-DAY JOURNEY TIMELINE
# ═══════════════════════════════════════════════════════════════════
page_bg(LIGHT_BG)
header_bar("2-Day Deployment Journey", "Day-by-day breakdown of what was built, broken, and fixed")

# Day 1
c.setFillColor(DEEP_PURPLE)
c.roundRect(36, H-165, W-72, 30, 6, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 12)
c.drawString(50, H-148, "Day 1 — Foundation & Architecture")

day1_items = [
    ("Dashboard Design", "Built the PayPal CSE Dashboard HTML/JS frontend with Jira, Zendesk, and Slack data panels"),
    ("Data Aggregation", "Unified JQL query across 5 Jira projects (ENG, PROD, DEVOPS, SENTRY, Doc) with PayPal labels"),
    ("UI Improvements", "Exec summary table, trend charts, Slack channel scanner, action items panel"),
    ("Node.js Backend", "Express server with Google OAuth2 (Passport.js), route protection, session management"),
    ("Containerization", "Created Dockerfile + .dockerignore; packaged as container for Cloud Run"),
    ("GitHub Push", "Pushed all code to GitHub repo (unarasimhan-web/cse_assit) for AI Studio auto-deploy"),
]

ty = H-200
for title, desc in day1_items:
    # Timeline dot
    c.setFillColor(DEEP_PURPLE)
    c.circle(55, ty+4, 4, fill=1, stroke=0)
    c.setStrokeColor(PURPLE)
    c.setLineWidth(1.5)
    c.line(55, ty-8, 55, ty-20)
    # Card
    c.setFillColor(WHITE)
    c.roundRect(68, ty-8, W-108, 26, 4, fill=1, stroke=0)
    c.setFillColor(DEEP_PURPLE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(78, ty+7, f"✦  {title}")
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 8)
    c.drawString(78, ty-3, desc)
    ty -= 34

# Day 2
c.setFillColor(DARK_BG)
c.roundRect(36, ty-8, W-72, 30, 6, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 12)
c.drawString(50, ty+10, "Day 2 — Deploy, Debug & Harden")
ty -= 44

day2_items = [
    ("IAM Fix", "Fixed Error 403: granted allUsers Cloud Run invoker role so app is publicly reachable"),
    ("OAuth Fix", "Resolved redirect_uri_mismatch — hardcoded BASE_URL, registered callback in Google Console"),
    ("Session Fix", "Passport 0.7 + cookie-session incompatibility → added regenerate/save shim; trust proxy enabled"),
    ("Redirect Loop Fix", "Switched back to cookie-session (stateless) — works across all Cloud Run instances"),
    ("Logout Fix", "Google silent re-auth → logout redirects to /auth/google?prompt=select_account"),
    ("Inactivity Timeout", "Added 45-minute inactivity timer; checks session.lastActivity on every request"),
    ("Personal Gmail Block", "org_internal OAuth policy — only @armorcode.io Google accounts can authenticate"),
]

for title, desc in day2_items:
    c.setFillColor(DARK_BG)
    c.circle(55, ty+4, 4, fill=1, stroke=0)
    c.setStrokeColor(PURPLE)
    c.setLineWidth(1.5)
    c.line(55, ty-8, 55, ty-20)
    c.setFillColor(WHITE)
    c.roundRect(68, ty-8, W-108, 26, 4, fill=1, stroke=0)
    c.setFillColor(DARK_BG)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(78, ty+7, f"✦  {title}")
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 8)
    c.drawString(78, ty-3, desc)
    ty -= 34

footer(2)
c.showPage()


# ═══════════════════════════════════════════════════════════════════
# PAGE 3 — SYSTEM ARCHITECTURE DIAGRAM
# ═══════════════════════════════════════════════════════════════════
page_bg(WHITE)
header_bar("System Architecture", "How all components connect end-to-end")

def draw_box(x, y, w, h, label, sublabel="", bg=LAVENDER, fg=DEEP_PURPLE, radius=8):
    c.setFillColor(bg)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=0)
    c.setFillColor(fg)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(x+w/2, y+h/2 + (4 if sublabel else 0), label)
    if sublabel:
        c.setFont("Helvetica", 7)
        c.setFillColor(GRAY)
        c.drawCentredString(x+w/2, y+h/2-8, sublabel)

def arrow(x1, y1, x2, y2, color=PURPLE, label=""):
    c.setStrokeColor(color)
    c.setLineWidth(1.5)
    c.line(x1, y1, x2, y2)
    # Arrowhead
    import math
    angle = math.atan2(y2-y1, x2-x1)
    aw = 7
    c.setFillColor(color)
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(x2 - aw*math.cos(angle-0.4), y2 - aw*math.sin(angle-0.4))
    p.lineTo(x2 - aw*math.cos(angle+0.4), y2 - aw*math.sin(angle+0.4))
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        c.setFillColor(GRAY)
        c.setFont("Helvetica", 7)
        c.drawCentredString(mx, my+4, label)

# ── Layer labels ───
layer_labels = [
    (H-135, "USER LAYER"),
    (H-240, "AUTH LAYER"),
    (H-360, "APPLICATION LAYER"),
    (H-470, "DATA LAYER"),
    (H-570, "MCP INTEGRATIONS"),
]
for ly, lbl in layer_labels:
    c.setFillColor(LIGHT_BG)
    c.rect(0, ly-20, 52, 20, fill=1, stroke=0)
    c.setFillColor(GRAY)
    c.setFont("Helvetica-Bold", 6)
    c.drawCentredString(26, ly-13, lbl)

# User box
draw_box(220, H-170, 150, 40, "ArmorCode User", "@armorcode.io Browser", bg=LAVENDER, fg=DEEP_PURPLE)

# Google OAuth
draw_box(80, H-270, 130, 40, "Google OAuth2", "Identity Provider", bg=colors.HexColor("#4285F4"), fg=WHITE)
draw_box(380, H-270, 130, 40, "Access Denied", "Personal Gmail Blocked", bg=colors.HexColor("#EF4444"), fg=WHITE)

# Arrow: user → OAuth
arrow(295, H-170, 230, H-230, label="1. Login")
arrow(230, H-270, 295, H-305, label="2. Token")
arrow(295, H-170, 410, H-230, color=colors.HexColor("#EF4444"), label="⚠ Blocked")

# Cloud Run box (central)
c.setFillColor(DEEP_PURPLE)
c.roundRect(180, H-395, 230, 60, 10, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 11)
c.drawCentredString(295, H-358, "Google Cloud Run")
c.setFont("Helvetica", 8)
c.setFillColor(LAVENDER)
c.drawCentredString(295, H-373, "Node.js + Express  |  Passport.js  |  Cookie-Session")
arrow(295, H-335, 295, H-305, color=SUCCESS, label="3. Serve App")

# GitHub box
draw_box(60, H-390, 100, 45, "GitHub Repo", "unarasimhan-web", bg=colors.HexColor("#24292E"), fg=WHITE)
draw_box(430, H-390, 100, 45, "Google AI Studio", "Auto-deploy CI/CD", bg=colors.HexColor("#1A73E8"), fg=WHITE)

arrow(160, H-368, 180, H-368, label="git push")
arrow(410, H-368, 430, H-368, label="detect push")

# Index.html box
draw_box(180, H-475, 230, 45, "Dashboard UI", "index.html — Dynamic JS Frontend", bg=LAVENDER, fg=DEEP_PURPLE)
arrow(295, H-395, 295, H-430, label="renders")

# MCP boxes at bottom
mcp_boxes = [
    (50,  H-580, "Jira MCP", "Atlassian Cloud", colors.HexColor("#0052CC"), WHITE),
    (200, H-580, "Zendesk MCP", "Support Tickets", colors.HexColor("#03363D"), WHITE),
    (350, H-580, "Slack MCP", "Channel Messages", colors.HexColor("#4A154B"), WHITE),
    (460, H-575, "Future MCPs", "Salesforce, etc.", LAVENDER, DEEP_PURPLE),
]
for bx, by, bl, bsl, bbg, bfg in mcp_boxes:
    bw = 100 if bl != "Future MCPs" else 90
    draw_box(bx, by, bw, 38, bl, bsl, bg=bbg, fg=bfg)
    arrow(bx+bw/2, by+38, bx+bw/2-30 + 20, H-475+22 if abs(bx+bw/2 - 295) < 100 else H-475+10, color=PURPLE)

# Dotted "expandable" arrow
c.setStrokeColor(GRAY)
c.setDash(3, 3)
c.setLineWidth(1)
c.line(500, H-555, 540, H-450)
c.setDash()
c.setFillColor(GRAY)
c.setFont("Helvetica", 7)
c.drawString(508, H-500, "Expandable")

footer(3)
c.showPage()


# ═══════════════════════════════════════════════════════════════════
# PAGE 4 — DEPLOYMENT PIPELINE
# ═══════════════════════════════════════════════════════════════════
page_bg(LIGHT_BG)
header_bar("Deployment Pipeline", "From code change to live production in minutes")

# Pipeline steps
steps = [
    ("1", "Code Change", "CSE edits index.html\nor server.js locally", DEEP_PURPLE),
    ("2", "Git Push", "git add . && git commit\ngit push origin main", DARK_BG),
    ("3", "AI Studio\nDetects Push", "Google AI Studio monitors\nGitHub repo for changes", colors.HexColor("#1A73E8")),
    ("4", "Container Build", "Dockerfile → builds\nNode.js container image", colors.HexColor("#0052CC")),
    ("5", "Cloud Run\nDeploy", "New revision deployed\nauto-scaled, zero-downtime", SUCCESS),
    ("6", "Live URL", "https://cse-assit-...\n.run.app is updated", colors.HexColor("#EC4899")),
]

py = H-180
bw = (W-72) / 3 - 8
bh = 90

for i, (num, title, desc, bg) in enumerate(steps):
    col = i % 3
    row = i // 3
    bx = 36 + col * (bw + 12)
    by = py - row * (bh + 60)

    c.setFillColor(bg)
    c.roundRect(bx, by, bw, bh, 8, fill=1, stroke=0)
    # Number badge
    c.setFillColor(WHITE)
    c.circle(bx+20, by+bh-20, 12, fill=1, stroke=0)
    c.setFillColor(bg)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(bx+20, by+bh-24, num)
    # Title
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    ty_t = by+bh-42
    for line in title.split("\n"):
        c.drawString(bx+38, ty_t, line)
        ty_t -= 13
    # Desc
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#FFFFFFCC"))
    ty_d = by+30
    for line in desc.split("\n"):
        c.drawString(bx+10, ty_d, line)
        ty_d -= 12

    # Arrow between steps in same row
    if col < 2 and i < len(steps)-1:
        ax = bx + bw + 4
        ay = by + bh/2
        c.setFillColor(PURPLE)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(ax, ay-5, "→")

    # Arrow between rows
    if col == 2 and row == 0:
        c.setFillColor(PURPLE)
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(bx + bw/2, by-30, "↓")

# Key config section
ky = H-440
c.setFillColor(WHITE)
c.roundRect(36, ky, W-72, 110, 8, fill=1, stroke=0)
c.setFillColor(DEEP_PURPLE)
c.setFont("Helvetica-Bold", 11)
c.drawString(50, ky+90, "Key Configuration Points")
divider(ky+80, LAVENDER)

cfg_items = [
    ("Dockerfile", "Multi-stage Node.js build, PORT=8080, npm ci --omit=dev"),
    (".dockerignore", "Excludes node_modules, .env, .git, .claude — keeps image lean"),
    ("Cloud Run Env Vars", "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET injected as secrets"),
    ("IAM Policy", "allUsers granted roles/run.invoker — app publicly accessible (auth handled by app-layer)"),
    ("OAuth Credentials", "Authorized redirect URI: https://cse-assit-...run.app/auth/google/callback"),
    ("Trust Proxy", "app.set('trust proxy', 1) — enables secure cookies behind Cloud Run's TLS termination"),
]
tx = 50; ty_c = ky+68
for key, val in cfg_items:
    c.setFillColor(DEEP_PURPLE)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(tx, ty_c, f"{key}:")
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 8)
    c.drawString(tx + c.stringWidth(key+":", "Helvetica-Bold", 8) + 4, ty_c, val)
    ty_c -= 14

footer(4)
c.showPage()


# ═══════════════════════════════════════════════════════════════════
# PAGE 5 — MCP INTEGRATIONS
# ═══════════════════════════════════════════════════════════════════
page_bg(LIGHT_BG)
header_bar("MCP Server Integrations", "How real-time data flows into the dashboard")

mcp_details = [
    {
        "title": "Jira MCP (Atlassian)",
        "color": colors.HexColor("#0052CC"),
        "logo": "JIRA",
        "what": "Fetches active Jira tickets tagged with PayPal labels",
        "jql": 'labels IN (paypal, PayPal, PayPal_Prod, paypal-poc-list, paypal_poc, PayPal_PoC)\nAND status NOT IN (Done, Invalid, "Won\'t Fix") AND project IN (ENG, PROD, DEVOPS, SENTRY, Doc)',
        "data": ["Issue type (Bug / Story / Task)", "Status & Priority", "Assignee & Due date", "Fix versions (ETA)", "Engineering comments"],
        "panels": ["In-Flight Jira Tickets", "Exec Summary Table", "Trend Charts"],
    },
    {
        "title": "Zendesk MCP",
        "color": colors.HexColor("#03363D"),
        "logo": "ZD",
        "what": "Fetches support tickets for PayPal account (last 90 days)",
        "jql": "Filters: Account = PayPal | Status ≠ Solved | Created >= 90 days ago\nCategories: Bugs, Feature Requests, Service Tickets",
        "data": ["Ticket ID & Subject", "Status & Priority", "Category bucket", "Created / Updated dates", "SLA status"],
        "panels": ["Historical Trend Charts", "Open Ticket Queue", "Exec Summary"],
    },
    {
        "title": "Slack MCP",
        "color": colors.HexColor("#4A154B"),
        "logo": "SLK",
        "what": "Scans 3 channels for customer concerns & internal context",
        "jql": "Channels: #ext-armorcode-paypal (customer-facing)\n#paypal-prep & #internal-paypal (internal context)",
        "data": ["Customer-raised issues", "Internal action items", "Technical blockers", "Engineering questions for PayPal", "Last 7 days messages"],
        "panels": ["Customer Concerns Panel", "Internal Action Items", "Engineering Questions"],
    },
]

my = H-145
for mcp in mcp_details:
    bg = mcp["color"]
    c.setFillColor(bg)
    c.roundRect(36, my-120, W-72, 110, 8, fill=1, stroke=0)

    # Logo badge
    c.setFillColor(WHITE)
    c.roundRect(46, my-50, 36, 36, 6, fill=1, stroke=0)
    c.setFillColor(bg)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(64, my-36, mcp["logo"])

    # Title + what
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(90, my-28, mcp["title"])
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#FFFFFFCC"))
    c.drawString(90, my-43, mcp["what"])

    # Query/filter box
    c.setFillColor(colors.HexColor("#FFFFFF18"))
    c.roundRect(46, my-92, 220, 40, 4, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FFFFFFCC"))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(52, my-62, "Query / Filter:")
    c.setFont("Helvetica", 6.5)
    lines = mcp["jql"].split("\n")
    qy = my-74
    for line in lines:
        c.drawString(52, qy, line)
        qy -= 10

    # Data extracted
    c.setFillColor(colors.HexColor("#FFFFFF18"))
    c.roundRect(276, my-92, 145, 40, 4, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FFFFFFCC"))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(282, my-62, "Data Extracted:")
    c.setFont("Helvetica", 7)
    dy = my-73
    for d in mcp["data"][:4]:
        c.drawString(282, dy, f"• {d}")
        dy -= 9

    # Dashboard panels
    c.setFillColor(colors.HexColor("#FFFFFF18"))
    c.roundRect(430, my-92, 140, 40, 4, fill=1, stroke=0)
    c.setFillColor(colors.HexColor("#FFFFFFCC"))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(436, my-62, "Dashboard Panels:")
    c.setFont("Helvetica", 7)
    py_d = my-73
    for p in mcp["panels"]:
        c.drawString(436, py_d, f"• {p}")
        py_d -= 9

    my -= 136

# Model Context Protocol explanation
ey = H-560
c.setFillColor(LAVENDER)
c.roundRect(36, ey, W-72, 70, 8, fill=1, stroke=0)
c.setFillColor(DEEP_PURPLE)
c.setFont("Helvetica-Bold", 10)
c.drawString(50, ey+52, "What is MCP (Model Context Protocol)?")
c.setFillColor(DARK_GRAY)
c.setFont("Helvetica", 9)
c.drawString(50, ey+36, "MCP is an open protocol by Anthropic that lets AI agents (like Claude) securely connect to external data sources and tools.")
c.drawString(50, ey+22, "Each MCP server exposes structured tools — searchJiraIssuesUsingJql, searchSlackMessages, etc. — that Claude calls in real-time")
c.drawString(50, ey+8, "to fetch live data. No data is hardcoded. Every dashboard refresh pulls fresh information from the source systems.")

footer(5)
c.showPage()


# ═══════════════════════════════════════════════════════════════════
# PAGE 6 — SECURITY & ACCESS CONTROL
# ═══════════════════════════════════════════════════════════════════
page_bg(LIGHT_BG)
header_bar("Security & Access Control", "Multi-layer protection — only ArmorCode employees can access the dashboard")

# Security layers visual
layers = [
    ("Layer 1: Network", "Google Cloud Run IAM", "Public HTTPS endpoint. TLS terminated by Cloud Run load balancer. All HTTP traffic upgraded to HTTPS.", colors.HexColor("#3B82F6")),
    ("Layer 2: Identity", "Google OAuth 2.0", "Users must sign in with a Google account. Hosted Domain (hd) parameter restricts to armorcode.io org accounts only.", DEEP_PURPLE),
    ("Layer 3: Domain Check", "Server-side Validation", "Even if OAuth succeeds, server validates email domain. Any non-@armorcode.io email receives 403 Access Denied.", colors.HexColor("#EF4444")),
    ("Layer 4: Session", "Cookie-Session (Stateless)", "Encrypted cookie-based session. 8-hour max age. Secure + HttpOnly + SameSite=lax flags. Works across Cloud Run instances.", SUCCESS),
    ("Layer 5: Inactivity", "45-Minute Auto-Logout", "Session tracks lastActivity timestamp. If inactive > 45 mins, session is destroyed and user is redirected to Google login with account picker.", WARNING),
]

sy_start = H-150
for i, (layer, tech, desc, color) in enumerate(layers):
    ly = sy_start - i * 110

    # Left color bar
    c.setFillColor(color)
    c.rect(36, ly, 6, 95, fill=1, stroke=0)

    # Card
    c.setFillColor(WHITE)
    c.roundRect(46, ly, W-82, 95, 6, fill=1, stroke=0)

    # Layer badge
    c.setFillColor(color)
    c.roundRect(56, ly+70, 90, 16, 4, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(101, ly+76, layer)

    # Tech name
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(56, ly+52, tech)

    # Description
    c.setFont("Helvetica", 8.5)
    c.setFillColor(GRAY)
    # Word wrap manually
    words = desc.split()
    line = ""
    dx = 56
    dy_d = ly+34
    for word in words:
        test = line + (" " if line else "") + word
        if c.stringWidth(test, "Helvetica", 8.5) > W-130:
            c.drawString(dx, dy_d, line)
            dy_d -= 13
            line = word
        else:
            line = test
    if line:
        c.drawString(dx, dy_d, line)

    # Status badge
    c.setFillColor(color)
    c.roundRect(W-110, ly+70, 60, 16, 4, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(W-80, ly+76, "ACTIVE")

footer(6)
c.showPage()


# ═══════════════════════════════════════════════════════════════════
# PAGE 7 — DASHBOARD FEATURES
# ═══════════════════════════════════════════════════════════════════
page_bg(LIGHT_BG)
header_bar("Dashboard Capabilities", "What the PayPal CSE Dashboard shows and how CSEs use it")

features = [
    {
        "title": "Executive Summary Table",
        "icon": "📊",
        "color": DEEP_PURPLE,
        "points": [
            "Cross-platform view: Jira tickets + Zendesk tickets side by side",
            "Status, Priority, Assignee, ETA in one scannable table",
            "Ticket column fixed to single-line (no wrapping) for clean display",
            "Color-coded by priority: P1 red, P2 orange, P3 yellow",
        ]
    },
    {
        "title": "Trend Charts (90-day)",
        "icon": "📈",
        "color": colors.HexColor("#0052CC"),
        "points": [
            "Bar chart: Bugs vs Feature Requests vs Service Tickets over time",
            "Monthly breakdown for the last 90 days",
            "Helps identify if bug volume is increasing or decreasing",
            "Data sourced live from Zendesk and Jira",
        ]
    },
    {
        "title": "Customer Concern Scanner",
        "icon": "💬",
        "color": colors.HexColor("#4A154B"),
        "points": [
            "Scans #ext-armorcode-paypal for last 7 days of messages",
            "Surfaces concerns, escalations, and questions raised by PayPal team",
            "Shows message author, timestamp, and message preview",
            "Separate section for internal #paypal-prep context",
        ]
    },
    {
        "title": "Engineering Action Items",
        "icon": "⚙️",
        "color": colors.HexColor("#10B981"),
        "points": [
            "Questions that need PayPal clarification before engineering can proceed",
            "Extracted from Jira comments and Slack discussions",
            "Tagged by source: Jira comment / Slack thread",
            "Helps CSE drive conversations in sync calls",
        ]
    },
    {
        "title": "In-Flight Jira Tracker",
        "icon": "🎯",
        "color": colors.HexColor("#F59E0B"),
        "points": [
            "All active Jira issues across ENG, PROD, DEVOPS, SENTRY, Doc",
            "Filtered by PayPal labels (6 label variants supported)",
            "Shows fix version for ETA — auto-derived from sprint data",
            "Links directly to Jira ticket for drill-down",
        ]
    },
    {
        "title": "Health Status Banner",
        "icon": "🏥",
        "color": colors.HexColor("#EF4444"),
        "points": [
            "Overall account health: Green / Yellow / Red",
            "Driven by count of P1/P2 open issues and unresolved Zendesk tickets",
            "Shown prominently at top of dashboard for instant awareness",
            "Updates on every dashboard refresh",
        ]
    },
]

fx = 36
fy = H-150
fw = (W - 84) / 3
fh = 140

for i, feat in enumerate(features):
    col = i % 3
    row = i // 3
    bx = fx + col * (fw + 6)
    by = fy - row * (fh + 10)

    c.setFillColor(WHITE)
    c.roundRect(bx, by, fw, fh, 8, fill=1, stroke=0)
    # Color top bar
    c.setFillColor(feat["color"])
    c.roundRect(bx, by+fh-30, fw, 30, 8, fill=1, stroke=0)
    c.rect(bx, by+fh-30, fw, 15, fill=1, stroke=0)  # Fill bottom half square

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(bx+10, by+fh-20, feat["title"])

    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 7.5)
    py_f = by+fh-44
    for pt in feat["points"]:
        # mini bullet
        c.setFillColor(feat["color"])
        c.circle(bx+14, py_f+3.5, 2, fill=1, stroke=0)
        c.setFillColor(DARK_GRAY)
        c.drawString(bx+20, py_f, pt)
        py_f -= 13

footer(7)
c.showPage()


# ═══════════════════════════════════════════════════════════════════
# PAGE 8 — EXPANDING TO OTHER CUSTOMERS
# ═══════════════════════════════════════════════════════════════════
page_bg(LIGHT_BG)
header_bar("Expansion Roadmap", "How to replicate this for any customer account in <1 day")

# Section A: What's reusable
c.setFillColor(DEEP_PURPLE)
c.roundRect(36, H-165, W-72, 30, 6, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 12)
c.drawString(50, H-148, "What's Already Reusable (Built-in)")

reusable = [
    ("Node.js Server", "server.js is 100% reusable — just change the ALLOWED_DOMAIN if needed"),
    ("Google OAuth2", "Same auth flow works for any customer dashboard. No code change needed."),
    ("Cloud Run Infra", "Dockerfile + deployment pipeline works as-is. One new Cloud Run service per customer."),
    ("MCP Connections", "Slack, Jira, Zendesk MCP servers already configured in ArmorCode's Claude setup"),
    ("Dashboard UI", "index.html is the template. Parameterize by customer name, Slack channels, Jira labels"),
    ("Trend & Chart Logic", "Chart.js visualizations are data-driven — swap data source, same charts"),
]
ty = H-195
for comp, note in reusable:
    c.setFillColor(SUCCESS)
    c.circle(50, ty+4, 4, fill=1, stroke=0)
    c.setFillColor(DEEP_PURPLE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(60, ty, f"{comp}:")
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 9)
    kw = c.stringWidth(f"{comp}:", "Helvetica-Bold", 9) + 64
    c.drawString(kw, ty, note)
    ty -= 16

# Section B: Steps to add a new customer
c.setFillColor(DARK_BG)
c.roundRect(36, ty-15, W-72, 30, 6, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 12)
c.drawString(50, ty+2, "Steps to Add a New Customer Dashboard")
ty -= 50

steps_new = [
    ("10 min", "Identify Slack channels, Jira labels, and Zendesk org for the customer"),
    ("15 min", "Copy index.html, update customer name, Slack channels, and JQL labels"),
    ("5 min",  "Create a new Google Cloud Run service (copy cse-kyc project config)"),
    ("5 min",  "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET env vars"),
    ("5 min",  "Add new callback URI to Google OAuth credentials for new service URL"),
    ("2 min",  "git push -> AI Studio auto-deploys -> new dashboard live at unique URL"),
]

for i, (time, step) in enumerate(steps_new):
    bx = 36
    c.setFillColor(DEEP_PURPLE)
    c.roundRect(bx, ty, 42, 26, 4, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(bx+21, ty+8, time)
    c.setFillColor(WHITE)
    c.roundRect(bx+48, ty, W-90, 26, 4, fill=1, stroke=0)
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 9)
    c.drawString(bx+58, ty+8, step)
    ty -= 32

# Section C: Planned Improvements
c.setFillColor(LAVENDER)
c.roundRect(36, ty-20, W-72, 30, 6, fill=1, stroke=0)
c.setFillColor(DEEP_PURPLE)
c.setFont("Helvetica-Bold", 11)
c.drawString(50, ty-5, "Planned Improvements for Scale")
ty -= 60

improvements = [
    ("Multi-Customer Routing", "Single URL, customer selected via dropdown or sub-path (e.g. /customers/paypal, /customers/jpmorgan)"),
    ("Config-Driven Architecture", "Customer configs (channels, labels, Zendesk org) stored in a JSON/YAML config file — no code changes"),
    ("Auto-Refresh",  "Dashboard polls APIs on a schedule (every 15 min) and caches results to stay fast"),
    ("Notifications",  "Slack bot posts daily digest to #paypal-prep with top action items from the dashboard"),
    ("More MCPs",  "Salesforce for deal context, Google Calendar for QBR scheduling, Gainsight for health scores"),
    ("Role-Based Access",  "CSE sees their accounts; Managers see all accounts; Execs see aggregate health view"),
]

for title, desc in improvements:
    c.setFillColor(PURPLE)
    c.circle(46, ty+4, 3, fill=1, stroke=0)
    c.setFillColor(DEEP_PURPLE)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(56, ty, f"{title}:")
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 9)
    kw = 56 + c.stringWidth(f"{title}:", "Helvetica-Bold", 9) + 4
    c.drawString(kw, ty, desc)
    ty -= 15

footer(8)
c.showPage()


# ═══════════════════════════════════════════════════════════════════
# PAGE 9 — ACHIEVEMENTS & NEXT STEPS
# ═══════════════════════════════════════════════════════════════════
page_bg(DARK_BG)

# Purple gradient header
c.setFillColor(DEEP_PURPLE)
c.rect(0, H-130, W, 130, fill=1, stroke=0)
c.setFillColor(colors.HexColor("#4A2AB0"))
c.rect(0, H-100, W, 20, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 22)
c.drawString(36, H-65, "What Was Achieved")
c.setFont("Helvetica", 11)
c.setFillColor(LAVENDER)
c.drawString(36, H-90, "In 2 days, a production-grade internal tool was designed, built, secured, and deployed.")

# Achievement cards
achievements = [
    ("Production App Live", "Secure web app running on\nGoogle Cloud Run — HTTPS,\nOAuth2, auto-scaled", colors.HexColor("#35198E")),
    ("Real-Time Data", "Live Jira, Zendesk & Slack\ndata aggregated via MCP\nservers into one dashboard", colors.HexColor("#0052CC")),
    ("Secured Access", "Multi-layer auth: Google OAuth\n+ domain check + inactivity\ntimeout + secure cookies", colors.HexColor("#10B981")),
    ("Auto-Deploy Pipeline", "GitHub → AI Studio → Cloud\nRun — push code, get a\nnew version in minutes", colors.HexColor("#F59E0B")),
    ("Leadership Deck", "9-slide ArmorCode-branded\nPPTX created and uploaded\nto Google Drive", colors.HexColor("#EC4899")),
    ("Reusable Template", "Entire stack designed to\nbe cloned for new accounts\nwith minimal configuration", colors.HexColor("#8B5CF6")),
]

ax = 36
ay = H-170
aw = (W - 84) / 3
ah = 95

for i, (title, desc, bg) in enumerate(achievements):
    col = i % 3
    row = i // 3
    bx = ax + col * (aw + 6)
    by = ay - row * (ah + 10)
    c.setFillColor(bg)
    c.roundRect(bx, by, aw, ah, 8, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(bx+10, by+ah-22, title)
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#FFFFFFCC"))
    dy_a = by+ah-38
    for line in desc.split("\n"):
        c.drawString(bx+10, dy_a, line)
        dy_a -= 12

# Next steps
nx = 36
ny = H-440
c.setFillColor(colors.HexColor("#FFFFFF12"))
c.roundRect(nx, ny, W-72, 100, 8, fill=1, stroke=0)
c.setFillColor(WHITE)
c.setFont("Helvetica-Bold", 12)
c.drawString(nx+14, ny+80, "Immediate Next Steps")
next_steps = [
    "Share live URL with PayPal CSE team for daily use",
    "Expand to 2nd customer account (template is ready — ~42 min effort)",
    "Add auto-refresh so dashboard stays live without manual reload",
    "Present deployment architecture to engineering for CI/CD feedback",
    "Capture feedback from CSE team on what additional panels would help",
]
ty_n = ny+60
for step in next_steps:
    bullet(nx+14, ty_n, step, color=WHITE, dot_color=PURPLE, size=9)
    ty_n -= 16

# Final quote
c.setFillColor(colors.HexColor("#FFFFFF10"))
c.roundRect(36, 60, W-72, 50, 8, fill=1, stroke=0)
c.setFillColor(LAVENDER)
c.setFont("Helvetica-Bold", 10)
c.drawCentredString(W/2, 96, '"Built in 2 days. Secure. Live. Expandable to every customer account."')
c.setFont("Helvetica", 8)
c.setFillColor(GRAY)
c.drawCentredString(W/2, 80, "ArmorCode CSE Dashboard Project  |  Uma Somi Narasimhan  |  May 2026")

footer(9)
c.showPage()

c.save()
print(f"PDF saved: {OUT}")
print(f"Size: {os.path.getsize(OUT):,} bytes")
