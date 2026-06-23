# bemeal — landing page

The anti-foodstagram. A single-page, zero-build landing site whose only job is to
get early users to drop their email for early access.

> *No filters. No aesthetic. No 47-step recipes. Just — what did you actually eat today?*

## Stack

Plain HTML + CSS + vanilla JS. No build step, no dependencies. Fonts load from
Google Fonts (`Instrument Serif`, `DM Sans`, `DM Mono`).

```
bemeal-landing/
├── index.html      # page structure
├── styles.css      # design tokens + editorial/brutalist layout
├── script.js       # motion: word reveal, scroll fades, checklist ticks, marquee
└── assets/
    ├── uploads/      # your original photos (PNGs, kept as source)
    ├── hero-meal.jpg # optimized hero
    └── feed-01.jpg … feed-11.jpg
```

## Run it

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

A local server is recommended so the Google Fonts and relative image paths
behave exactly like production.

## Design notes

- **Type:** `Instrument Serif` italic for display, `DM Sans` for body, `DM Mono` for
  timestamps / micro-labels.
- **Color tokens** live as CSS custom properties at the top of `styles.css`
  (`--bg`, `--amber`, `--late`, etc.).
- **Motion** is progressive and respects `prefers-reduced-motion`:
  - Hero headline reveals word-by-word (40ms stagger).
  - Hero meal photo floats in from the right and settles at `-1.5deg`.
  - How-it-works steps and the anti-features list fade/tick in on scroll.
  - The feed strip auto-scrolls left and pauses on hover.
- **Images** are real, unfiltered meal photos you provided. Originals live in
  `assets/uploads/`; optimized JPEGs power the page. Swap either set to update.

## Waitlist form

The email forms are wired client-side only (basic validation + a confirmation
state). To make them real, point each `<form class="signup">` `submit` handler in
`script.js` at your email/waitlist endpoint (e.g. a serverless function, Buttondown,
ConvertKit, or Formspree).
