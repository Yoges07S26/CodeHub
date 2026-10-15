const mongoose = require('mongoose');

const repositoryFileSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  repo_id: { type: Number, required: true, index: true },
  branch_id: { type: Number, required: true, index: true },
  file_path: { type: String, required: true },
  current_google_drive_file_id: { type: String, required: true },
  size: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

repositoryFileSchema.index({ repo_id: 1, branch_id: 1, file_path: 1 }, { unique: true });

module.exports = mongoose.models.RepositoryFile || mongoose.model('RepositoryFile', repositoryFileSchema);
