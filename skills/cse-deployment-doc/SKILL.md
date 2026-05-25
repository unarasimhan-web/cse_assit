---
name: cse-deployment-doc
description: >
  Generate a branded ArmorCode PDF documenting a customer deployment journey — what was built,
  how it was done, the architecture, and how to expand it for other customers.
  Use this skill whenever Uma (or any CSE/engineer) says: "document what I built",
  "create a deployment journey PDF", "write up what we deployed", "make a PDF of the architecture",
  "document this deployment for [customer]", "summarize the build", "create deployment docs",
  or any request to produce a slide-style PDF capturing a technical deployment milestone.
  Output is a PPT-style, visually designed PDF using ArmorCode brand colors.
  Also used for: architecture diagrams, deployment summaries, expansion roadmaps.
---

# CSE Deployment Journey — PDF Generator Skill

Produce a slide-style, ArmorCode-branded PDF documenting a customer deployment journey.
Covers: what was achieved, how it was built, architecture diagram, and expansion roadmap.

The bundled script `scripts/build_pdf.py` is the canonical template — adapt it per deployment.

---

## Quick Start

```bash
# 1. Install dependency (once)
pip install reportlab --break-system-packages

# 2. Edit scripts/build_pdf.py — update CUSTOMER, PAGES content, OUT path
# 3. Run
python scripts/build_pdf.py

# 4. Upload to Google Drive (Uma_AI_Mania folder ID: 1GVdjtVkljb77NH1SPUDfIpzLXpxszTdb)
```

---

## PDF Structure (9 pages)

| Page | Title | Content |
|------|-------|---------|
| 1 | Title slide | Customer name, date, tagline |
| 2 | 2-Day Timeline | Day 1 / Day 2 milestones |
| 3 | Architecture Diagram | Component boxes + arrows (drawn with primitives) |
| 4 | Deployment Pipeline | GitHub → Cloud Run pipeline steps |
| 5 | MCP Integrations | Jira / Slack / Zendesk connection details |
| 6 | Security Layers | OAuth, session management, auth flow |
| 7 | Dashboard Features | What the dashboard does, key UX decisions |
| 8 | Expansion Roadmap | How to replicate for other customers |
| 9 | Achievements | Summary of what was delivered |

---

## Brand Colors

```python
DEEP_PURPLE = "#35198E"   # header backgrounds
PURPLE      = "#9A84DF"   # accent bars, highlights
LAVENDER    = "#EDE9FB"   # card backgrounds, light fills
LIGHT_BG    = "#F6F4FE"   # page background
DARK_BG     = "#1A0E4F"   # dark slide backgrounds
WHITE       = "#FFFFFF"
GRAY        = "#6B7280"
SUCCESS     = "#10B981"
WARNING     = "#F59E0B"
INFO        = "#3B82F6"
ACCENT      = "#EC4899"
TEAL        = "#0EA5E9"
```

---

## Key Helper Functions (from bundled script)

```python
page_bg(color)          # fill page background
header_bar(title, subtitle, bg, text_color, h)  # dark header strip
section_card(x, y, w, h, title, color)           # rounded content card
bullet(text, x, y, size, color, indent)          # bullet point
tag(text, x, y, bg, text_color)                  # colored badge/tag
footer(page_num, total)                           # page footer
draw_box(x, y, w, h, bg, label, sublabel)        # architecture box
arrow(x1, y1, x2, y2)                            # connecting arrow
```

---

## Architecture Diagram (Page 3)

Draw using reportlab canvas primitives — no external images needed.

Layout (top-to-bottom flow):
```
[User Browser]
      ↓
[Google OAuth2]  →  [Cloud Run Container]
                         ↓
              [Express + Passport.js Server]
                    ↙         ↓         ↘
            [Jira MCP]  [Slack MCP]  [Zendesk MCP]
                    ↘         ↓         ↙
              [Claude AI (Anthropic API)]
                         ↓
              [HTML Dashboard Output]
```

Use `draw_box()` for each component, `arrow()` for connections.
Color-code by layer: auth=INFO blue, app=DEEP_PURPLE, data=SUCCESS green, AI=ACCENT pink.

---

## Adapting for a New Customer

1. Copy `scripts/build_pdf.py` → `scripts/build_<customer>_pdf.py`
2. Update at top of file:
   - `CUSTOMER_NAME` — e.g. `"Stripe"`
   - `OUT` — output path
   - Page 2 timeline — update Day 1/Day 2 milestones
   - Page 5 MCP channels — update Slack channel names
   - Page 9 achievements — update what was delivered
3. Architecture diagram (Page 3) stays the same — it's generic ArmorCode stack
4. Run and upload to the customer's Google Drive folder

---

## Google Drive Upload

Target folder for Uma: `Uma_AI_Mania` (ID: `1GVdjtVkljb77NH1SPUDfIpzLXpxszTdb`)

Upload method — use Google Drive MCP tool `create_file`:
```python
# base64-encode the PDF, then:
mcp__create_file(
    title="<Customer> CSE Deployment Journey — <Month> <Year>.pdf",
    parentId="1GVdjtVkljb77NH1SPUDfIpzLXpxszTdb",
    contentMimeType="application/pdf",
    disableConversionToGoogleType=True,
    base64Content=<full_base64_string>
)
```

**Important:** Always pass the complete base64 string. Verify uploaded file size matches
local file size before reporting success.

---

## Output Naming Convention

```
<Customer>_CSE_Deployment_Journey_<YYYY-MM>.pdf
e.g. PayPal_CSE_Deployment_Journey_2026-05.pdf
```

---

*Last updated: May 2026 — built for Uma Somi Narasimhan, CSE @ ArmorCode*
