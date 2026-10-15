const User = require('../models/User');
const Repository = require('../models/Repository');
const RepositoryCommit = require('../models/RepositoryCommit');
const RepositoryFile = require('../models/RepositoryFile');
const AdminAccountActionRequest = require('../models/AdminAccountActionRequest');
const AdminSystemActivityLog = require('../models/AdminSystemActivityLog');
const GoogleDriveService = require('../services/googleDriveService');
const ActivityLogger = require('../services/activityLogger');

class AdminController {
  static async dashboardMetrics(req, res) {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ account_status: 'active' });
      const unverifiedUsers = await User.countDocuments({ email_verified_status: false });
      const totalRepos = await Repository.countDocuments();
      const publicRepos = await Repository.countDocuments({ visibility: 'public' });
      const totalCommits = await RepositoryCommit.countDocuments();
      const totalFiles = await RepositoryFile.countDocuments();

      const files = await RepositoryFile.find({}, { size: 1 }).lean();
      const aggregateSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
      const pendingDeletions = await AdminAccountActionRequest.countDocuments({ status: 'pending' });

      res.json({
        success: true,
        metrics: {
          total_users: totalUsers,
          active_users: activeUsers,
          unverified_users: unverifiedUsers,
          total_repositories: totalRepos,
          public_repositories: publicRepos,
          total_commits: totalCommits,
          total_files: totalFiles,
          aggregate_size_bytes: aggregateSize,
          pending_deletions: pendingDeletions
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async listUsers(req, res) {
    try {
      const users = await User.find().sort({ id: -1 }).lean();

      for (const u of users) {
        u.repo_count = await Repository.countDocuments({ user_id: u.id });
      }

      res.json({ success: true, users });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateUserStatus(req, res) {
    try {
      const admin = req.user;
      const userId = Number(req.params.id);
      const input = req.body || {};
      const newStatus = input.status;
      const newRole = input.role;

      const user = await User.findOne({ id: userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }

      if (newStatus && ['active', 'suspended', 'blocked', 'deletion_pending'].includes(newStatus)) {
        user.account_status = newStatus;
        await ActivityLogger.log(
          admin.id,
          null,
          'ADMIN_ACCOUNT_STATUS_CHANGE',
          `Admin changed user #${userId} status to ${newStatus}`,
          req
        );
      }

      if (newRole && ['admin', 'user'].includes(newRole)) {
        user.role_type = newRole;
        await ActivityLogger.log(
          admin.id,
          null,
          'ADMIN_ROLE_CHANGE',
          `Admin set user #${userId} role to ${newRole}`,
          req
        );
      }

      await user.save();

      res.json({ success: true, message: 'User parameters updated successfully.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async listActionRequests(req, res) {
    try {
      const requests = await AdminAccountActionRequest.find().sort({ created_at: -1 }).lean();

      const userIds = [...new Set(requests.map(r => r.user_id).concat(requests.map(r => r.reviewed_by_admin_id).filter(Boolean)))];
      const users = await User.find({ id: { $in: userIds } }, { id: 1, email: 1 }).lean();
      const userMap = {};
      users.forEach(u => { userMap[u.id] = u.email; });

      requests.forEach(r => {
        r.user_email = userMap[r.user_id] || '';
        r.reviewer_email = userMap[r.reviewed_by_admin_id] || null;
      });

      res.json({ success: true, requests });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async processActionRequest(req, res) {
    try {
      const admin = req.user;
      const requestId = Number(req.params.id);
      const input = req.body || {};
      const action = input.action || 'rejected';

      const request = await AdminAccountActionRequest.findOne({ id: requestId });
      if (!request) {
        return res.status(404).json({ error: 'Request not found.' });
      }

      const targetUserId = request.user_id;

      if (action === 'approved') {
        const drive = new GoogleDriveService();
        const repos = await Repository.find({ user_id: targetUserId }).lean();
        for (const r of repos) {
          if (r.google_drive_folder_id) {
            drive.deleteRepositoryFolder(r.google_drive_folder_id);
          }
        }

        await ActivityLogger.log(
          admin.id,
          null,
          'ADMIN_USER_PURGED',
          `Admin approved request #${requestId} and permanently deleted user #${targetUserId}.`,
          req
        );

        await User.deleteOne({ id: targetUserId });
        await Repository.deleteMany({ user_id: targetUserId });
        request.status = 'approved';
        request.reviewed_by_admin_id = admin.id;
        await request.save();

        res.json({
          success: true,
          message: `User #${targetUserId} and all associated assets were permanently purged.`
        });
      } else {
        request.status = 'rejected';
        request.reviewed_by_admin_id = admin.id;
        await request.save();

        await User.updateOne({ id: targetUserId }, { account_status: 'active' });

        await ActivityLogger.log(
          admin.id,
          null,
          'ADMIN_REQUEST_REJECTED',
          `Admin rejected account action request #${requestId}`,
          req
        );

        res.json({
          success: true,
          message: 'Deletion request was rejected. User restored to active status.'
        });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async activityLogs(req, res) {
    try {
      const limit = Number(req.query.limit || 100);
      const logs = await AdminSystemActivityLog.find().sort({ timestamp: -1 }).limit(limit).lean();

      const userIds = [...new Set(logs.map(l => l.user_id))];
      const repoIds = [...new Set(logs.map(l => l.repo_id).filter(Boolean))];

      const users = await User.find({ id: { $in: userIds } }, { id: 1, email: 1 }).lean();
      const userMap = {};
      users.forEach(u => { userMap[u.id] = u.email; });

      const repos = await Repository.find({ id: { $in: repoIds } }, { id: 1, name: 1 }).lean();
      const repoMap = {};
      repos.forEach(r => { repoMap[r.id] = r.name; });

      logs.forEach(l => {
        l.actor_email = userMap[l.user_id] || '';
        l.repo_name = repoMap[l.repo_id] || null;
      });

      res.json({ success: true, logs });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = AdminController;
