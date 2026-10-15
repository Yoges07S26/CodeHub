const mongoose = require('mongoose');

const repositoryCommitSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  repo_id: { type: Number, required: true, index: true },
  branch_id: { type: Number, required: true, index: true },
  user_id: { type: Number, required: true, index: true },
  commit_message: { type: String, required: true },
  sha_hash: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.RepositoryCommit || mongoose.model('RepositoryCommit', repositoryCommitSchema);
