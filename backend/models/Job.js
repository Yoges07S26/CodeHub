const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  title: { type: String, required: true, trim: true, index: true },
  company: { type: String, required: true, trim: true, index: true },
  location: { type: String, default: 'Remote' },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Remote', 'Internship'], default: 'Full-time' },
  role: { 
    type: String, 
    enum: ['Full Stack', 'Frontend', 'Backend', 'AI / ML Engineer', 'DevOps / Cloud', 'Mobile Developer', 'Cybersecurity', 'UI/UX & Product', 'Engineering Manager', 'Other'],
    default: 'Full Stack',
    index: true 
  },
  experienceLevel: { type: String, enum: ['Entry Level', 'Mid Level', 'Senior', 'Lead / Staff'], default: 'Mid Level' },
  salary: { type: String, default: '$100k - $140k / yr' },
  description: { type: String, required: true },
  requirements: [{ type: String }],
  skills: [{ type: String, index: true }],
  posted_by_user_id: { type: Number, required: true, index: true },
  poster_name: { type: String, default: 'CodeHub Employer' },
  poster_email: { type: String, default: '' },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  applicants_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now, index: true }
});

// Text index for powerful full-text keyword searches
jobSchema.index({
  title: 'text',
  company: 'text',
  description: 'text',
  skills: 'text'
});

module.exports = mongoose.models.Job || mongoose.model('Job', jobSchema);
