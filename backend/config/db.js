const mongoose = require('mongoose');
const config = require('./app');

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      autoIndex: true
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to database 'codehub' at ${config.mongoUri} (Visible in MongoDB Compass)`);
    return conn;
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    throw err;
  }
}

module.exports = { connectDB, mongoose };
