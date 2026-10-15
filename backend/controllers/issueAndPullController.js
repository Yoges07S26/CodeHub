const IssueAndPull = require('../models/IssueAndPull');
const Repository = require('../models/Repository');
const User = require('../models/User');
const { getNextSequence } = require('../models/Counter');
const ActivityLogger = require('../services/activityLogger');

class IssueAndPullController {
  static async index(req, res) {
    try {
      const repoId = Number(req.params.id);
      const type = req.query.type;

      const query = { repo_id: repoId };
      if (type && ['issue', 'pull_request'].includes(type)) {
        query.type = type;
      }

      const items = await IssueAndPull.find(query).sort({ created_at: -1 }).lean();

      const creatorIds = [...new Set(items.map(i => i.creator_id))];
      const users = await User.find({ id: { $in: creatorIds } }, { id: 1, email: 1 }).lean();
      const userMap = {};
      users.forEach(u => { userMap[u.id] = u.email; });

      items.forEach(i => {
        i.creator_email = userMap[i.creator_id] || '';
      });

      res.json({ success: true, items });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async create(req, res) {
    try {
      const repoId = Number(req.params.id);
      const user = req.user;
      const input = req.body || {};

      const type = (input.type || 'issue') === 'pull_request' ? 'pull_request' : 'issue';
      const title = (input.title || '').trim();
      const description = (input.description || '').trim();

      if (!title) {
        return res.status(422).json({ error: 'Title is required.' });
      }

      const id = await getNextSequence('issues_and_pulls');
      await IssueAndPull.create({
        id,
        repo_id: repoId,
        creator_id: user.id,
        type,
        title,
        description,
        status: 'open',
        created_at: new Date()
      });

      await ActivityLogger.log(
        user.id,
        repoId,
        `${type.toUpperCase()}_CREATED`,
        `Created ${type} #${id}: '${title}'`,
        req
      );

      const typeLabel = type === 'pull_request' ? 'Pull Request' : 'Issue';
      res.json({
        success: true,
        message: `${typeLabel} created successfully.`,
        id
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const repoId = Number(req.params.id);
      const itemId = Number(req.params.itemId);
      const user = req.user;
      const input = req.body || {};
      const status = input.status || 'open';

      if (!['open', 'closed', 'merged'].includes(status)) {
        return res.status(422).json({ error: 'Invalid status value.' });
      }

      const item = await IssueAndPull.findOne({ id: itemId, repo_id: repoId });
      if (!item) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const repo = await Repository.findOne({ id: repoId }).lean();
      const isPrivileged =
        user.role_type === 'admin' ||
        item.creator_id === user.id ||
        (repo && repo.user_id === user.id);

      if (!isPrivileged) {
        return res.status(403).json({ error: 'Unauthorized to update status.' });
      }

      item.status = status;
      await item.save();

      await ActivityLogger.log(
        user.id,
        repoId,
        `${item.type.toUpperCase()}_STATUS_CHANGED`,
        `Changed ${item.type} #${itemId} status to ${status}`,
        req
      );

      res.json({ success: true, message: `Status updated to ${status}.` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = IssueAndPullController;
