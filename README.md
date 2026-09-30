# Compensation IQ · Global Compensation Intelligence 2026

**Live:** https://neerajkapil33.github.io/Global-Compensation-Intelligence/

## Single app entry (no duplicates)

| File | Role |
|------|------|
| `index.html` | **Only** SPA entry |
| `config.js` | Supabase public config |
| `server.js` | Express API + static |
| `lib/` | auth-store, markets-data |

## Supabase

- Site URL: `https://neerajkapil33.github.io/Global-Compensation-Intelligence/`
- Redirect URLs: that URL `/**` and `http://localhost:3000/**`
- Enable Google under Authentication → Providers

## Local

```bash
cp .env.example .env
npm install && npm start
```

## GitHub Pages

Repo → Settings → Pages → Deploy from branch → `main` / `/ (root)`.
