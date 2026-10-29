const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const UserContact = require('../models/UserContact');
const AdminAccountActionRequest = require('../models/AdminAccountActionRequest');
const { getNextSequence } = require('../models/Counter');
const JWT = require('../services/jwtService');
const ActivityLogger = require('../services/activityLogger');
const config = require('../config/app');

class AuthController {
  static async register(req, res) {
    try {
      const input = req.body || {};
      const email = (input.email || '').trim().toLowerCase();
      const password = input.password || '';
      const fullName = (input.full_name || '').trim();
      let username = (input.username || '').trim();
      const organization = (input.organization || '').trim();
      const bio = (input.bio || '').trim();
      const avatarUrl = (input.avatar_url || '').trim();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(422).json({ error: 'Valid email address is required.' });
      }

      if (!username) {
        username = email.split('@')[0];
      }

      if (password.length < 6) {
        return res.status(422).json({ error: 'Password must be at least 6 characters.' });
      }

      const existingUser = await User.findOne({ email }).lean();
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const domain = email.split('@')[1] || '';
      let roleType = 'user';
      if (config.adminDomains.includes(domain) || config.adminWhitelistEmails.includes(email)) {
        roleType = 'admin';
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(24).toString('hex');
      const newUserId = await getNextSequence('users');

      const user = await User.create({
        id: newUserId,
        email,
        password_hash: passwordHash,
        role_type: roleType,
        email_verified_status: true,
        verification_token: verificationToken,
        account_status: 'active',
        full_name: fullName,
        username,
        bio,
        organization,
        avatar_url: avatarUrl,
        created_at: new Date()
      });

      try {
        await UserContact.create({
          username,
          full_name: fullName,
          mail_id: email
        });
      } catch (cErr) {
        console.error('[UserContact] Auto-sync failed on register:', cErr.message);
      }

      await ActivityLogger.log(
        newUserId,
        null,
        'USER_REGISTERED',
        `User ${email} (${fullName}, @${username}) registered with automated role: ${roleType}`,
        req
      );

      const token = JWT.encode({
        user_id: newUserId,
        email,
        role: roleType
      });

      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        token,
        verification_token: verificationToken,
        user: {
          id: newUserId,
          email,
          full_name: fullName,
          username,
          bio,
          organization,
          avatar_url: avatarUrl,
          role: roleType,
          is_verified: false,
          account_status: 'active'
        }
      });
    } catch (err) {
      console.error('[Register Error]', err);
      res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
  }

  static async login(req, res) {
    try {
      const input = req.body || {};
      const email = (input.email || '').trim().toLowerCase();
      const password = input.password || '';

      if (!email || !password) {
        return res.status(422).json({ error: 'Email and password are required.' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password credentials.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password credentials.' });
      }

      if (['suspended', 'blocked'].includes(user.account_status)) {
        return res.status(403).json({ error: 'Account is suspended or blocked. Please contact an administrator.' });
      }

      user.last_login_at = new Date();
      await user.save();

      const token = JWT.encode({
        user_id: user.id,
        email: user.email,
        role: user.role_type
      });

      await ActivityLogger.log(user.id, null, 'USER_LOGIN', `User ${user.email} authenticated successfully.`, req);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name || '',
          username: user.username || '',
          bio: user.bio || '',
          organization: user.organization || '',
          avatar_url: user.avatar_url || '',
          role: user.role_type,
          is_verified: !!user.email_verified_status,
          account_status: user.account_status
        }
      });
    } catch (err) {
      console.error('[Login Error]', err);
      res.status(500).json({ error: 'Login failed: ' + err.message });
    }
  }

  static async verifyEmail(req, res) {
    try {
      const input = req.body || {};
      const token = (input.token || '').trim();
      const userId = input.user_id ? Number(input.user_id) : null;

      let user = null;
      if (token) {
        user = await User.findOne({ verification_token: token });
      } else if (userId) {
        user = await User.findOne({ id: userId });
      } else {
        return res.status(400).json({ error: 'Verification token or user ID is required.' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Invalid verification token.' });
      }

      user.email_verified_status = true;
      user.verification_token = null;
      await user.save();

      await ActivityLogger.log(user.id, null, 'EMAIL_VERIFIED', `User ${user.email} verified email address.`, req);

      res.json({
        success: true,
        message: 'Email verified successfully. Workspace actions unlocked.'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async me(req, res) {
    res.json({
      success: true,
      user: req.user
    });
  }

  static async requestAccountDeletion(req, res) {
    try {
      const user = req.user;
      const input = req.body || {};
      const reason = (input.reason || 'User requested permanent account purge.').trim();

      const requestId = await getNextSequence('admin_account_action_requests');
      await AdminAccountActionRequest.create({
        id: requestId,
        user_id: user.id,
        request_type: 'account_deletion',
        reason_text: reason,
        status: 'pending',
        created_at: new Date()
      });

      await User.updateOne({ id: user.id }, { account_status: 'deletion_pending' });

      await ActivityLogger.log(user.id, null, 'ACCOUNT_DELETION_REQUESTED', `User submitted self-deletion request: ${reason}`, req);

      res.json({
        success: true,
        message: 'Your account deletion request has been submitted to administrators for review.'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = AuthController;
