# Adhishtan IAS — Civil Services Academy Website

A cinematic marketing + preparation-tools website for a UPSC civil services coaching
academy (Bhubaneswar), plus a small Python API that validates the enquiry form and
delivers it to the institute's inbox over SMTP.

```
Enquiry form  →  fetch POST  →  Flask API  →  validation  →  SMTP  →  institute inbox
                                                           →  JSON  →  in-page success message
```

## Features

- Three.js hero (module import via `<script type="importmap">`, Three r0.180) with a
  cursor-reactive glow, and a `heroFallback` for browsers/devices that can't run WebGL.
- GSAP 3.12 + ScrollTrigger for section reveals and the hero headline entrance.
- **The Bedrock** — an interactive syllabus heatmap with a "Reset Progress" control.
- **Daily Editorial** — an editorial reader panel for daily current-affairs reading.
- **PYQ Matrix** — a searchable/filterable previous-year-questions engine (exam, subject,
  year, free-text search, "load more" pagination).
- **The LBSNAA Target Clock** and **Daily Sankalp** — a countdown/study dashboard pair
  that tracks a day's study discipline.
- Programs, Faculty, Events and Testimonials sections (slider with dot navigation).
- A **separate, fully working Enquiry form** (`#enquiry`) that posts to the Flask API —
  real client + server-side validation, a loading state, and an honest success/failure
  message (never a fake "sent" confirmation if the email didn't actually go out).
- Flask API: `POST /api/contact`, `GET /api/health`.

## Tech stack

HTML5 · CSS3 (custom properties, Grid/Flexbox, `clamp()` fluid type) · vanilla JS ES6+ ·
Three.js r0.180 (via import map, CDN) · GSAP 3.12.5 + ScrollTrigger (CDN) · Flask 3
(Python) · smtplib for SMTP delivery.

Fonts: Playfair Display + Noto Serif Devanagari (display), Cormorant Garamond (serif
accent), Inter + Noto Sans Devanagari (body), JetBrains Mono (labels/eyebrows) — Google
Fonts, with system-font fallbacks if offline.

## Folder structure

```
adhisthan-ias-website/
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── config.js              ← the one file to edit for the backend's URL
│   └── assets/
│       ├── logo.svg
│       └── faculty/
│           ├── lbsnaa.jpeg            (your real hero photo — you supplied this)
│           └── hero-placeholder.svg   (unused now; safe to delete or keep)
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── vercel.json
│   ├── .env                   ← your real values, never committed
│   ├── .env.example
│   └── .gitignore
├── README.md
├── design.md
├── memory.md
├── phases.md
├── PRD.md
└── rules.md
```

## Run locally (VS Code)

**Backend**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows        source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python app.py
```
Confirm at `http://127.0.0.1:5000/api/health` — expect
`{"success": true, "status": "ok", "smtp_configured": true}`.

**Frontend**
Right-click `frontend/index.html` → **Open with Live Server** (needs the Live Server
VS Code extension). It serves on `http://127.0.0.1:5500`, already allowed by the
backend's default `ALLOWED_ORIGINS`.

`config.js` auto-detects localhost and points at `http://127.0.0.1:5000` — nothing to
edit for local use.

## Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Purpose |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USE_TLS`, `SMTP_USE_SSL` | Mail server connection |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | Login for that mailbox (Gmail needs an **App Password**, not your normal password) |
| `COMPANY_EMAIL` | Where enquiries land |
| `FROM_EMAIL` | "From" address on the outgoing mail |
| `EMAIL_SUBJECT` | Subject line ("New Student Inquiry — Adhisthan IAS") |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed to call the API |
| `HOST`, `PORT`, `FLASK_DEBUG` | Local server settings |

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | `{success, status, smtp_configured}` |
| POST | `/api/contact` | Body: `name, email, phone, stage, program, message` |

Responses: **200** success · **400** malformed/non-JSON body · **413** body too large ·
**422** validation errors (`errors` object, one message per field) · **500** SMTP not
configured · **502** SMTP send failed · **405** wrong method. Every response is JSON —
the API never returns an HTML error page.

## Deploy to Vercel

Two separate Vercel projects from the same repo:

1. **Backend** — Root Directory `backend`. Vercel builds `app.py` via `@vercel/python`
   using `vercel.json`. Add every `.env.example` key as a real Environment Variable in
   Project Settings, then confirm `/api/health` on the deployed URL.
2. **Frontend** — Root Directory `frontend`. No build command.
3. Edit `frontend/config.js` → `API_BASE_PRODUCTION` to the backend's deployed URL,
   commit and push.
4. Set the backend's `ALLOWED_ORIGINS` env var to the frontend's deployed URL and
   redeploy the backend.

`vercel.json` uses the legacy `builds` + `routes` config on purpose, **not** `rewrites`
— `rewrites` changes the path the Flask app receives (every route would look like the
function's own filename to Flask and 404). `routes` forwards the request to the
function while keeping the real path (`/api/contact`, `/api/health`) intact.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Enquiry form shows "could not reach the server" | Backend not running, or `config.js` points at the wrong URL |
| CORS error in the browser console | The page's origin isn't in `ALLOWED_ORIGINS` — add it exactly, no trailing slash, and restart/redeploy |
| Deployed API 404s on every route with its own JSON `"Endpoint not found"` | `vercel.json` Root Directory isn't set to `backend`, or the file was reverted to `rewrites` |
| 502 on a valid submission | SMTP credentials wrong, or Gmail needs an App Password instead of the account password |
| Hero background looks empty/plain | `assets/faculty/lbsnaa.jpeg` missing or misnamed — filename and extension must match exactly |
| Three.js hero doesn't render | WebGL unavailable on the device/browser — `heroFallback` should show automatically; this is expected, not a bug |

## Security notes

- `.env` is git-ignored; only `.env.example` (no real values) is committed.
- CORS is an explicit allow-list, never `*`, in production.
- All enquiry fields are validated server-side regardless of what the browser already
  checked.
- API errors never leak SMTP credentials, stack traces, or internal detail — only a
  short, safe message.
