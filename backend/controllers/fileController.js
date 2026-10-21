const path = require('path');
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

class FileController {
  static async listFiles(req, res) {
    try {
      const repoId = Number(req.params.id);
      let branchId = Number(req.query.branch_id || 0);

      if (branchId === 0) {
        const firstBranch = await Branch.findOne({ repo_id: repoId }).sort({ id: 1 }).lean();
        branchId = firstBranch ? firstBranch.id : 0;
      }

      const files = await RepositoryFile.find({ repo_id: repoId, branch_id: branchId })
        .sort({ file_path: 1 })
        .lean();

      const fileIds = files.map(f => f.id);
      const versionCounts = await FileVersionHistory.aggregate([
        { $match: { file_id: { $in: fileIds } } },
        { $group: { _id: '$file_id', count: { $sum: 1 } } }
      ]);
      const versionMap = {};
      versionCounts.forEach(v => { versionMap[v._id] = v.count; });

      for (const f of files) {
        f.version_count = versionMap[f.id] || 0;
      }

      res.json({
        success: true,
        branch_id: branchId,
        files
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getFileContent(req, res) {
    try {
      const repoId = Number(req.params.id);
      const fileId = Number(req.params.fileId);

      const [file, repo] = await Promise.all([
        RepositoryFile.findOne({ id: fileId, repo_id: repoId }).lean(),
        Repository.findOne({ id: repoId }).lean()
      ]);

      if (!file) {
        return res.status(404).json({ error: 'File not found.' });
      }
      if (!repo) {
        return res.status(404).json({ error: 'Repository not found.' });
      }

      if (repo.visibility === 'private') {
        const user = await authenticate(req);
        if (!user || (user.role_type !== 'admin' && repo.user_id !== user.id)) {
          return res.status(403).json({ error: 'Unauthorized to view this file.' });
        }
      }

      const drive = new GoogleDriveService();
      const content = drive.getFileContent(repo.google_drive_folder_id, file.current_google_drive_file_id);

      const historyRaw = await FileVersionHistory.find({ file_id: fileId })
        .sort({ version_number: -1 })
        .lean();

      // Fetch commit details for each history version
      const commitIds = historyRaw.map(h => h.commit_id);
      const commits = await RepositoryCommit.find({ id: { $in: commitIds } }).lean();
      const commitMap = {};
      const userIds = [...new Set(commits.map(c => c.user_id))];
      const users = await User.find({ id: { $in: userIds } }, { id: 1, email: 1 }).lean();
      const userMap = {};
      users.forEach(u => { userMap[u.id] = u.email; });

      commits.forEach(c => {
        commitMap[c.id] = {
          commit_message: c.commit_message,
          sha_hash: c.sha_hash,
          author_email: userMap[c.user_id] || ''
        };
      });

      const history = historyRaw.map(h => ({
        ...h,
        commit_message: commitMap[h.commit_id]?.commit_message || '',
        sha_hash: commitMap[h.commit_id]?.sha_hash || '',
        author_email: commitMap[h.commit_id]?.author_email || ''
      }));

      res.json({
        success: true,
        file: {
          ...file,
          google_drive_folder_id: repo.google_drive_folder_id,
          visibility: repo.visibility,
          repo_owner_id: repo.user_id
        },
        content: content || '',
        history
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async saveOrUpdateFile(req, res) {
    try {
      const repoId = Number(req.params.id);
      const user = req.user;
      const input = req.body || {};
      const branchId = Number(input.branch_id || 0);
      const filePath = (input.file_path || '').trim();
      const content = input.content || '';
      const commitMessage = (input.commit_message || `Update ${filePath}`).trim();

      if (!filePath || branchId === 0) {
        return res.status(422).json({ error: 'Branch ID and file path are required.' });
      }

      const repo = await Repository.findOne({ id: repoId });
      if (!repo || (user.role_type !== 'admin' && repo.user_id !== user.id)) {
        return res.status(403).json({ error: 'Unauthorized: You do not have commit rights to this repository.' });
      }

      const drive = new GoogleDriveService();
      const driveUpload = drive.uploadFile(repo.google_drive_folder_id, path.basename(filePath), content);
      const driveFileId = driveUpload.file_id;
      const size = driveUpload.size;

      const sha = crypto.createHash('sha1').update(`${Date.now()}${repoId}${filePath}${Math.random()}`).digest('hex');
      const commitId = await getNextSequence('repository_commits');
      await RepositoryCommit.create({
        id: commitId,
        repo_id: repoId,
        branch_id: branchId,
        user_id: user.id,
        commit_message: commitMessage,
        sha_hash: sha,
        created_at: new Date()
      });

      let existingFile = await RepositoryFile.findOne({ repo_id: repoId, branch_id: branchId, file_path: filePath });
      let fileId;
      let nextVersion = 1;

      if (existingFile) {
        fileId = existingFile.id;
        existingFile.current_google_drive_file_id = driveFileId;
        existingFile.size = size;
        existingFile.updated_at = new Date();
        await existingFile.save();

        const latestVersion = await FileVersionHistory.findOne({ file_id: fileId }).sort({ version_number: -1 }).lean();
        nextVersion = (latestVersion ? latestVersion.version_number : 0) + 1;
      } else {
        fileId = await getNextSequence('repository_files');
        await RepositoryFile.create({
          id: fileId,
          repo_id: repoId,
          branch_id: branchId,
          file_path: filePath,
          current_google_drive_file_id: driveFileId,
          size: size,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      const versionId = await getNextSequence('file_version_history');
      await FileVersionHistory.create({
        id: versionId,
        file_id: fileId,
        commit_id: commitId,
        google_drive_file_id: driveFileId,
        version_number: nextVersion,
        size: size,
        created_at: new Date()
      });

      await ActivityLogger.log(
        user.id,
        repoId,
        'FILE_MUTATION',
        `Committed '${filePath}' (Version ${nextVersion}) on branch #${branchId} [Drive File: ${driveFileId}]`,
        req
      );

      res.json({
        success: true,
        message: `File '${filePath}' committed successfully as Version ${nextVersion}.`,
        file_id: fileId,
        version: nextVersion,
        commit_sha: sha
      });
    } catch (err) {
      console.error('[Save File Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  static async rollbackFileVersion(req, res) {
    try {
      const repoId = Number(req.params.id);
      const fileId = Number(req.params.fileId);
      const user = req.user;
      const input = req.body || {};
      const targetVersion = Number(input.version_number || 0);

      const repo = await Repository.findOne({ id: repoId });
      if (!repo || (user.role_type !== 'admin' && repo.user_id !== user.id)) {
        return res.status(403).json({ error: 'Unauthorized rollback.' });
      }

      const versionRow = await FileVersionHistory.findOne({ file_id: fileId, version_number: targetVersion });
      if (!versionRow) {
        return res.status(404).json({ error: 'Target rollback version not found.' });
      }

      const file = await RepositoryFile.findOne({ id: fileId });
      if (!file) {
        return res.status(404).json({ error: 'File not found.' });
      }

      file.current_google_drive_file_id = versionRow.google_drive_file_id;
      file.size = versionRow.size;
      file.updated_at = new Date();
      await file.save();

      const sha = crypto.createHash('sha1').update(`${Date.now()}rollback${fileId}${targetVersion}`).digest('hex');
      const commitId = await getNextSequence('repository_commits');
      await RepositoryCommit.create({
        id: commitId,
        repo_id: repoId,
        branch_id: file.branch_id,
        user_id: user.id,
        commit_message: `Rollback file to version ${targetVersion}`,
        sha_hash: sha,
        created_at: new Date()
      });

      const latestVersion = await FileVersionHistory.findOne({ file_id: fileId }).sort({ version_number: -1 }).lean();
      const newVersionNumber = (latestVersion ? latestVersion.version_number : 0) + 1;

      const newVersionId = await getNextSequence('file_version_history');
      await FileVersionHistory.create({
        id: newVersionId,
        file_id: fileId,
        commit_id: commitId,
        google_drive_file_id: versionRow.google_drive_file_id,
        version_number: newVersionNumber,
        size: versionRow.size,
        created_at: new Date()
      });

      await ActivityLogger.log(
        user.id,
        repoId,
        'FILE_ROLLBACK',
        `Rolled back file #${fileId} to previous snapshot v${targetVersion} as new v${newVersionNumber}`,
        req
      );

      res.json({
        success: true,
        message: `Successfully restored file to version ${targetVersion}.`,
        active_version: newVersionNumber
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = FileController;
