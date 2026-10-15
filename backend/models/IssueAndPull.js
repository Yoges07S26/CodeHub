const mongoose = require('mongoose');

const issueAndPullSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  repo_id: { type: Number, required: true, index: true },
  creator_id: { type: Number, required: true, index: true },
  type: { type: String, enum: ['issue', 'pull_request'], required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['open', 'closed', 'merged'], default: 'open' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.IssueAndPull || mongoose.model('IssueAndPull', issueAndPullSchema);
