const { execSync } = require('child_process');
const path = require('path');

const esbuildPath = path.resolve(__dirname, 'backend/node_modules/@esbuild/win32-x64/esbuild.exe');
execSync(`"${esbuildPath}" frontend/public/app.jsx --bundle --outfile=frontend/public/app.js --loader:.js=jsx --loader:.jsx=jsx`, { stdio: 'inherit' });
