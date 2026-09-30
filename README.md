# Global Compensation Intelligence · Compensation IQ 2026

**Live:** https://neerajkapil33.github.io/Global-Compensation-Intelligence/

## One entry file only

| File | Role |
|------|------|
| `index.html` | **Only** app entry (GitHub Pages serves this) |
| `config.js` | Supabase anon key (public) |
| `manifest.webmanifest`, `sw.js`, icons | PWA |

There is **no** second app under `public/` in this deploy package.

## Supabase (required once)

Authentication → URL Configuration:

- Site URL: `https://neerajkapil33.github.io/Global-Compensation-Intelligence/`
- Redirect URLs:
  - `https://neerajkapil33.github.io/Global-Compensation-Intelligence/**`
  - `http://localhost:3000/**`

Enable Google under Authentication → Providers.

## Deploy

Push this folder’s contents to the **root** of `main` on GitHub. Actions deploys Pages automatically.
