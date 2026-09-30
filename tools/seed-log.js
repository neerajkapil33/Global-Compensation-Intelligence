const { appendLog, loadLog } = require('../lib/auth-store');
console.log('Events before:', loadLog().length);
appendLog({ email: 'demo@compensationiq.app', name: 'Demo User', event: 'Registered' });
console.log('Events after:', loadLog().length);
