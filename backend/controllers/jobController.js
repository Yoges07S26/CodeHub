const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const User = require('../models/User');
const { getNextSequence } = require('../models/Counter');
const ActivityLogger = require('../services/activityLogger');

class JobController {
  // GET /api/jobs - list/search jobs with filters
  static async listJobs(req, res) {
    try {
      const { keyword, role, type, experience, status } = req.query;
      const filter = {};

      // Full-text search if keyword provided
      if (keyword && keyword.trim()) {
        filter.$text = { $search: keyword.trim() };
      }

      // Role filter
      if (role && role !== 'all') {
        filter.role = role;
      }

      // Job type filter
      if (type && type !== 'all') {
        filter.type = type;
      }

      // Experience level filter
      if (experience && experience !== 'all') {
        filter.experienceLevel = experience;
      }

      // Status filter (default: open)
      filter.status = status || 'open';

      let query = Job.find(filter);

      // If text search, sort by text score; otherwise by newest
      if (filter.$text) {
        query = query.select({ score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, created_at: -1 });
      } else {
        query = query.sort({ created_at: -1 });
      }

      const jobs = await query.limit(100).lean();

      // Enrich with poster info
      const posterIds = [...new Set(jobs.map(j => j.posted_by_user_id))];
      const posters = await User.find({ id: { $in: posterIds } }).lean();
      const posterMap = {};
      for (const p of posters) {
        posterMap[p.id] = p;
      }

      const enriched = jobs.map(j => {
        const poster = posterMap[j.posted_by_user_id] || {};
        return {
          ...j,
          poster_name: j.poster_name || poster.full_name || poster.username || 'Unknown',
          poster_email: j.poster_email || poster.email || ''
        };
      });

      res.json({ success: true, jobs: enriched, count: enriched.length });
    } catch (err) {
      console.error('[Job List Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/jobs/:id - get single job detail
  static async getJob(req, res) {
    try {
      const jobId = parseInt(req.params.id, 10);
      const job = await Job.findOne({ id: jobId }).lean();

      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      // Get poster info
      const poster = await User.findOne({ id: job.posted_by_user_id }).lean();
      job.poster_name = job.poster_name || poster?.full_name || poster?.username || 'Unknown';
      job.poster_email = job.poster_email || poster?.email || '';

      // Get application count
      job.applicants_count = await JobApplication.countDocuments({ job_id: jobId });

      res.json({ success: true, job });
    } catch (err) {
      console.error('[Job Get Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/jobs - create a new job posting (Admin only)
  static async createJob(req, res) {
    try {
      const user = req.user;
      if (user.role_type !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Only administrators can create and publish job listings.' });
      }

      const input = req.body || {};

      const title = (input.title || '').trim();
      const company = (input.company || '').trim();
      const description = (input.description || '').trim();

      if (!title || !company || !description) {
        return res.status(422).json({ error: 'Title, company, and description are required.' });
      }

      const jobId = await getNextSequence('jobs');
      const job = await Job.create({
        id: jobId,
        title,
        company,
        location: (input.location || 'Remote').trim(),
        type: input.type || 'Full-time',
        role: input.role || 'Full Stack',
        experienceLevel: input.experienceLevel || 'Mid Level',
        salary: (input.salary || '').trim() || '$100k - $140k / yr',
        description,
        requirements: Array.isArray(input.requirements) ? input.requirements : [],
        skills: Array.isArray(input.skills) ? input.skills : [],
        posted_by_user_id: user.id,
        poster_name: user.full_name || user.username || 'CodeHub Administrator',
        poster_email: user.email || '',
        status: 'open',
        applicants_count: 0,
        created_at: new Date()
      });

      await ActivityLogger.log(user.id, null, 'JOB_POSTED', `Admin posted a new job: "${title}" at ${company}`, req);

      res.status(201).json({
        success: true,
        message: 'Job posted successfully!',
        job: job.toObject()
      });
    } catch (err) {
      console.error('[Job Create Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/jobs/:id/apply - apply to a job (Regular Users only, NOT Admin)
  static async applyToJob(req, res) {
    try {
      const user = req.user;
      // Admins are not permitted to apply for jobs; admins manage jobs
      if (user.role_type === 'admin') {
        return res.status(403).json({
          error: 'Admins cannot apply for jobs. Administrator accounts only handle and manage job listings and review applicants.'
        });
      }

      const jobId = parseInt(req.params.id, 10);
      const input = req.body || {};

      // Check job exists and is open
      const job = await Job.findOne({ id: jobId }).lean();
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }
      if (job.status !== 'open') {
        return res.status(400).json({ error: 'This job posting is closed.' });
      }

      // Check if already applied
      const existing = await JobApplication.findOne({ job_id: jobId, user_id: user.id });
      if (existing) {
        return res.status(409).json({ error: 'You have already applied to this job.' });
      }

      const applicationId = await getNextSequence('job_applications');
      const application = await JobApplication.create({
        id: applicationId,
        job_id: jobId,
        user_id: user.id,
        user_email: user.email,
        user_name: user.full_name || user.username || '',
        user_role: user.role_type || 'user',
        cover_note: (input.cover_note || '').trim(),
        portfolio_url: (input.portfolio_url || '').trim(),
        resume_summary: (input.resume_summary || '').trim(),
        status: 'applied',
        applied_at: new Date()
      });

      // Increment applicants count
      await Job.updateOne({ id: jobId }, { $inc: { applicants_count: 1 } });

      await ActivityLogger.log(user.id, null, 'JOB_APPLICATION', `User applied to job: "${job.title}" at ${job.company}`, req);

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully!',
        application: application.toObject()
      });
    } catch (err) {
      console.error('[Job Apply Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/jobs/my-applications - get current user's applications
  static async getUserApplications(req, res) {
    try {
      const user = req.user;
      const applications = await JobApplication.find({ user_id: user.id })
        .sort({ applied_at: -1 })
        .lean();

      // Enrich with job info
      const jobIds = [...new Set(applications.map(a => a.job_id))];
      const jobs = await Job.find({ id: { $in: jobIds } }).lean();
      const jobMap = {};
      for (const j of jobs) {
        jobMap[j.id] = j;
      }

      const enriched = applications.map(app => {
        const job = jobMap[app.job_id] || {};
        return {
          ...app,
          job_title: job.title || 'Unknown',
          job_company: job.company || 'Unknown',
          job_role: job.role || '',
          job_status: job.status || 'closed'
        };
      });

      res.json({ success: true, applications: enriched });
    } catch (err) {
      console.error('[Job Applications Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/admin/jobs/:id - admin update job status
  static async updateJobStatus(req, res) {
    try {
      const jobId = parseInt(req.params.id, 10);
      const input = req.body || {};
      const newStatus = input.status;

      if (!['open', 'closed'].includes(newStatus)) {
        return res.status(422).json({ error: 'Status must be "open" or "closed".' });
      }

      const job = await Job.findOne({ id: jobId });
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      job.status = newStatus;
      await job.save();

      await ActivityLogger.log(req.user.id, null, 'JOB_STATUS_UPDATED', `Job #${jobId} status changed to ${newStatus}`, req);

      res.json({ success: true, message: `Job status updated to ${newStatus}.`, job: job.toObject() });
    } catch (err) {
      console.error('[Job Status Update Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/admin/jobs/:id - admin delete job posting
  static async deleteJob(req, res) {
    try {
      const jobId = parseInt(req.params.id, 10);
      const job = await Job.findOneAndDelete({ id: jobId });
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }
      await JobApplication.deleteMany({ job_id: jobId });
      await ActivityLogger.log(req.user.id, null, 'JOB_DELETED', `Admin deleted job #${jobId} ("${job.title}")`, req);
      res.json({ success: true, message: `Job "${job.title}" removed successfully.` });
    } catch (err) {
      console.error('[Job Delete Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/admin/jobs-applications - admin view all applicants
  static async getAllApplicants(req, res) {
    try {
      const applications = await JobApplication.find().sort({ applied_at: -1 }).lean();
      const jobIds = [...new Set(applications.map(a => a.job_id))];
      const jobs = await Job.find({ id: { $in: jobIds } }).lean();
      const jobMap = {};
      for (const j of jobs) jobMap[j.id] = j;

      const enriched = applications.map(app => {
        const j = jobMap[app.job_id] || {};
        return {
          ...app,
          job_title: j.title || `Job #${app.job_id}`,
          job_company: j.company || 'Unknown',
          job_role: j.role || ''
        };
      });

      res.json({ success: true, applications: enriched });
    } catch (err) {
      console.error('[All Applicants Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/admin/jobs/:id/applicants - admin view applicants for a specific job
  static async getJobApplicants(req, res) {
    try {
      const jobId = parseInt(req.params.id, 10);
      const applications = await JobApplication.find({ job_id: jobId }).sort({ applied_at: -1 }).lean();
      res.json({ success: true, applications });
    } catch (err) {
      console.error('[Job Applicants Error]', err);
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/admin/jobs/applications/:id/status - admin update application review status
  static async updateApplicationStatus(req, res) {
    try {
      const appId = parseInt(req.params.id, 10);
      const { status } = req.body || {};
      const allowed = ['applied', 'under_review', 'interviewing', 'accepted', 'rejected'];
      if (!allowed.includes(status)) {
        return res.status(422).json({ error: 'Status must be one of: ' + allowed.join(', ') });
      }

      const application = await JobApplication.findOneAndUpdate(
        { id: appId },
        { status },
        { new: true }
      );
      if (!application) {
        return res.status(404).json({ error: 'Application not found.' });
      }

      await ActivityLogger.log(req.user.id, null, 'JOB_APPLICATION_STATUS_UPDATED', `Admin updated application #${appId} status to ${status}`, req);

      res.json({ success: true, message: `Candidate status updated to ${status}.`, application });
    } catch (err) {
      console.error('[Update Application Status Error]', err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = JobController;
