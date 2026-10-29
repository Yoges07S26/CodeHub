const crypto = require('crypto');
const Repository = require('../models/Repository');
const Branch = require('../models/Branch');
const RepositoryCommit = require('../models/RepositoryCommit');
const RepositoryFile = require('../models/RepositoryFile');
const FileVersionHistory = require('../models/FileVersionHistory');
const User = require('../models/User');
const { getNextSequence } = require('../models/Counter');
const GoogleDriveService = require('../services/googleDriveService');
const ActivityLogger = require('../services/activityLogger');
const { authenticate } = require('../middleware/authMiddleware');

class RepositoryController {
  static async index(req, res) {
    try {
      const user = await authenticate(req);
      let repos = [];

      if (user && user.role_type === 'admin') {
        // Admin manages ALL repositories on CodeHub
        repos = await Repository.find().sort({ created_at: -1 }).lean();
      } else if (user) {
        repos = await Repository.find({
          $or: [{ user_id: user.id }, { visibility: 'public' }]
        }).sort({ created_at: -1 }).lean();
      } else {
        repos = await Repository.find({ visibility: 'public' })
          .sort({ created_at: -1 }).lean();
      }

      // Fetch owner emails, branch counts, commit counts, and repository sizes in parallel batches
      const userIds = [...new Set(repos.map(r => r.user_id))];
      const repoIds = repos.map(r => r.id);

      const [users, branchCounts, commitCounts, repoSizes] = await Promise.all([
        User.find({ id: { $in: userIds } }, { id: 1, email: 1, username: 1, full_name: 1 }).lean(),
        Branch.aggregate([
          { $match: { repo_id: { $in: repoIds } } },
          { $group: { _id: '$repo_id', count: { $sum: 1 } } }
        ]),
        RepositoryCommit.aggregate([
          { $match: { repo_id: { $in: repoIds } } },
          { $group: { _id: '$repo_id', count: { $sum: 1 } } }
        ]),
        RepositoryFile.aggregate([
          { $match: { repo_id: { $in: repoIds } } },
          { $group: { _id: '$repo_id', total_size: { $sum: '$size' }, file_count: { $sum: 1 } } }
        ])
      ]);

      const userMap = {};
      users.forEach(u => { userMap[u.id] = u.username || u.full_name || u.email; });
      const branchMap = {};
      branchCounts.forEach(b => { branchMap[b._id] = b.count; });
      const commitMap = {};
      commitCounts.forEach(c => { commitMap[c._id] = c.count; });
      const sizeMap = {};
      const fileCountMap = {};
      repoSizes.forEach(s => {
        sizeMap[s._id] = s.total_size || 0;
        fileCountMap[s._id] = s.file_count || 0;
      });

      for (const r of repos) {
        r.owner_email = userMap[r.user_id] || '';
        r.owner_name = userMap[r.user_id] || 'Developer';
        r.branch_count = branchMap[r.id] || 0;
        r.commit_count = commitMap[r.id] || 0;
        r.size_bytes = sizeMap[r.id] || 0;
        r.file_count = fileCountMap[r.id] || 0;
      }

      res.json({ success: true, repositories: repos });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const user = req.user;
      if (user.role_type === 'admin') {
        return res.status(403).json({ error: 'Admins are not permitted to create repositories.' });
      }

      const input = req.body || {};
      const name = (input.name || '').trim();
      const description = (input.description || '').trim();
      const visibility = (input.visibility || 'public') === 'private' ? 'private' : 'public';

      if (!name || !/^[a-zA-Z0-9_\-\.]+$/.test(name)) {
        return res.status(422).json({ error: 'Repository name can only contain letters, numbers, hyphens, dots, and underscores.' });
      }

      const existing = await Repository.findOne({ user_id: user.id, name });
      if (existing) {
        return res.status(409).json({ error: `You already have a repository named ${name}` });
      }

      const drive = new GoogleDriveService();
      const driveFolderId = drive.createRepositoryFolder(name, user.id);

      const repoId = await getNextSequence('repositories');
      await Repository.create({
        id: repoId,
        user_id: user.id,
        name,
        description,
        visibility,
        google_drive_folder_id: driveFolderId,
        created_at: new Date()
      });

      const branchId = await getNextSequence('branches');
      await Branch.create({
        id: branchId,
        repo_id: repoId,
        branch_name: 'main',
        created_at: new Date()
      });

      const readmeContent = `# ${name}\n\n${description}\n\nCreated on CodeHub.`;
      const driveFile = drive.uploadFile(driveFolderId, 'README.md', readmeContent);

      const sha = crypto.createHash('sha1').update(`${Date.now()}${name}main`).digest('hex');
      const commitId = await getNextSequence('repository_commits');
      await RepositoryCommit.create({
        id: commitId,
        repo_id: repoId,
        branch_id: branchId,
        user_id: user.id,
        commit_message: 'Initial commit with README.md',
        sha_hash: sha,
        created_at: new Date()
      });

      const fileId = await getNextSequence('repository_files');
      await RepositoryFile.create({
        id: fileId,
        repo_id: repoId,
        branch_id: branchId,
        file_path: 'README.md',
        current_google_drive_file_id: driveFile.file_id,
        size: driveFile.size,
        created_at: new Date(),
        updated_at: new Date()
      });

      const versionId = await getNextSequence('file_version_history');
      await FileVersionHistory.create({
        id: versionId,
        file_id: fileId,
        commit_id: commitId,
        google_drive_file_id: driveFile.file_id,
        version_number: 1,
        size: driveFile.size,
        created_at: new Date()
      });

      await ActivityLogger.log(user.id, repoId, 'REPO_CREATED', `Repository '${name}' created.`, req);

      res.status(201).json({
        success: true,
        message: 'Repository created successfully.',
        repository_id: repoId,
        name
      });
    } catch (err) {
      console.error('[Create Repo Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  static async show(req, res) {
    try {
      const repoId = Number(req.params.id);
      const user = await authenticate(req);

      const repo = await Repository.findOne({ id: repoId }).lean();
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found.' });
      }

      if (repo.visibility === 'private') {
        if (!user || (user.role_type !== 'admin' && repo.user_id !== user.id)) {
          return res.status(403).json({ error: 'Access Denied: This repository is private.' });
        }
      }

      const [owner, branches, totalCommits, repoFiles] = await Promise.all([
        User.findOne({ id: repo.user_id }, { email: 1 }).lean(),
        Branch.find({ repo_id: repoId }).sort({ id: 1 }).lean(),
        RepositoryCommit.countDocuments({ repo_id: repoId }),
        RepositoryFile.find({ repo_id: repoId }, { size: 1 }).lean()
      ]);
      repo.owner_email = owner ? owner.email : '';
      repo.size_bytes = repoFiles.reduce((acc, f) => acc + (f.size || 0), 0);
      repo.file_count = repoFiles.length;

      res.json({
        success: true,
        repository: repo,
        branches,
        total_commits: totalCommits,
        is_owner: user ? (repo.user_id === user.id) : false,
        is_admin: user ? (user.role_type === 'admin') : false
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async delete(req, res) {
    try {
      const repoId = Number(req.params.id);
      const user = req.user;

      const repo = await Repository.findOne({ id: repoId });
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found.' });
      }

      if (user.role_type !== 'admin' && repo.user_id !== user.id) {
        return res.status(403).json({ error: 'Unauthorized: Only repository owner or administrator can delete this repository.' });
      }

      const drive = new GoogleDriveService();
      drive.deleteRepositoryFolder(repo.google_drive_folder_id);

      await Repository.deleteOne({ id: repoId });
      await Branch.deleteMany({ repo_id: repoId });
      await RepositoryCommit.deleteMany({ repo_id: repoId });
      await RepositoryFile.deleteMany({ repo_id: repoId });

      await ActivityLogger.log(user.id, null, 'REPO_DELETED', `Repository '${repo.name}' (ID: ${repoId}) deleted.`, req);

      res.json({
        success: true,
        message: `Repository '${repo.name}' and all associated assets were permanently deleted.`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateVisibility(req, res) {
    try {
      const repoId = Number(req.params.id);
      const user = req.user;
      const { visibility } = req.body || {};

      if (!['public', 'private'].includes(visibility)) {
        return res.status(422).json({ error: 'Visibility must be "public" or "private".' });
      }

      const repo = await Repository.findOne({ id: repoId });
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found.' });
      }

      if (user.role_type !== 'admin' && repo.user_id !== user.id) {
        return res.status(403).json({ error: 'Unauthorized: Only repository owner or administrator can modify visibility.' });
      }

      repo.visibility = visibility;
      await repo.save();

      await ActivityLogger.log(user.id, repoId, 'REPO_VISIBILITY_UPDATED', `Repository '${repo.name}' visibility updated to ${visibility}`, req);

      res.json({
        success: true,
        message: `Repository '${repo.name}' is now ${visibility.toUpperCase()}.`,
        repository: repo.toObject()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getBranches(req, res) {
    try {
      const repoId = Number(req.params.id);
      const branches = await Branch.find({ repo_id: repoId }).sort({ id: 1 }).lean();
      res.json({ success: true, branches });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createBranch(req, res) {
    try {
      const repoId = Number(req.params.id);
      const user = req.user;
      const input = req.body || {};
      const branchName = (input.branch_name || '').trim();
      const fromBranchId = Number(input.from_branch_id || 0);

      if (!branchName || !/^[a-zA-Z0-9_\-\.\/]+$/.test(branchName)) {
        return res.status(422).json({ error: 'Invalid branch name format.' });
      }

      const repo = await Repository.findOne({ id: repoId }).lean();
      if (!repo || (user.role_type !== 'admin' && repo.user_id !== user.id)) {
        return res.status(403).json({ error: 'Unauthorized branch modification.' });
      }

      const existing = await Branch.findOne({ repo_id: repoId, branch_name: branchName });
      if (existing) {
        return res.status(409).json({ error: 'Branch name already exists in this repository.' });
      }

      const newBranchId = await getNextSequence('branches');
      await Branch.create({
        id: newBranchId,
        repo_id: repoId,
        branch_name: branchName,
        created_at: new Date()
      });

      if (fromBranchId > 0) {
        const sourceFiles = await RepositoryFile.find({ repo_id: repoId, branch_id: fromBranchId }).lean();
        for (const sf of sourceFiles) {
          const newFileId = await getNextSequence('repository_files');
          await RepositoryFile.create({
            id: newFileId,
            repo_id: repoId,
            branch_id: newBranchId,
            file_path: sf.file_path,
            current_google_drive_file_id: sf.current_google_drive_file_id,
            size: sf.size,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      await ActivityLogger.log(user.id, repoId, 'BRANCH_CREATED', `Created branch '${branchName}' in repository ${repo.name}`, req);

      res.status(201).json({
        success: true,
        message: `Branch '${branchName}' created successfully.`,
        branch_id: newBranchId
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = RepositoryController;
