# rules.md — hard rules for future changes

## Design

1. **Do not redesign or change the existing UI/UX, colours, layout, or animations.**
   This was a stated hard constraint on the original build and still applies: the
   navy/gold palette, the Playfair/Cormorant/Inter/JetBrains Mono type pairing, the
   `--radius-sm: 2px` sharp-corner geometry, and the section order in `design.md` are
   not to be changed without being explicitly asked.
2. Only make the changes a task actually requires. If a fix needs a new component,
   build it from the tokens already in `:root` — don't introduce a new colour, font,
   or corner radius.
3. Never leave an image slot empty or pointing at a file that doesn't exist. If a
   required asset is missing, say so and provide a clearly-labelled placeholder rather
   than silently breaking the reference — see the logo/hero-photo handling in
   `memory.md` for the pattern.
4. Never fabricate a photograph of a real, identifiable place or institution. Use an
   abstract placeholder and ask for the real photo instead.

## Engineering

5. **The backend stays Python/Flask.** No swapping the API for a third-party form
   service, no Node/Express.
6. **Frontend and backend stay separate**, deployed independently. The frontend knows
   exactly one thing about the backend: the URL in `config.js`.
7. **A new enquiry-form field touches four places**, not one: the HTML input, the JS
   `validators` object in `script.js`, the Python `validate()` function's rule (and
   allow-list, if it's a fixed-choice field), and both templates inside
   `build_email()`. Missing one desyncs the form silently.
8. **Never expose SMTP secrets.** Credentials live in `.env` or the host's environment
   panel only — never in any file the browser can download, never committed.
9. **Validate every input server-side**, even fields the client already checked.
   Reject blank/whitespace-only values, wrong types, and anything outside the fixed
   `stage`/`program` allow-lists.
10. **Every API response is JSON**, success or failure — never an HTML error page,
    never a bare string.
11. **`send_email()`'s real outcome decides the response** — a 200 is only returned
    once SMTP delivery has actually succeeded. Passing validation is never, by itself,
    reported as "sent."
12. **Never leak internals.** No stack traces, SMTP host/credential names, or other
    implementation detail in an API response — log the detail server-side, return one
    plain sentence.
13. **`vercel.json` uses `builds` + `routes`, not `rewrites`**, for the Python
    backend — `rewrites` changes the path Flask receives and breaks every route (see
    `memory.md` for how this was found).
14. Maintain responsiveness from 320px up using the existing fluid `clamp()` approach
    and the three existing breakpoints — no new fixed-pixel breakpoints without need.
15. Avoid unnecessary dependencies. The frontend has none beyond Three.js/GSAP via
    CDN and should keep it that way; the backend's three dependencies each do a job
    the standard library doesn't.
16. Do not claim untested functionality works. Email delivery is "working" only once
    a message has actually been seen in the inbox.

## Content

17. Keep the academy's name — **Adhishtan IAS Civil Services Academy** — and the
    Devanagari wordmark consistent across the site, the email subject line, and the
    documents.
18. The enquiry form asks only for name, email, phone, preparation stage, preferred
    program, and a message. Do not add fields collecting sensitive personal detail
    (ID numbers, category/caste, income, etc.) without being explicitly asked.
19. `stage` and `program` are fixed-choice fields on both ends (frontend `<select>`,
    backend allow-list). Adding a new option means updating the HTML `<option>` list,
    the backend allow-list, and the JS validator together — not just one of them.

## General

20. Do not break an existing feature (syllabus heatmap, PYQ Matrix, Target Clock,
    Sankalp dashboard, testimonials slider, etc.) when extending the site.
21. Do not create a broken asset path.
22. Do not leave a `TODO` in a feature that's supposed to be complete.
