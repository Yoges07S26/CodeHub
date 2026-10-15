const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  google_drive_folder_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Repository || mongoose.model('Repository', repositorySchema);
