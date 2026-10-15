const mongoose = require('mongoose');

const feedLikeSchema = new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  post_id: { type: Number, required: true, index: true },
  user_id: { type: Number, required: true, index: true },
  created_at: { type: Date, default: Date.now }
});

feedLikeSchema.index({ post_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.models.FeedLike || mongoose.model('FeedLike', feedLikeSchema);
