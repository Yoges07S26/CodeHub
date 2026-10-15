const mongoose = require('mongoose');

const adminAccountActionRequestSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  request_type: { type: String, enum: ['account_deletion', 'data_export'], required: true },
  reason_text: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewed_by_admin_id: { type: Number, default: null },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.AdminAccountActionRequest || mongoose.model('AdminAccountActionRequest', adminAccountActionRequestSchema);
