/**
 * Lightweight tests — no extra test framework required.
 * Run: node test/api.test.js  or  npm test
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');

function test(name, fn) {
  try {
    fn();
    console.log('  ✓', name);
  } catch (e) {
    console.error('  ✗', name);
    console.error('   ', e.message);
    process.exitCode = 1;
  }
}

console.log('\nCompensation IQ tests\n');

test('package.json has start script', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts && pkg.scripts.start);
  assert.ok(pkg.dependencies && pkg.dependencies.express);
});

test('public/index.html exists and is non-empty', () => {
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  assert.ok(html.length > 10000);
  assert.ok(html.includes('Compensation'));
});

test('PWA manifest exists', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'public', 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.short_name, 'Comp IQ');
  assert.ok(m.icons && m.icons.length >= 1);
});

test('service worker exists', () => {
  assert.ok(fs.existsSync(path.join(root, 'public', 'sw.js')));
});

test('auth-store loads and verifies default password', () => {
  const auth = require(path.join(root, 'lib', 'auth-store'));
  assert.equal(auth.verifyAdmin('admin123'), true);
  assert.equal(auth.verifyAdmin('wrong'), false);
});

test('markets-data has regions', () => {
  const { MARKETS } = require(path.join(root, 'lib', 'markets-data'));
  assert.ok(MARKETS.length > 5);
  assert.ok(MARKETS.every((m) => m.code && m.region && m.ctc));
});

test('appendLog writes an event', () => {
  const auth = require(path.join(root, 'lib', 'auth-store'));
  const before = auth.loadLog().length;
  const entry = auth.appendLog({
    email: 'test@example.com',
    name: 'Test User',
    event: 'Signed in',
  });
  assert.ok(entry.id);
  assert.ok(auth.loadLog().length >= before);
});

test('getStats returns numbers', () => {
  const auth = require(path.join(root, 'lib', 'auth-store'));
  const s = auth.getStats();
  assert.equal(typeof s.total, 'number');
  assert.equal(typeof s.uniqueUsers, 'number');
});

console.log('\nDone.\n');
