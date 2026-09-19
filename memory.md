# memory.md — project memory

Read this first when returning to the project or handing it to another developer.

## Project overview

Adhishtan IAS is a UPSC civil-services coaching academy site (Bhubaneswar). Almost
everything on the page is a self-contained frontend tool (syllabus heatmap, PYQ
engine, study dashboard) — the **only** thing that talks to a server is the Enquiry
form, which POSTs to a small Flask API that emails the academy.

## History of this build

The frontend (`index.html`, `style.css`, `script.js`) and the backend (`app.py`)
arrived as separately-built pieces. Three real problems were found and fixed:

1. **The enquiry form never called the backend at all.** `initEnquiryForm()` only
   validated four of the six fields, showed a hardcoded "recorded locally" message,
   and reset the form — no `fetch()` call existed anywhere. Rewired it to validate all
   six fields (added `program` and `enqMessage` validators matching the backend's own
   rules) and POST to `/api/contact`, with a loading state and honest success/failure
   messaging sourced from the API's own response.
2. **Two asset paths pointed at files that were never supplied**: `assets/logo.svg`
   (referenced from two *different* paths — `assets/logo.svg` for the favicon, plain
   `logo.svg` for the navbar image) and `assets/faculty/lbsnaa.jpeg` (the hero
   background). An original SVG monogram logo was created and both references were
   pointed at the single `assets/logo.svg` copy. The hero photo was never fabricated
   (it names a real, specific building) — an abstract placeholder SVG stood in until
   the real photo was supplied by the user.
3. **Deployment**: `backend/vercel.json` was written using the legacy `builds` +
   `routes` config, not the newer `rewrites` field — `rewrites` was confirmed (on a
   sibling project, [[aureva-yoga-site]]) to rewrite the path the Flask/FastAPI app
   actually receives, breaking every route. `routes` forwards the request without
   touching the path.

## Technologies

- Frontend: HTML5, CSS3 (custom properties, `clamp()`, Grid/Flexbox), vanilla JS
  ES6+, Three.js r0.180 (import map, CDN), GSAP 3.12.5 + ScrollTrigger (CDN). No build
  step, no bundler, no framework.
- Backend: Python 3, Flask 3.0.3, flask-cors 4.0.1, python-dotenv 1.0.1, smtplib
  (stdlib).

## File map

- `frontend/config.js` — the single place the API's URL is configured; auto-detects
  localhost vs production.
- `frontend/script.js` — one `init*()` function per feature (`initHero`,
  `initSyllabusHeatmap`, `initPYQEngine`, `initSankalpDashboard`, `initEnquiryForm`,
  etc.), called from `bootstrap()` at the bottom of the file.
- `backend/app.py` — the entire API: config, CORS, validation (`validate()`), email
  composition (`build_email()`), SMTP delivery (`send_email()`), routes, JSON error
  handlers. Single file, not yet split into `mailer.py` / `validation.py` modules
  (that split was discussed as a preference but not carried out in this build).

## API contract

`POST /api/contact` body: `name, email, phone, stage, program, message`. `stage` must
be one of four fixed options; `program` one of four fixed options — both enforced
server-side against an allow-list, not just "non-empty." Field names in the HTML
`name`/`id` attributes, the JS validators, and the Python `validate()` function must
stay in sync — renaming one means renaming all three.

## Environment variables

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USE_TLS`, `SMTP_USE_SSL`, `SMTP_USERNAME`,
`SMTP_PASSWORD`, `COMPANY_EMAIL`, `FROM_EMAIL`, `EMAIL_SUBJECT`, `HOST`, `PORT`,
`FLASK_DEBUG`, `ALLOWED_ORIGINS`. Documented in `backend/.env.example`; `.env` is
git-ignored. Gmail requires an App Password, not the account password.

## Deployment notes

Two Vercel projects (Root Directory `backend` / `frontend`), same pattern as
[[aureva-yoga-site]]. After deploying: set `config.js` → `API_BASE_PRODUCTION` to the
backend's URL, and set the backend's `ALLOWED_ORIGINS` to the frontend's URL — both
sides need updating, a CORS error means one of them was missed.

## Known limitations

- The syllabus heatmap, PYQ engine, and Sankalp dashboard all use local, in-page
  state only — nothing is saved between visits or synced to an account. If persistent
  per-student progress is wanted later, that's a real feature to design, not a bug.
- No database — the email itself is the only record of an enquiry.
- Backend is a single `app.py`, not split into modules, despite that being an earlier
  stated preference.

## Future modification rules

1. Read `rules.md` before changing anything.
2. A new enquiry-form field needs four updates, not one: the HTML input, the JS
   `validators` object, the Python `validate()` allow-list/regex, and `build_email()`'s
   plain + HTML templates.
3. Don't touch the palette, type pairing, or section order without being asked —
   see `rules.md`.
4. Any claim about email delivery must be backed by an actual `send_email()` success —
   never report success on validation passing alone.
