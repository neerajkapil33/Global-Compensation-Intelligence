# Compensation IQ · Global Compensation Intelligence 2026

**Live:** https://neerajkapil33.github.io/Global-Compensation-Intelligence/

## No duplicate UI files

| Path | Role |
|------|------|
| `public/index.html` | **Only** app entry |
| `public/config.js` | Supabase anon config |
| `public/*` | PWA assets |
| `server.js` | Express (local API) |
| `lib/` | auth-store, markets-data |

GitHub Pages deploys **from `public/`** via Actions (not a second copy at repo root).

## Supabase

- Site URL: `https://neerajkapil33.github.io/Global-Compensation-Intelligence/`
- Redirect: `https://neerajkapil33.github.io/Global-Compensation-Intelligence/**` and `http://localhost:3000/**`
- Enable Google under Authentication → Providers

## Local

```bash
cp .env.example .env
npm install && npm start
```
