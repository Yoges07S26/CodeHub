const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  appName: 'CodeHub',
  appUrl: process.env.APP_URL || 'http://localhost:8000',
  port: process.env.PORT || 8000,
  jwtSecret: process.env.JWT_SECRET || 'codehub_super_secret_jwt_key_2026_secured!',
  adminDomains: ['codehub.com', 'admin.codehub.io', 'codehub.org'],
  adminWhitelistEmails: ['admin@codehub.com', 'system@codehub.com', 'yoges@codehub.com'],
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codehub',
  googleDrive: {
    storagePath: path.resolve(__dirname, '../../storage/drive_store')
  }
};
