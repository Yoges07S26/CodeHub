const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  repo_id: { type: Number, required: true, index: true },
  branch_name: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

branchSchema.index({ repo_id: 1, branch_name: 1 }, { unique: true });

module.exports = mongoose.models.Branch || mongoose.model('Branch', branchSchema);
