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

      // Execute primary queries concurrently in parallel
      const [recentRepos, activity, repoCount, commitCount, issueCount, pullCount, feedCount, userPostIds, userRepoIds, profile] = await Promise.all([
        Repository.find({ user_id: user.id }).sort({ created_at: -1 }).limit(6).lean(),
        AdminSystemActivityLog.find({ user_id: user.id }).sort({ timestamp: -1 }).limit(10).lean(),
        Repository.countDocuments({ user_id: user.id }),
        RepositoryCommit.countDocuments({ user_id: user.id }),
        IssueAndPull.countDocuments({ creator_id: user.id, type: 'issue' }),
        IssueAndPull.countDocuments({ creator_id: user.id, type: 'pull_request' }),
        FeedPost.countDocuments({ user_id: user.id }),
        FeedPost.find({ user_id: user.id }, { id: 1 }).lean().then(posts => posts.map(p => p.id)),
        Repository.find({ user_id: user.id }, { id: 1 }).lean().then(repos => repos.map(r => r.id)),
        User.findOne({ id: user.id }).lean()
      ]);

      // Enrich recentRepos and secondary metrics in parallel batch
      const recentRepoIds = recentRepos.map(r => r.id);
      const [likesReceived, files, branchCounts, commitCounts, fileCounts, repoSizes] = await Promise.all([
        FeedLike.countDocuments({ post_id: { $in: userPostIds } }),
        RepositoryFile.find({ repo_id: { $in: userRepoIds } }, { size: 1 }).lean(),
        Branch.aggregate([{ $match: { repo_id: { $in: recentRepoIds } } }, { $group: { _id: '$repo_id', count: { $sum: 1 } } }]),
        RepositoryCommit.aggregate([{ $match: { repo_id: { $in: recentRepoIds } } }, { $group: { _id: '$repo_id', count: { $sum: 1 } } }]),
        RepositoryFile.aggregate([{ $match: { repo_id: { $in: recentRepoIds } } }, { $group: { _id: '$repo_id', count: { $sum: 1 } } }]),
        RepositoryFile.aggregate([{ $match: { repo_id: { $in: recentRepoIds } } }, { $group: { _id: '$repo_id', total_size: { $sum: '$size' } } }])
      ]);

      const branchMap = {}; branchCounts.forEach(b => { branchMap[b._id] = b.count; });
      const commitMap = {}; commitCounts.forEach(c => { commitMap[c._id] = c.count; });
      const fileMap = {}; fileCounts.forEach(f => { fileMap[f._id] = f.count; });
      const sizeMap = {}; repoSizes.forEach(s => { sizeMap[s._id] = s.total_size || 0; });

      for (const r of recentRepos) {
        r.branch_count = branchMap[r.id] || 0;
        r.commit_count = commitMap[r.id] || 0;
        r.file_count = fileMap[r.id] || 0;
        r.size_bytes = sizeMap[r.id] || 0;
      }

      const totalFiles = files.length;
      const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

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

      // Execute all metrics and lookups in parallel
      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        unverifiedUsers,
        totalRepos,
        publicRepos,
        privateRepos,
        totalCommits,
        totalFiles,
        allFiles,
        totalFeedPosts,
        pendingDeletions,
        recentLogsRaw,
        users,
        recentUsers
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ account_status: 'active' }),
        User.countDocuments({ email_verified_status: true }),
        User.countDocuments({ email_verified_status: false }),
        Repository.countDocuments(),
        Repository.countDocuments({ visibility: 'public' }),
        Repository.countDocuments({ visibility: 'private' }),
        RepositoryCommit.countDocuments(),
        RepositoryFile.countDocuments(),
        RepositoryFile.find({}, { size: 1 }).lean(),
        FeedPost.countDocuments(),
        AdminAccountActionRequest.countDocuments({ status: 'pending' }),
        AdminSystemActivityLog.find().sort({ timestamp: -1 }).limit(15).lean(),
        User.find({}, { id: 1, email: 1 }).lean(),
        User.find().sort({ created_at: -1 }).limit(6).lean()
      ]);

      const totalSize = (allFiles || []).reduce((acc, f) => acc + (f.size || 0), 0);

      const userMap = {};
      users.forEach(u => { userMap[u.id] = u.email; });

      const recentLogs = recentLogsRaw.map(l => ({
        action_type: l.action_type,
        description: l.description,
        timestamp: l.timestamp,
        actor_email: userMap[l.user_id] || `User #${l.user_id}`
      }));

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
          files_stored: totalFiles,
          storage_bytes: totalSize,
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
