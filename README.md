# Global Compensation Intelligence

Gross-to-net, pay bands, statutory benefits, engagement types (permanent, contract, agency, consultant, freelancer) and minimum wages for 180 countries, plus a 2026 global compensation dashboard. Planning estimates, not payroll advice.

## Three ways to run it (all give the same numbers)

| Mode | How | Needs a server? |
|---|---|---|
| **Open the file** | Double-click `index.html` in the repo root (single self-contained file) | No |
| **Static hosting** (GitHub Pages, Netlify, S3...) | Host `index.html`, or the `public/` folder | No |
| **Full stack** | `npm start`, then open http://localhost:3000 | Yes (Node 18+) |

`public/index.html` tries the Node API first (`api/...`). If the API is not reachable (file://, GitHub Pages, "Failed to fetch"), it automatically switches to the same engine bundled in `public/engine.bundle.js`. The root `index.html` has the engine inlined and never calls a server.

## Structure

```
index.html                      GENERATED single-file app (engine + dashboard inlined)
public/index.html               app UI (hybrid: Node API, or bundled engine when there is no server)
public/engine.bundle.js         GENERATED browser copy of lib/data.js + lib/engine.js
public/Global_Compensation_Dashboard_2026.html   standalone dashboard shown in the Dashboard tab
lib/data.js, lib/engine.js      country rules, tax profiles, benefits, pay bands + calculation engine
server.js                       zero-dependency Node server: static files + JSON API
tools/build-single.js           regenerates index.html and public/engine.bundle.js
test/                           backend, dashboard and UI / full-stack tests
.github/workflows/pages.yml     runs all tests, then deploys index.html to GitHub Pages
```

After changing anything in `lib/` or `public/`, run `npm run build` and commit the regenerated files (`npm test` fails if they are stale).

## Commands

```
npm install          # only needed for the tests (jsdom); the app itself has no dependencies
npm start            # http://localhost:3000  (PORT env var to change)
npm run build        # regenerate index.html + public/engine.bundle.js
npm test             # everything below (about 3 minutes)
npm run test:quick   # smoke tests + "generated files are current" check
npm run test:api     # BACK END: real HTTP server, every endpoint x all 180 countries (3,300+ checks)
npm run test:dashboard   # dashboard: every region, focus country, function and level (400+ views)
npm run test:ui      # FRONT END + FULL STACK in a headless DOM, every tab x every country, in 3 modes:
                     #   single-file, static hosting with no backend, and full stack over real HTTP
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (branch `main`).
2. Settings, Pages, Source: **GitHub Actions**. Each push runs the tests and publishes `index.html`.
   (Alternative without Actions: Settings, Pages, Source: Deploy from a branch, `main`, `/ (root)`. The root `index.html` works as is.)

## Changes

- 1.3.0: Every result now carries a highlighted "*" note saying whether it is based on encoded local statute, an approximate model, or unverified placeholder rates (Tax, Calculator, Compare, Benefits, Minimum wage, Pay bands). **Tax tab and Calculator no longer produce results from blank input.** Previously a blank Tax gross fell back to a "typical" salary (a placeholder for 100+ countries) and the Calculator was pre-filled with 2,000,000 and auto-ran for every country; now a positive amount is required (API returns 400), nothing runs until the button is pressed, and results clear when an input changes. Calculation fixes: India new-regime 87A marginal relief (no more cliff at â¹12.75L) and surcharge with marginal relief (the note claimed it, the code had none); Australia 2026-27 first bracket 16%; Canada basic personal amount applied as a 14% credit instead of a deduction; "Same pay, different engagement" now shows cost to the engager including agency/onboarding uplift; `calculate` no longer silently defaults to India when `country` is missing; "Extra deductions" and tax regime are India-only and disabled elsewhere; dashboard median is a true median for an even number of values; API returns 400 for invalid JSON.
- 1.2.0: fixed "Failed to fetch" when opening `index.html` directly or on static hosting (automatic fallback to the bundled engine); root `index.html` is now a ready-to-open single file; added backend, dashboard, front-end and full-stack tests; CI runs them all.
- 1.1.0: 2026 dashboard tab (region chart fix), India tax profile fix, Engagement tab, `POST /api/engagement`.
