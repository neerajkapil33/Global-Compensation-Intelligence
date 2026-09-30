/**
 * Compensation IQ — Express server (desktop + mobile PWA)
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const {
  loadLog,
  appendLog,
  exportCsv,
  verifyAdmin,
  changePassword,
  getStats,
} = require('./lib/auth-store');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'Compensation IQ', year: 2026 });
});

app.post('/api/events', (req, res) => {
  const { email, name, event } = req.body || {};
  if (!email && !name) {
    return res.status(400).json({ error: 'email or name required' });
  }
  const entry = appendLog({
    email: (email || 'guest@compensationiq.app').trim(),
    name: (name || 'Guest user').trim(),
    event: event || 'Signed in',
  });
  res.json({ ok: true, entry });
});

app.get('/api/events', (req, res) => {
  const pw = req.headers['x-admin-password'] || req.query.password;
  if (!verifyAdmin(pw)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const q = (req.query.q || '').toLowerCase();
  let rows = loadLog();
  if (q) {
    rows = rows.filter((r) =>
      (r.email + ' ' + r.name + ' ' + r.event).toLowerCase().includes(q)
    );
  }
  res.json({ ok: true, stats: getStats(), events: rows });
});

app.get('/api/events.csv', (req, res) => {
  const pw = req.headers['x-admin-password'] || req.query.password;
  if (!verifyAdmin(pw)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="signin-log.csv"');
  res.send(exportCsv());
});

app.post('/api/admin/unlock', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'Admin' && verifyAdmin(password)) {
    return res.json({ ok: true, token: password });
  }
  res.status(401).json({ error: 'Invalid username or password' });
});

app.post('/api/admin/password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!verifyAdmin(currentPassword)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }
  if (!newPassword || String(newPassword).length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }
  changePassword(newPassword);
  res.json({ ok: true });
});

app.get('/api/markets', (req, res) => {
  try {
    const data = require('./lib/markets-data');
    const region = req.query.region || 'World';
    const list =
      region === 'World'
        ? data.MARKETS
        : data.MARKETS.filter((m) => m.region === region);
    res.json({ ok: true, region, count: list.length, markets: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('');
  console.log('  Compensation IQ  ·  2026');
  console.log('  -----------------------');
  console.log(`  http://localhost:${PORT}`);
  console.log('  Admin: Admin / admin123');
  console.log('');
});
