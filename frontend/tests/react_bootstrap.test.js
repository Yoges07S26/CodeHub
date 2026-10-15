const fs = require('fs');
const path = require('path');
const assert = require('assert');

const appPath = path.join(__dirname, '..', 'public', 'app.jsx');
const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const source = fs.readFileSync(appPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

assert.ok(/const\s*\{\s*useState\s*,\s*useEffect\s*,\s*useRef\s*\}\s*=\s*React;/.test(source),
  'Expected React hooks to be bound from the global React object.');
assert.ok(/const\s+getStoredUser\s*=\s*\(\)\s*=>\s*\{/.test(source),
  'Expected a persisted-user loader to be present for reload-safe auth state restoration.');
assert.ok(/useEffect\s*\(\s*\(\)\s*=>\s*\{\s*if\s*\(user\s*&&\s*\(currentView\s*===\s*'landing'\s*\|\|\s*currentView\s*===\s*'login'\s*\|\|\s*currentView\s*===\s*'register'\)\)\s*\{\s*setCurrentView\('dashboard'\);\s*\}/s.test(source),
  'Expected the app to redirect restored users back to the dashboard on reload.');
assert.ok(!/import\s+DashboardView\s+from\s+['"]\.\/src\/components\/DashboardView\.jsx['"];?/.test(source),
  'Expected stale browser-import path to be removed.');
assert.ok(/app\.js/.test(html), 'Expected the page to load the precompiled app.js bundle.');

console.log('React bootstrap checks passed.');
