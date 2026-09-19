# design.md — Adhishtan IAS

## Identity

**Adhishtan IAS Civil Services Academy** (Devanagari wordmark: अधिष्ठान IAS),
Bhubaneswar, Odisha. Register: editorial, institutional, unhurried — a "quiet
authority" tone rather than a loud sales pitch. Section headings are written as
statements, not slogans: *"Know the terrain before you enter it,"* *"Read with the
syllabus in view,"* *"Every day is a unit of preparation."*

## Colour

| Token | Hex | Role |
|---|---|---|
| `--navy-dark` | `#071126` | Page background |
| `--navy-deep` | `#101A3A` | Section surfaces |
| `--navy-secondary` | `#0B1530` | Secondary panels |
| `--gold` | `#B99752` | Primary accent — links, borders, icons |
| `--gold-soft` | `#D9BA7E` | Lighter accent, gradients |
| `--brass` | `#8F733D` | Deep accent / hover states |
| `--ivory` | `#F4F0E6` | Primary text on navy |
| `--ivory-soft` | `#EAE4D6` | Secondary text on navy |
| `--charcoal` | `#20232A` | Body text on light sections |
| `--gray` | `#686B70` | Muted text |

Navy-and-gold throughout — no third accent colour introduced anywhere in the build.

## Typography

- **Playfair Display** + **Noto Serif Devanagari** — display headlines (the Devanagari
  pairing lets the `अधिष्ठान IAS` wordmark render correctly).
- **Cormorant Garamond** — serif accent, used sparingly for editorial-feeling copy.
- **Inter** + **Noto Sans Devanagari** — body copy, form labels, UI text.
- **JetBrains Mono** — eyebrows (`THE BEDROCK`, `PYQ MATRIX`, etc.), form field labels,
  timestamps — the small-caps monospace "index card" detail that recurs across the
  whole site.

## Layout system

- `--container: 1240px` max width, fluid gutter via `clamp()`.
- Breakpoints restructure at `1152px`, `1024px` and `480px`; spacing and type stay
  fluid between them rather than jumping.
- `--rule` (a soft gold hairline) separates sections instead of heavy dividers.
- `--radius-sm: 2px` — the whole site favours sharp, architectural corners over
  rounded-pill styling, in keeping with the institutional tone.

## Page structure (in order)

1. **Hero** — Three.js scene + cursor glow, headline, "Start Your Learning Journey" CTA
2. **About**
3. **Programs**
4. **The Bedrock** (`#bedrock`) — interactive syllabus heatmap, resettable progress
5. **Daily Editorial** (`#editorial`) — editorial reader panel
6. **PYQ Matrix** (`#pyq`) — previous-year-question search/filter engine
7. **The LBSNAA Target Clock** — countdown framing for exam preparation
8. **Daily Sankalp** — a study/discipline dashboard
9. **Why Adhishtan IAS** — four stated commitments
10. **Faculty**
11. **Events**
12. **Testimonials** — autoplay slider with dot navigation
13. **Enquiry + Contact** (`#enquiry` / `#contact`) — the one form that talks to the
    backend
14. **Footer**

## Interactive systems

- **Hero**: Three.js module (r0.180) loaded via `<script type="importmap">`; GSAP
  drives the headline entrance (`revealHeroHeadline`). `showHeroFallback()` swaps in a
  static fallback if WebGL/Three.js can't initialise — the hero is never left blank.
- **Syllabus heatmap**: local, resettable progress state (`defaultSyllabusState`,
  `initSyllabusHeatmap`), no backend involved — it's a self-study tool, not a synced
  account system.
- **PYQ Matrix**: an in-browser dataset (`buildPYQDataset`) filtered by exam / subject /
  year / free-text search, with paginated "load more" — no network call, everything
  runs client-side.
- **Target Clock + Sankalp dashboard**: date-keyed local state (`todayKey`), resets
  daily; a lightweight personal-discipline tracker, not tied to any account.
- **Enquiry form**: the one part of the page that leaves the browser. Validated
  client-side, then POSTed to the Flask API; success/failure is shown honestly (see
  rules.md).

## Animation

- GSAP `ScrollTrigger` reveals fire once per section, not on every scroll direction.
- `prefers-reduced-motion` disables non-essential motion sitewide; the Three.js hero
  fallback and all content remain visible either way.

## Imagery

- `assets/logo.svg` — original navy/gold monogram (an "A", pointing at the roof-line
  device also echoed in the eyebrow accents), built to match the palette above; no
  existing brand mark was supplied, so this was created rather than left blank.
- `assets/faculty/lbsnaa.jpeg` — the hero background photo, supplied by the academy
  (this build does not fabricate photographs of real, identifiable buildings or
  institutions — an abstract placeholder, `hero-placeholder.svg`, stood in only until
  the real photograph was provided).
