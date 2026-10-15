const mongoose = require('mongoose');

const feedPostSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  user_id: { type: Number, required: true, index: true },
  content: { type: String, default: '' },
  image_url: { type: String, default: null },
  code_snippet: { type: String, default: null },
  category: { type: String, default: 'general' },
  likes_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.FeedPost || mongoose.model('FeedPost', feedPostSchema);
