# Compensation IQ · 2026

Global compensation intelligence — market pay, employer cost, tax regimes, and statutory context.

## Quick start

```bash
npm install
npm start
```

Open **http://localhost:3000**

| Platform | How |
|----------|-----|
| Desktop | Browser at `localhost:3000` |
| Mobile  | Same URL on phone · Install PWA via “Add to Home Screen” |

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run Express server |
| `npm test` | Run API / unit tests |
| `npm run seed` | Seed a demo sign-in event |

## Project layout

```
.github/workflows/   CI
lib/                 auth-store, markets-data
public/              SPA, PWA (manifest, SW, icons)
test/                automated tests
tools/               helpers
data/                admin + sign-in log (runtime)
server.js
package.json
```

## Admin

- Username: `Admin`
- Password: `admin123`
- Open via ⚙ (bottom-right)

## API

- `GET /api/health`
- `POST /api/events` — `{ email, name, event }`
- `GET /api/events` — header `x-admin-password`
- `GET /api/markets?region=Europe`
- `POST /api/admin/unlock`

## License

UNLICENSED · Planning estimates only — not payroll or legal advice.
