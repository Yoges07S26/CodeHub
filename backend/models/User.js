const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, default: '' },
  username: { type: String, default: '' },
  pronouns: { type: String, default: 'he/him' },
  bio: { type: String, default: '' },
  organization: { type: String, default: '' },
  avatar_url: { type: String, default: '' },
  location: { type: String, default: '' },
  website_url: { type: String, default: '' },
  social_instagram: { type: String, default: '' },
  social_email: { type: String, default: '' },
  social_linkedin: { type: String, default: '' },
  social_github: { type: String, default: '' },
  readme_content: { type: String, default: '' },
  tech_stack: [{ type: String }],
  followers_count: { type: Number, default: 0 },
  following_count: { type: Number, default: 1 },
  two_factor_enabled: { type: Boolean, default: false },
  email_notifications: { type: Boolean, default: true },
  security_alerts: { type: Boolean, default: true },
  code_review_notifications: { type: Boolean, default: true },
  theme_preference: { type: String, default: 'system' },
  role_type: { type: String, enum: ['admin', 'user'], default: 'user' },
  email_verified_status: { type: Boolean, default: false },
  verification_token: { type: String, default: null },
  account_status: { type: String, enum: ['active', 'suspended', 'blocked', 'deletion_pending'], default: 'active' },
  last_login_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
