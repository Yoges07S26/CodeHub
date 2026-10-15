const mongoose = require('mongoose');

const adminSystemActivityLogSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  repo_id: { type: Number, default: null, index: true },
  action_type: { type: String, required: true },
  description: { type: String, required: true },
  ip_address: { type: String, default: '127.0.0.1' },
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.models.AdminSystemActivityLog || mongoose.model('AdminSystemActivityLog', adminSystemActivityLogSchema);
