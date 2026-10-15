const mongoose = require('mongoose');

const fileVersionHistorySchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  file_id: { type: Number, required: true, index: true },
  commit_id: { type: Number, required: true, index: true },
  google_drive_file_id: { type: String, required: true },
  version_number: { type: Number, required: true },
  size: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

fileVersionHistorySchema.index({ file_id: 1, version_number: 1 }, { unique: true });

module.exports = mongoose.models.FileVersionHistory || mongoose.model('FileVersionHistory', fileVersionHistorySchema);
