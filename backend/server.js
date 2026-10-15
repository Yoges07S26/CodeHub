const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/app');
const { connectDB } = require('./config/db');

// Controllers
const AuthController = require('./controllers/authController');
const DashboardController = require('./controllers/dashboardController');
const RepositoryController = require('./controllers/repositoryController');
const FileController = require('./controllers/fileController');
const IssueAndPullController = require('./controllers/issueAndPullController');
const AdminController = require('./controllers/adminController');
const SettingsController = require('./controllers/settingsController');
const FeedController = require('./controllers/feedController');
const GeminiController = require('./controllers/geminiController');
const JobController = require('./controllers/jobController');

// Middleware
const { requireAuth, requireAdmin, requireVerified } = require('./middleware/authMiddleware');

const app = express();

// --- Global Middleware ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'CodeHub API is running on Node.js + Express + MongoDB', timestamp: new Date().toISOString() });
});

// ============================================================
// AUTH & USER MODULE
// ============================================================
app.post('/api/auth/register', AuthController.register);
app.post('/api/auth/login', AuthController.login);
app.post('/api/auth/verify-email', AuthController.verifyEmail);
app.get('/api/auth/me', requireAuth, AuthController.me);
app.post('/api/auth/request-deletion', requireAuth, AuthController.requestAccountDeletion);

// ============================================================
// DASHBOARD
// ============================================================
app.get('/api/dashboard', requireAuth, DashboardController.userDashboard);
app.get('/api/admin/dashboard', requireAdmin, DashboardController.adminDashboard);

// ============================================================
// SETTINGS
// ============================================================
app.get('/api/settings', requireAuth, SettingsController.get);
app.put('/api/settings', requireAuth, SettingsController.update);
app.post('/api/settings/password', requireAuth, SettingsController.changePassword);
app.get('/api/settings/tokens', requireAuth, SettingsController.getTokens);
app.post('/api/settings/tokens', requireAuth, SettingsController.createToken);
app.delete('/api/settings/tokens/:id', requireAuth, SettingsController.deleteToken);

// ============================================================
// COMMUNITY FEED MODULE
// ============================================================
app.get('/api/feed', FeedController.index);
app.post('/api/feed', requireAuth, FeedController.create);
app.post('/api/feed/:id/like', requireAuth, FeedController.toggleLike);
app.delete('/api/feed/:id', requireAuth, FeedController.delete);

// ============================================================
// REPOSITORY MODULE
// ============================================================
app.get('/api/repositories', requireAuth, RepositoryController.index);
app.post('/api/repositories', requireVerified, RepositoryController.create);
app.get('/api/repositories/:id', requireAuth, RepositoryController.show);
app.delete('/api/repositories/:id', requireAuth, RepositoryController.delete);
app.put('/api/repositories/:id/visibility', requireAuth, RepositoryController.updateVisibility);
app.get('/api/repositories/:id/branches', requireAuth, RepositoryController.getBranches);
app.post('/api/repositories/:id/branches', requireVerified, RepositoryController.createBranch);

// ============================================================
// FILE & VERSION MANAGEMENT
// ============================================================
app.get('/api/repositories/:id/files', requireAuth, FileController.listFiles);
app.get('/api/repositories/:id/files/:fileId', requireAuth, FileController.getFileContent);
app.post('/api/repositories/:id/files', requireVerified, FileController.saveOrUpdateFile);
app.post('/api/repositories/:id/files/:fileId/rollback', requireVerified, FileController.rollbackFileVersion);

// ============================================================
// ISSUES & PULL REQUESTS
// ============================================================
app.get('/api/repositories/:id/issues-pulls', requireAuth, IssueAndPullController.index);
app.post('/api/repositories/:id/issues-pulls', requireVerified, IssueAndPullController.create);
app.put('/api/repositories/:id/issues-pulls/:itemId/status', requireAuth, IssueAndPullController.updateStatus);

// ============================================================
// ADMINISTRATOR COCKPIT & AUDIT MODULE
// ============================================================
app.get('/api/admin/metrics', requireAdmin, AdminController.dashboardMetrics);
app.get('/api/admin/users', requireAdmin, AdminController.listUsers);
app.put('/api/admin/users/:id', requireAdmin, AdminController.updateUserStatus);
app.get('/api/admin/action-requests', requireAdmin, AdminController.listActionRequests);
app.post('/api/admin/action-requests/:id/process', requireAdmin, AdminController.processActionRequest);
app.get('/api/admin/audit-logs', requireAdmin, AdminController.activityLogs);

// ============================================================
// GEMINI AI ASSISTANT
// ============================================================
app.post('/api/gemini/chat', requireAuth, GeminiController.chat);

// ============================================================
// ============================================================
// JOB SEARCH & RECRUITMENT MODULE
// Admin handles jobs (creates, updates, deletes, views candidates)
// Users apply for jobs (admins cannot apply)
// ============================================================
app.get('/api/jobs', JobController.listJobs);
app.get('/api/jobs/my-applications', requireAuth, JobController.getUserApplications);
app.get('/api/jobs/:id', JobController.getJob);
app.post('/api/jobs', requireAdmin, JobController.createJob);
app.post('/api/jobs/:id/apply', requireAuth, JobController.applyToJob);
app.put('/api/admin/jobs/:id', requireAdmin, JobController.updateJobStatus);
app.delete('/api/admin/jobs/:id', requireAdmin, JobController.deleteJob);
app.get('/api/admin/jobs-applications', requireAdmin, JobController.getAllApplicants);
app.get('/api/admin/jobs/:id/applicants', requireAdmin, JobController.getJobApplicants);
app.put('/api/admin/jobs/applications/:id/status', requireAdmin, JobController.updateApplicationStatus);

// ============================================================
// Serve frontend static files (fallback)
// ============================================================
const frontendPath = path.resolve(__dirname, '../frontend/public');
app.use(express.static(frontendPath));
// Express 5 catch-all fallback for SPA & 404
app.use((req, res) => {
  if (!req.path.startsWith('/api/')) {
    return res.sendFile(path.join(frontendPath, 'index.html'));
  }
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ============================================================
// Start Server
// ============================================================
async function startServer() {
  try {
    await connectDB();
    console.log('[MongoDB] Database connection established.');

    app.listen(config.port, () => {
      console.log(`\n====================================================`);
      console.log(`  CodeHub API Server — Node.js + Express + MongoDB`);
      console.log(`====================================================`);
      console.log(`  🚀 Server running at: http://localhost:${config.port}`);
      console.log(`  📦 API Base URL:      http://localhost:${config.port}/api`);
      console.log(`  🗄️  MongoDB URI:       ${config.mongoUri}`);
      console.log(`  🌐 Frontend served:   http://localhost:${config.port}`);
      console.log(`====================================================\n`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

startServer();
