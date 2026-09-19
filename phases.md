# phases.md — how this project reached its current state

## Phase 1 — Existing frontend audit
Inherited `index.html`, `style.css`, `script.js` and a `logo.svg` reference already
built: hero, About, Programs, syllabus heatmap ("The Bedrock"), Daily Editorial, PYQ
Matrix, Target Clock, Sankalp dashboard, "Why Adhishtan IAS," Faculty, Events,
Testimonials, and an Enquiry form — all navy-and-gold, Playfair/Inter/JetBrains Mono
typography, Three.js hero, GSAP reveals. Read as a working system before changing
anything, per the hard constraint not to redesign it.

## Phase 2 — Backend build
`app.py` written as a single-file Flask API: environment-driven SMTP config,
`validate()` with per-field rules and two fixed allow-lists (`stage`, `program`),
`build_email()` producing a plain + HTML message, `send_email()` raising on failure
rather than silently reporting success, and JSON error handlers so the API never
returns an HTML error page (404/405/413/500 all covered).

## Phase 3 — Wiring the enquiry form to the backend
Found that `initEnquiryForm()` never called the backend at all — it validated four of
six fields and showed a hardcoded local "recorded" message. Added `program` and
`message` validators matching the backend's own rules, added `config.js` as the single
place the API URL lives, and rewrote the submit handler to `fetch()` `/api/contact`
with a loading state and a result rendered from the API's actual JSON response —
including mapping per-field `errors` back onto the matching inputs on a 422.

## Phase 4 — Missing assets
Found two asset references pointing at files that had never been supplied:
`logo.svg` (via two inconsistent paths) and `assets/faculty/lbsnaa.jpeg` (the hero
background). Built an original SVG monogram for the logo and pointed both references
at one file. Declined to fabricate a photo of what appears to be a real, specific
government building; supplied an abstract placeholder instead until the real
photograph was added.

## Phase 5 — Deployment configuration
Wrote `backend/vercel.json` using `builds` + `routes` (not `rewrites`) after
confirming on a sibling project that `rewrites` changes the path a Python function
receives, breaking every route. Wrote `.env.example` and `.gitignore` for the backend.

## Phase 6 — Local + Vercel run-through
Verified `app.py` with Flask's test client (health check, valid/invalid submissions,
wrong method, non-JSON body) before handing off. Walked through running the backend
(`python app.py`) and frontend (VS Code Live Server) locally, confirmed
`/api/health` returns `smtp_configured: true` against the real `.env`, then walked
through the two-project Vercel deployment (backend Root Directory `backend`, frontend
Root Directory `frontend`, `config.js` and `ALLOWED_ORIGINS` cross-wired afterward).

## Phase 7 — Documentation
This file, plus `README.md`, `design.md`, `PRD.md`, `rules.md`, written from the
actual shipped code rather than from the original brief, so they describe what the
site does today.
