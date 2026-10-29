const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const UserContact = require('../models/UserContact');
const Repository = require('../models/Repository');
const RepositoryFile = require('../models/RepositoryFile');
const PersonalAccessToken = require('../models/PersonalAccessToken');
const { getNextSequence } = require('../models/Counter');
const ActivityLogger = require('../services/activityLogger');

class SettingsController {
  static async get(req, res) {
    try {
      const user = req.user;
      const row = await User.findOne({ id: user.id }).lean();
      if (!row) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const repoCount = await Repository.countDocuments({ user_id: user.id });
      const userRepoIds = (await Repository.find({ user_id: user.id }, { id: 1 }).lean()).map(r => r.id);
      const files = await RepositoryFile.find({ repo_id: { $in: userRepoIds } }, { size: 1 }).lean();
      const fileCount = files.length;
      const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

      // Default tech stack and readme if not set
      const defaultTechStack = [
        'C', 'C++', 'CSS3', 'JAVA', 'HTML5', 'JAVASCRIPT', 'PYTHON', 'TYPESCRIPT',
        'BASH SCRIPT', 'WINDOWS TERMINAL', 'POWERSHELL', 'ORACLE', 'FIREBASE',
        'GOOGLECLOUD', 'AWS', '.NET', 'ANACONDA', 'ANGULAR', 'ANGULAR.JS', 'BOOTSTRAP',
        'JQUERY', 'NODE.JS', 'REACT NATIVE', 'MYSQL', 'SQLITE', 'MONGODB', 'MARIADB',
        'CANVA', 'ADOBE ACROBAT READER', 'NUMPY', 'PANDAS', 'TENSORFLOW', 'PYTORCH',
        'SCIKIT-LEARN', 'MATPLOTLIB', 'KERAS', 'GIT', 'GITHUB', 'UNITY', 'UBISOFT', 'STEAM', 'UNREALENGINE', 'XBOX', 'GODOT'
      ];

      const defaultReadme = 
`### 💫 About Me:

🔭 I'm currently working on building full-stack web applications.
👯 I'm looking to collaborate on open-source web development projects.
🤝 I'm looking for help with mastering advanced CSS layouts and design systems.
🌱 I'm currently learning Java and TypeScript.
💬 Ask me about my favorite programming languages, productivity hacks, or tech blogs.
⚡ Fun fact: I can successfully cook a perfect meal without following a recipe!`;

      res.json({
        success: true,
        user: {
          id: row.id,
          email: row.email,
          full_name: row.full_name || '',
          username: row.username || '',
          pronouns: row.pronouns || 'he/him',
          bio: row.bio || '"you think you know me". "The way to get started is to quit talking and begin doing". "GOD IN THE HOUSE"',
          organization: row.organization || '',
          avatar_url: row.avatar_url || '',
          location: row.location || 'Kamuthi',
          website_url: row.website_url || '',
          social_instagram: row.social_instagram || 'Instagram',
          social_email: row.social_email || row.email,
          social_linkedin: row.social_linkedin || '',
          social_github: row.social_github || '',
          readme_content: row.readme_content || defaultReadme,
          tech_stack: row.tech_stack && row.tech_stack.length > 0 ? row.tech_stack : defaultTechStack,
          followers_count: row.followers_count || 0,
          following_count: row.following_count || 1,
          two_factor_enabled: !!row.two_factor_enabled,
          email_notifications: row.email_notifications !== false,
          security_alerts: row.security_alerts !== false,
          code_review_notifications: row.code_review_notifications !== false,
          theme_preference: row.theme_preference || 'system',
          role: row.role_type,
          is_verified: !!row.email_verified_status,
          account_status: row.account_status,
          last_login_at: row.last_login_at || null,
          created_at: row.created_at || null
        },
        quota: {
          repositories: repoCount,
          files_stored: fileCount,
          storage_used_bytes: totalSize,
          storage_quota_bytes: 15 * 1024 * 1024 * 1024 // 15 GB
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async update(req, res) {
    try {
      const user = req.user;
      const input = req.body || {};

      const row = await User.findOne({ id: user.id });
      if (!row) {
        return res.status(404).json({ error: 'User not found.' });
      }

      if (input.full_name !== undefined) row.full_name = String(input.full_name).trim();
      if (input.username !== undefined) row.username = String(input.username).trim();
      if (input.pronouns !== undefined) row.pronouns = String(input.pronouns).trim();
      if (input.bio !== undefined) row.bio = String(input.bio).trim();
      if (input.organization !== undefined) row.organization = String(input.organization).trim();
      if (input.avatar_url !== undefined) row.avatar_url = String(input.avatar_url).trim();
      if (input.location !== undefined) row.location = String(input.location).trim();
      if (input.website_url !== undefined) row.website_url = String(input.website_url).trim();
      if (input.social_instagram !== undefined) row.social_instagram = String(input.social_instagram).trim();
      if (input.social_email !== undefined) row.social_email = String(input.social_email).trim();
      if (input.social_linkedin !== undefined) row.social_linkedin = String(input.social_linkedin).trim();
      if (input.social_github !== undefined) row.social_github = String(input.social_github).trim();
      if (input.readme_content !== undefined) row.readme_content = String(input.readme_content).trim();
      if (Array.isArray(input.tech_stack)) row.tech_stack = input.tech_stack.map(s => String(s).trim()).filter(Boolean);

      if (input.two_factor_enabled !== undefined) row.two_factor_enabled = !!input.two_factor_enabled;
      if (input.email_notifications !== undefined) row.email_notifications = !!input.email_notifications;
      if (input.security_alerts !== undefined) row.security_alerts = !!input.security_alerts;
      if (input.code_review_notifications !== undefined) row.code_review_notifications = !!input.code_review_notifications;
      if (input.theme_preference !== undefined) row.theme_preference = String(input.theme_preference).trim();

      await row.save();

      try {
        await UserContact.findOneAndUpdate(
          { mail_id: row.email.toLowerCase() },
          {
            username: row.username || row.email.split('@')[0],
            full_name: row.full_name || '',
            mail_id: row.email.toLowerCase()
          },
          { upsert: true, new: true }
        );
      } catch (cErr) {
        console.error('[UserContact] Sync failed on settings update:', cErr.message);
      }
      await ActivityLogger.log(user.id, null, 'SETTINGS_UPDATE', 'User updated account, bio, tech stack, and profile preferences.', req);

      res.json({
        success: true,
        message: 'Profile, tech stack, and account preferences updated successfully.',
        user: {
          id: row.id,
          email: row.email,
          full_name: row.full_name || '',
          username: row.username || '',
          pronouns: row.pronouns || 'he/him',
          bio: row.bio || '',
          organization: row.organization || '',
          avatar_url: row.avatar_url || '',
          location: row.location || '',
          website_url: row.website_url || '',
          social_instagram: row.social_instagram || '',
          social_email: row.social_email || '',
          social_linkedin: row.social_linkedin || '',
          social_github: row.social_github || '',
          readme_content: row.readme_content || '',
          tech_stack: row.tech_stack || [],
          followers_count: row.followers_count || 0,
          following_count: row.following_count || 1,
          two_factor_enabled: !!row.two_factor_enabled,
          email_notifications: !!row.email_notifications,
          security_alerts: !!row.security_alerts,
          code_review_notifications: !!row.code_review_notifications,
          theme_preference: row.theme_preference || 'system',
          role: row.role_type,
          is_verified: !!row.email_verified_status,
          account_status: row.account_status,
          last_login_at: row.last_login_at || null,
          created_at: row.created_at || null
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async changePassword(req, res) {
    try {
      const user = req.user;
      const input = req.body || {};
      const currentPassword = input.current_password || '';
      const newPassword = input.new_password || '';
      const confirmPassword = input.confirm_password || '';

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new passwords are required.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters.' });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'New password and confirmation do not match.' });
      }

      const row = await User.findOne({ id: user.id });
      const isMatch = await bcrypt.compare(currentPassword, row.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }

      row.password_hash = await bcrypt.hash(newPassword, 10);
      await row.save();

      await ActivityLogger.log(user.id, null, 'PASSWORD_CHANGE', 'User changed their security password.', req);

      res.json({
        success: true,
        message: 'Password changed successfully. Please keep it secure.'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getTokens(req, res) {
    try {
      const user = req.user;
      const tokens = await PersonalAccessToken.find({ user_id: user.id }).sort({ created_at: -1 }).lean();

      const formatted = tokens.map(t => ({
        id: t.id,
        name: t.name,
        token_preview: t.token.slice(0, 10) + '...',
        last_used_at: t.last_used_at,
        created_at: t.created_at
      }));

      res.json({ success: true, tokens: formatted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createToken(req, res) {
    try {
      const user = req.user;
      const input = req.body || {};
      let name = (input.name || '').trim();
      if (!name) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const d = new Date();
        name = `Access Token ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      }

      const token = 'chp_' + crypto.randomBytes(24).toString('hex');
      const id = await getNextSequence('personal_access_tokens');

      await PersonalAccessToken.create({
        id,
        user_id: user.id,
        name,
        token,
        created_at: new Date()
      });

      await ActivityLogger.log(user.id, null, 'TOKEN_CREATED', `Personal access token '${name}' generated.`, req);

      res.json({
        success: true,
        message: 'Personal access token generated successfully.',
        token,
        name
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async deleteToken(req, res) {
    try {
      const user = req.user;
      const tokenId = Number(req.params.id);

      await PersonalAccessToken.deleteOne({ id: tokenId, user_id: user.id });
      await ActivityLogger.log(user.id, null, 'TOKEN_REVOKED', `Personal access token #${tokenId} revoked.`, req);

      res.json({ success: true, message: 'Token revoked successfully.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = SettingsController;
