const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  job_id: { type: Number, required: true, index: true },
  user_id: { type: Number, required: true, index: true },
  user_email: { type: String, required: true },
  user_name: { type: String, default: '' },
  user_role: { type: String, default: 'user' },
  cover_note: { type: String, default: '' },
  portfolio_url: { type: String, default: '' },
  resume_summary: { type: String, default: '' },
  status: { type: String, enum: ['applied', 'under_review', 'interviewing', 'accepted', 'rejected'], default: 'applied' },
  applied_at: { type: Date, default: Date.now }
});

jobApplicationSchema.index({ job_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.models.JobApplication || mongoose.model('JobApplication', jobApplicationSchema);
