const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(DATA_DIR, 'signin-log.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(AUTH_FILE)) {
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({ password: 'admin123' }, null, 2)
    );
  }
  if (!fs.existsSync(LOG_FILE)) {
    const seed = [
      {
        id: 'seed-1',
        date: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        time: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        ts: Date.now(),
        email: 'tenzingtinlay@gmail.com',
        name: 'Tenzing Tinlay',
        event: 'Registered',
      },
    ];
    fs.writeFileSync(LOG_FILE, JSON.stringify(seed, null, 2));
  }
}

function loadLog() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLog(rows) {
  ensureDataDir();
  fs.writeFileSync(LOG_FILE, JSON.stringify(rows.slice(0, 1000), null, 2));
}

function appendLog({ email, name, event }) {
  const now = new Date();
  const entry = {
    id: now.getTime() + '-' + Math.random().toString(36).slice(2, 7),
    date: now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    ts: now.getTime(),
    email,
    name,
    event: event || 'Signed in',
  };
  const list = loadLog();
  list.unshift(entry);
  saveLog(list);
  return entry;
}

function exportCsv() {
  const rows = loadLog();
  const header = 'Date,Time,Email,Name,Event\n';
  const body = rows
    .map((r) =>
      [r.date, r.time, r.email, r.name, r.event]
        .map((x) => '"' + String(x).replace(/"/g, '""') + '"')
        .join(',')
    )
    .join('\n');
  return header + body;
}

function getAdminPassword() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')).password || 'admin123';
  } catch {
    return 'admin123';
  }
}

function verifyAdmin(password) {
  return String(password || '') === getAdminPassword();
}

function changePassword(newPassword) {
  ensureDataDir();
  fs.writeFileSync(
    AUTH_FILE,
    JSON.stringify({ password: String(newPassword) }, null, 2)
  );
}

function getStats() {
  const rows = loadLog();
  const unique = new Set(rows.map((r) => (r.email || '').toLowerCase())).size;
  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const today = rows.filter((r) => r.date === todayStr).length;
  return { total: rows.length, uniqueUsers: unique, today };
}

module.exports = {
  loadLog,
  appendLog,
  exportCsv,
  verifyAdmin,
  changePassword,
  getStats,
};
