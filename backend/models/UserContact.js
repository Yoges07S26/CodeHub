const mongoose = require('mongoose');

const userContactSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  full_name: { type: String, default: '', trim: true },
  mail_id: { type: String, required: true, lowercase: true, trim: true }
}, {
  collection: 'user_contacts',
  versionKey: false
});

userContactSchema.virtual('email')
  .get(function() { return this.mail_id; })
  .set(function(v) { this.mail_id = v; });

module.exports = mongoose.models.UserContact || mongoose.model('UserContact', userContactSchema, 'user_contacts');
