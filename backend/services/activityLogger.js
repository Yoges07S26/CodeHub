const AdminSystemActivityLog = require('../models/AdminSystemActivityLog');
const { getNextSequence } = require('../models/Counter');

class ActivityLogger {
  static async log(userId, repoId = null, actionType, description, req = null) {
    try {
      const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
      const id = await getNextSequence('admin_system_activity_logs');
      await AdminSystemActivityLog.create({
        id,
        user_id: userId,
        repo_id: repoId,
        action_type: actionType,
        description: description,
        ip_address: typeof ip === 'string' ? ip.split(',')[0].trim() : '127.0.0.1',
        timestamp: new Date()
      });
    } catch (err) {
      console.error('[ActivityLogger Error]', err.message);
    }
  }
}

module.exports = ActivityLogger;
