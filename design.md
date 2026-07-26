# SomaFlow website — design spec

Companion to `website-plan.md` (content & structure) — this file defines the visual language. Both travel together into the website project. The goal: someone landing on the site and then opening the app should feel zero seam. Every token below is lifted from the app's actual theme (`constants/Theme.ts`) unless marked as a web-only addition.

## Brand feel

Calm, soft, unhurried. The app is a breathing companion, and the site should breathe too: generous whitespace, slow gentle motion, nothing that flashes, pops, or urges. No hard edges, no pure white or black, no saturated alarm colors. If a design choice feels energetic or salesy, it's wrong.

The visual signature is the **breathing circle**: soft concentric circles that expand and contract. It's the app icon, the core visualization, and should anchor the site's hero.

## Typography

- **Family**: [Inclusive Sans](https://fonts.google.com/specimen/Inclusive+Sans) for everything — headings, body, buttons. Same as the app. Self-host or Google Fonts (self-hosting keeps the privacy policy's "no third-party requests" story clean — prefer it).
- Weights: Regular (400) for body, Bold (700) for headings and emphasis. The app uses a SemiBold in places; on web, 700 with slightly smaller sizes reads equivalently.
- Scale (desktop / mobile):
  - Hero title: 44px / 32px
  - Page title (h1): 34px / 28px
  - Section heading (h2): 24px / 21px
  - Sub-heading (h3): 19px / 17px
  - Body: 17px / 16px, line-height ~1.6
  - Small/footnote: 14px
- Body text max-width ~65ch — the research and privacy pages are reading pages.
- Letter-spacing: default. Inclusive Sans is already airy; don't track it out.

## Color

Two schemes via `prefers-color-scheme`. Tokens (from the app theme):

| Token | Light | Dark |
|-------|-------|------|
| Background gradient | `#F7FFFF → #F0FBFB → #D9F0F3` (top→bottom) | `#15242B → #1A2D34 → #24414D` |
| Text | `#2C6B80` | `#D2E9F1` |
| Muted text | `rgba(44,107,128,0.6)` | `rgba(210,233,241,0.6)` |
| Primary / links | `#408fa7` | `#3ea6c7` |
| Button fill (both schemes) | `#408fa7` | `#408fa7` |
| Button label | white | white |
| Border / rules | `#CAE9E9` | `#3A525C` |
| Card surface | `rgba(44,107,128,0.10)` | `rgba(8,18,24,0.35)` |
| Floating surface (sticky nav) | `rgba(232,247,247,0.94)` | `rgba(34,58,68,0.94)` |
| Destructive/error (form validation) | `#B85C72` | `#E5A3B3` |

Rules that carry over from the app:

- The page background is the **gradient**, fixed (doesn't scroll away) — content floats over it. Never a flat white/black page.
- Cards are **translucent tints** over the gradient, so they read slightly darker than whatever stop they sit on. **Never nest card-on-card** — the tints stack into muddy patches. Content inside a card sits on transparency.
- Buttons keep the same `#408fa7` fill in both schemes so the white label's contrast never changes.
- All text/background pairs must hold WCAG AA (the palette was contrast-checked in the app at ≥3.5:1 for UI, 4.5:1 for body — re-verify on web since the gradient stops differ slightly from app surfaces).

## Shape & spacing

- Corner radius: 16px for cards and form fields, 999px (full pill) for buttons and tag-like chips. Nothing square.
- Card padding: 16px minimum (app convention); 24px is fine on desktop.
- Spacing rhythm: multiples of 8. Sections separated by 64–96px desktop, 40–56px mobile — err spacious.
- Borders: 1px in the border token, used sparingly (form fields, table rules). Prefer spacing over lines as a separator.
- Shadows: none, or barely-there soft ambient at most. The app's depth comes from translucent tints, not elevation.

## Components

**Buttons.** Primary: pill, `#408fa7` fill, white label, ~16px vertical padding. Hover: slight lift in fill lightness, no movement. Secondary (e.g. "Read the research"): pill outline in the border token with text-colored label. One primary per section.

**Cards.** The card surface token, 16px radius, used for: feature blocks on the landing page, reference entries on the research page, the form container, donation options. Headers inside cards use h3.

**Sticky nav.** The floating-surface token with slight blur (`backdrop-filter`), full pill or soft-cornered bar; wordmark left, page links right, collapsing to a simple stacked menu on mobile (a plain disclosure — no hamburger animation theatrics). Mirrors the app's floating translucent tab bar.

**Footer.** On the gradient directly (no surface): small muted text, links to privacy/feedback, "made by" line.

**Forms** (feedback page). Fields: 16px radius, 1px border token, card-tint fill, text-colored input, muted placeholder. Focus: 2px ring in primary — clearly visible, since keyboard users are first-class. Errors in the destructive token with plain-language messages. Labels always visible above fields (no placeholder-as-label). Type selector (bug / idea / other) as pill segmented buttons — active pill: `#408fa7` fill + white label; inactive: near-white `#F0FAFB` fill + `#2C6B80` label (the app keeps this light pill palette in both schemes on purpose; do the same).

**Reference entries** (research page). One card per study: plain-language one-liner in body text, citation line in small muted text, link styled as primary. Section intros in body text directly on the gradient.

**Store badges** (hero). Official Google Play badge art; "Open the web app" as a primary pill button beside it.

## Motion

- **Hero breathing circle**: 3–4 soft concentric circles (tints of primary at low opacity, blurred edges) scaling ~1.0→1.15→1.0 on a slow ease-in-out loop. Breathe at a real calming pace — roughly 5.5s in, 5.5s out (11s loop, resonant-breathing rate), not a snappy UI timing. This is the one piece of ambient motion on the site.
- Everything else: at most gentle fade/translate-up (200–300ms ease-out) on scroll-in, used sparingly or not at all.
- **`prefers-reduced-motion: reduce` must disable both** — circle renders static, scroll animations off. Non-negotiable for this audience (POTS/CFS visitors are disproportionately motion-sensitive).

## Layout per page (one-liners)

- **Landing**: centered hero (animated circle behind title + pitch + badges) → 2-col feature card grid (1-col mobile) → "why breathwork" teaser strip → privacy call-out card → tiny about-me → footer.
- **Privacy / Research**: single reading column (~65ch), page title, generous section spacing. Research adds the disclaimer card (border in destructive token or a soft tinted card — visible, not shouty) directly under the title.
- **Feedback**: form card first, donation card second, contact line last. Short page, no hero.

## Responsive & a11y baseline

- Mobile-first; breakpoints ~640px and ~960px are plenty for four pages.
- Semantic landmarks (`header/nav/main/footer`), one h1 per page, skip-link, visible focus everywhere, alt text on all imagery, color never the sole signal.
- Test both schemes at both widths — the translucent tokens behave differently over each gradient.
