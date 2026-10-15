const User = require('../models/User');
const Repository = require('../models/Repository');
const Branch = require('../models/Branch');
const RepositoryCommit = require('../models/RepositoryCommit');
const RepositoryFile = require('../models/RepositoryFile');
const IssueAndPull = require('../models/IssueAndPull');
const FeedPost = require('../models/FeedPost');
const FeedLike = require('../models/FeedLike');
const AdminSystemActivityLog = require('../models/AdminSystemActivityLog');
const AdminAccountActionRequest = require('../models/AdminAccountActionRequest');

class DashboardController {
  static async userDashboard(req, res) {
    try {
      const user = req.user;

      // Recent repos
      const recentRepos = await Repository.find({ user_id: user.id })
        .sort({ created_at: -1 })
        .limit(6)
        .lean();

      // Enrich repos with counts
      for (const r of recentRepos) {
        r.branch_count = await Branch.countDocuments({ repo_id: r.id });
        r.commit_count = await RepositoryCommit.countDocuments({ repo_id: r.id });
        r.file_count = await RepositoryFile.countDocuments({ repo_id: r.id });
      }

      // Recent activity
      const activity = await AdminSystemActivityLog.find({ user_id: user.id })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      // Counts
      const repoCount = await Repository.countDocuments({ user_id: user.id });
      const commitCount = await RepositoryCommit.countDocuments({ user_id: user.id });
      const issueCount = await IssueAndPull.countDocuments({ creator_id: user.id, type: 'issue' });
      const pullCount = await IssueAndPull.countDocuments({ creator_id: user.id, type: 'pull_request' });
      const feedCount = await FeedPost.countDocuments({ user_id: user.id });

      // Likes received on user's feed posts
      const userPostIds = (await FeedPost.find({ user_id: user.id }, { id: 1 }).lean()).map(p => p.id);
      const likesReceived = await FeedLike.countDocuments({ post_id: { $in: userPostIds } });

      // Storage usage
      const userRepoIds = (await Repository.find({ user_id: user.id }, { id: 1 }).lean()).map(r => r.id);
      const files = await RepositoryFile.find({ repo_id: { $in: userRepoIds } }, { size: 1 }).lean();
      const totalFiles = files.length;
      const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

      // Fresh profile
      const profile = await User.findOne({ id: user.id }).lean();

      res.json({
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || '',
          username: profile.username || '',
          bio: profile.bio || '',
          organization: profile.organization || '',
          avatar_url: profile.avatar_url || '',
          location: profile.location || '',
          website_url: profile.website_url || '',
          two_factor_enabled: !!profile.two_factor_enabled,
          role: profile.role_type,
          is_verified: !!profile.email_verified_status,
          account_status: profile.account_status,
          last_login_at: profile.last_login_at || null,
          created_at: profile.created_at || null
        },
        stats: {
          repositories: repoCount,
          commits: commitCount,
          issues: issueCount,
          pull_requests: pullCount,
          feed_posts: feedCount,
          likes_received: likesReceived,
          files_stored: totalFiles,
          storage_bytes: totalSize
        },
        recent_repos: recentRepos,
        activity: activity.map(a => ({
          action_type: a.action_type,
          description: a.description,
          timestamp: a.timestamp
        }))
      });
    } catch (err) {
      console.error('[User Dashboard Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  static async adminDashboard(req, res) {
    try {
      const adminUser = req.user;

      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ account_status: 'active' });
      const verifiedUsers = await User.countDocuments({ email_verified_status: true });
      const unverifiedUsers = await User.countDocuments({ email_verified_status: false });
      const totalRepos = await Repository.countDocuments();
      const publicRepos = await Repository.countDocuments({ visibility: 'public' });
      const privateRepos = await Repository.countDocuments({ visibility: 'private' });
      const totalCommits = await RepositoryCommit.countDocuments();
      const totalFiles = await RepositoryFile.countDocuments();
      const totalFeedPosts = await FeedPost.countDocuments();
      const pendingDeletions = await AdminAccountActionRequest.countDocuments({ status: 'pending' });

      // Recent system logs with actor email
      const recentLogsRaw = await AdminSystemActivityLog.find()
        .sort({ timestamp: -1 })
        .limit(15)
        .lean();

      const userMap = {};
      const users = await User.find({}, { id: 1, email: 1 }).lean();
      users.forEach(u => { userMap[u.id] = u.email; });

      const recentLogs = recentLogsRaw.map(l => ({
        action_type: l.action_type,
        description: l.description,
        timestamp: l.timestamp,
        actor_email: userMap[l.user_id] || `User #${l.user_id}`
      }));

      // Recent users
      const recentUsers = await User.find()
        .sort({ created_at: -1 })
        .limit(6)
        .lean();

      res.json({
        success: true,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.full_name || '',
          username: adminUser.username || '',
          bio: adminUser.bio || '',
          organization: adminUser.organization || '',
          avatar_url: adminUser.avatar_url || '',
          role: adminUser.role_type,
          is_verified: !!adminUser.email_verified_status,
          account_status: adminUser.account_status,
          created_at: adminUser.created_at || null
        },
        stats: {
          total_users: totalUsers,
          active_users: activeUsers,
          verified_users: verifiedUsers,
          unverified_users: unverifiedUsers,
          total_repositories: totalRepos,
          public_repositories: publicRepos,
          private_repositories: privateRepos,
          total_commits: totalCommits,
          total_files: totalFiles,
          total_feed_posts: totalFeedPosts,
          pending_deletions: pendingDeletions
        },
        recent_logs: recentLogs,
        recent_users: recentUsers
      });
    } catch (err) {
      console.error('[Admin Dashboard Error]', err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = DashboardController;
