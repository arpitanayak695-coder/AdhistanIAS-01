# PRD.md — Adhishtan IAS Civil Services Academy website

## 1. Overview

A marketing and self-study website for a UPSC civil-services coaching academy. Most
of the site is self-contained study tooling (syllabus tracking, previous-year
questions, a daily discipline dashboard); the one piece that reaches a server is the
enquiry form, which emails the academy through a small Flask API.

## 2. Goals

1. Present the academy's syllabus, programs, faculty and results credibly enough that
   a prospective student enquires.
2. Give a prospective or enrolled student real, usable study tools in the browser —
   not just marketing copy — without requiring an account.
3. Get an enquiry reliably from the browser into the academy's inbox, with every field
   staff need to respond.
4. Never claim an enquiry was sent when it wasn't.

## 3. Target users

- **Prospective student**, comparing coaching options, wanting to see the syllabus
  coverage and past questions before committing.
- **Enrolled/self-studying aspirant**, using the syllabus heatmap, PYQ Matrix, and
  Sankalp dashboard as daily tools.
- **Academy staff**, receiving and replying to enquiries from the notification email.

## 4. Functional requirements

| # | Requirement |
|---|---|
| F1 | Hero, About, Programs, Faculty, Events, Testimonials sections |
| F2 | The Bedrock — interactive syllabus heatmap with resettable progress |
| F3 | Daily Editorial — an editorial reading panel |
| F4 | PYQ Matrix — searchable/filterable previous-year questions (exam, subject, year, free text, paginated) |
| F5 | LBSNAA Target Clock + Daily Sankalp — a countdown and study-discipline dashboard |
| F6 | Enquiry form: Full Name, Email, Phone, Current Preparation Stage, Preferred Program, Message — all required |
| F7 | Submitting POSTs JSON to `POST /api/contact` |
| F8 | Backend validates the payload and returns per-field errors on failure |
| F9 | On success the backend emails the academy via SMTP |
| F10 | The browser shows the real result — success text from the API, or a specific failure message — never a hardcoded "sent" confirmation |
| F11 | Loading state during submission |
| F12 | `GET /api/health` reports service and SMTP configuration status |

## 5. Non-functional requirements

- Responsive from 320px up; explicit restructuring at 1152 / 1024 / 480px, fluid
  `clamp()` type/spacing between them.
- `prefers-reduced-motion` respected for GSAP and CSS animation.
- The Three.js hero degrades to a static fallback rather than a blank section if
  WebGL is unavailable.
- No secret reachable from the browser; all SMTP configuration server-side only.
- No redesign of the existing palette, typography, or section order — see `rules.md`.

## 6. Frontend requirements

HTML5, CSS3, vanilla JS ES6+, Three.js (import map, CDN), GSAP + ScrollTrigger (CDN).
No build step, no bundler, no framework. `config.js` isolates the API's URL. Enquiry
form field names must match the backend's field names exactly.

## 7. Backend requirements

Python 3, Flask, flask-cors, python-dotenv, smtplib. All configuration from
environment variables. Every response — success, validation, wrong method, oversized
body, server error — returns JSON, never an HTML error page.

## 8. API requirements

- `POST /api/contact` accepts `application/json` with the six enquiry fields.
- `GET /api/health` returns service + SMTP configuration status.
- Status codes: 200 success, 400 malformed/non-JSON body, 413 oversized body,
  422 validation errors (with a per-field `errors` object), 500 SMTP not configured,
  502 SMTP send failed, 405 wrong method.
- CORS restricted to `ALLOWED_ORIGINS`.

## 9. Validation

| Field | Rule |
|---|---|
| `name` | required, 2–80 chars, letters/spaces/`'`/`-` only |
| `email` | required, ≤120 chars, valid address format |
| `phone` | required, ≤20 chars as typed, 7–15 digits after stripping `+ ( ) -` and spaces |
| `stage` | required, must be one of four fixed options |
| `program` | required, must be one of four fixed options |
| `message` | required, 10–1000 chars |

The same rules are mirrored client-side for fast feedback, but the server is the
authority — a client-side pass never determines what actually gets emailed.

## 10. Security

No SMTP credential, API key, or other secret in any file the browser downloads. CORS
allow-list rather than a wildcard in production. `.env` git-ignored, `.env.example`
committed with empty values. Oversized request bodies (>16 KB) rejected before
parsing. Error responses never include SMTP host/credential detail or a stack trace.

## 11. Success criteria

1. Every section renders correctly from 320px to large desktop with no horizontal
   scroll, and the site's existing visual identity is unchanged.
2. A complete, valid enquiry submission returns 200, shows the API's real success
   text, and produces an email in the academy's inbox with all six fields.
3. An invalid submission returns 422 with a specific message per invalid field, shown
   next to that field.
4. Stopping the backend produces a clear "couldn't reach the server" message rather
   than a silent failure or a false success.
5. No response, page source, or committed file contains a credential or a stack
   trace.

## 12. Deployment requirements

Frontend deployable as a static site with no build command (Root Directory
`frontend`). Backend deployable as a Vercel Python function (Root Directory `backend`,
`vercel.json` using `builds`/`routes`) or as a conventional long-running Flask
process elsewhere. `config.js` holds the frontend's one pointer to the backend's URL;
the backend's `ALLOWED_ORIGINS` must in turn list the frontend's deployed URL.
