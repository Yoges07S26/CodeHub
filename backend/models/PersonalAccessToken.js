const mongoose = require('mongoose');

const personalAccessTokenSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  last_used_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.PersonalAccessToken || mongoose.model('PersonalAccessToken', personalAccessTokenSchema);
