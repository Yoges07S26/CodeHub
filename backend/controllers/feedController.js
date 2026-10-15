const FeedPost = require('../models/FeedPost');
const FeedLike = require('../models/FeedLike');
const User = require('../models/User');
const { getNextSequence } = require('../models/Counter');
const ActivityLogger = require('../services/activityLogger');
const { authenticate } = require('../middleware/authMiddleware');

class FeedController {
  // GET /api/feed - list all posts with user_has_liked
  static async index(req, res) {
    try {
      // Optionally authenticate (non-required)
      let currentUser = null;
      try {
        currentUser = await authenticate(req);
      } catch (_) { /* guest */ }

      const userId = currentUser ? currentUser.id : 0;

      const posts = await FeedPost.find().sort({ created_at: -1 }).limit(50).lean();

      // Collect user IDs and post IDs
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const postIds = posts.map(p => p.id);

      // Fetch users in one query
      const users = await User.find({ id: { $in: userIds } }).lean();
      const userMap = {};
      for (const u of users) {
        userMap[u.id] = u;
      }

      // Fetch user's likes in one query
      let likedPostIds = new Set();
      if (userId) {
        const likes = await FeedLike.find({ user_id: userId, post_id: { $in: postIds } }).lean();
        likedPostIds = new Set(likes.map(l => l.post_id));
      }

      const formatted = posts.map(p => {
        const u = userMap[p.user_id] || {};
        return {
          id: p.id,
          user_id: p.user_id,
          content: p.content,
          image_url: p.image_url,
          code_snippet: p.code_snippet,
          category: p.category,
          likes_count: p.likes_count || 0,
          created_at: p.created_at,
          email: u.email || '',
          full_name: u.full_name || '',
          username: u.username || '',
          avatar_url: u.avatar_url || '',
          role_type: u.role_type || 'user',
          user_has_liked: likedPostIds.has(p.id)
        };
      });

      res.json({ success: true, posts: formatted });
    } catch (err) {
      console.error('[Feed Index Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/feed - create new post
  static async create(req, res) {
    try {
      const user = req.user;
      const input = req.body || {};
      const content = (input.content || '').trim();
      const imageUrl = (input.image_url || '').trim();
      const codeSnippet = (input.code_snippet || '').trim();
      const category = (input.category || 'general').trim();

      if (!content && !imageUrl && !codeSnippet) {
        return res.status(422).json({ error: 'Please provide content, an image, or a code snippet for your post.' });
      }

      const postId = await getNextSequence('feed_posts');
      const post = await FeedPost.create({
        id: postId,
        user_id: user.id,
        content,
        image_url: imageUrl || null,
        code_snippet: codeSnippet || null,
        category,
        likes_count: 0,
        created_at: new Date()
      });

      await ActivityLogger.log(user.id, null, 'FEED_POST_CREATED', `User shared a new post to the community feed (#${postId})`, req);

      res.status(201).json({
        success: true,
        message: 'Post published to feed successfully!',
        post: {
          id: postId,
          user_id: user.id,
          content,
          image_url: imageUrl || null,
          code_snippet: codeSnippet || null,
          category,
          likes_count: 0,
          created_at: post.created_at,
          email: user.email || '',
          full_name: user.full_name || '',
          username: user.username || '',
          avatar_url: user.avatar_url || '',
          role_type: user.role_type || 'user',
          user_has_liked: false
        }
      });
    } catch (err) {
      console.error('[Feed Create Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/feed/:id/like - toggle like/unlike
  static async toggleLike(req, res) {
    try {
      const user = req.user;
      const postId = parseInt(req.params.id, 10);

      const existing = await FeedLike.findOne({ post_id: postId, user_id: user.id });
      let liked;

      if (existing) {
        // Unlike
        await FeedLike.deleteOne({ _id: existing._id });
        await FeedPost.updateOne({ id: postId }, { $inc: { likes_count: -1 } });
        // Ensure count doesn't go below 0
        await FeedPost.updateOne({ id: postId, likes_count: { $lt: 0 } }, { $set: { likes_count: 0 } });
        liked = false;
      } else {
        // Like
        const likeId = await getNextSequence('feed_likes');
        await FeedLike.create({
          id: likeId,
          post_id: postId,
          user_id: user.id,
          created_at: new Date()
        });
        await FeedPost.updateOne({ id: postId }, { $inc: { likes_count: 1 } });
        liked = true;
      }

      const updatedPost = await FeedPost.findOne({ id: postId }).lean();
      const newCount = updatedPost ? updatedPost.likes_count : 0;

      res.json({ success: true, liked, likes_count: newCount });
    } catch (err) {
      console.error('[Feed ToggleLike Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/feed/:id - delete a post
  static async delete(req, res) {
    try {
      const user = req.user;
      const postId = parseInt(req.params.id, 10);

      const post = await FeedPost.findOne({ id: postId }).lean();
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      // Only author or admin can delete
      if (user.role_type !== 'admin' && post.user_id !== user.id) {
        return res.status(403).json({ error: 'Unauthorized: Only author or admin can delete this post.' });
      }

      await FeedPost.deleteOne({ id: postId });
      // Clean up likes for this post
      await FeedLike.deleteMany({ post_id: postId });

      await ActivityLogger.log(user.id, null, 'FEED_POST_DELETED', `Post #${postId} was deleted.`, req);

      res.json({ success: true, message: 'Post deleted successfully.' });
    } catch (err) {
      console.error('[Feed Delete Error]', err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = FeedController;
