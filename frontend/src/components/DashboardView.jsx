import React, { useEffect, useState } from 'react';
import UserAvatar from './UserAvatar';

function formatBytes(bytes, decimals = 2) {
  const b = Number(bytes);
  if (!b || isNaN(b) || b <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  if (i <= 0) return `${b} B`;
  const val = (b / Math.pow(k, i)).toFixed(dm);
  return `${parseFloat(val)} ${sizes[i]}`;
}

/**
 * DashboardView – role‑aware workspace dashboard.
 * Props:
 *   user – current logged‑in user object.
 *   repositories – list of all repositories (default empty array).
 *   onSelectRepo – callback when a repository is selected.
 *   onOpenCreateRepo – open the “Create Repo” dialog.
 *   onOpenDeleteAccount – open the delete‑account modal.
 *   onOpenAdmin – navigate to the admin cockpit.
 *   onNavFeed – navigate to the community feed.
 */
export default function DashboardView({
  user,
  repositories = [],
  onSelectRepo,
  onOpenCreateRepo,
  onOpenDeleteAccount,
  onOpenAdmin,
  onNavFeed,
  onNavJobs,
  onNavView,
  theme,
}) {
  const isDark = theme !== 'light';
  const cardBg = isDark ? '#161b22' : '#ffffff';
  const cardBorder = isDark ? '#30363d' : '#d0d7de';
  const textMain = isDark ? '#e6edf3' : '#1f2328';
  const textMuted = isDark ? '#8b949e' : '#57606a';
  const inputBg = isDark ? '#0d1117' : '#ffffff';
  const innerBg = isDark ? '#0d1117' : '#f6f8fa';
  const shadow = isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 1px 3px rgba(31, 35, 40, 0.08)';

  const triggerNav = (view, extra) => {
    if (typeof onNavView === 'function') {
      onNavView(view, extra);
    } else {
      window.dispatchEvent(new CustomEvent('navTo', { detail: extra ? { view, ...extra } : view }));
    }
  };

  const [dashData, setDashData] = useState(user ? { user } : null);
  const [fetchError, setFetchError] = useState('');
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const userRepos = user && Array.isArray(repositories) ? repositories.filter(r => r.user_id == user.id) : [];
  const isAdmin = user?.role === 'admin';
  const profile = dashData?.user || user;

  useEffect(() => {
    if (!user) return;
    setDashData(prev => prev && prev.user ? prev : { user });
    const endpoint = isAdmin ? '/admin/dashboard' : '/dashboard';
    if (typeof apiCall === 'function') {
      apiCall(endpoint)
        .then(d => {
          setDashData(d);
          setFetchError('');
        })
        .catch(() => {
          setFetchError('Dashboard data could not be loaded yet. Showing saved profile info.');
        });
    }

    if (!isAdmin && typeof apiCall === 'function') {
      setJobsLoading(true);
      apiCall('/jobs?status=open')
        .then(res => {
          setFeaturedJobs(res.jobs ? res.jobs.slice(0, 4) : []);
        })
        .catch(() => {})
        .finally(() => setJobsLoading(false));
    }
  }, [user, isAdmin]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: textMuted, fontSize: 16 }}>Please sign in to access your dashboard.</p>
      </div>
    );
  }

  if (!dashData && !fetchError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 14 }}>
        <div style={{ width: 44, height: 44, border: '3px solid rgba(88, 166, 255, 0.2)', borderTopColor: '#58a6ff', borderRadius: '50%', animation: 'codehubSpin 0.75s linear infinite' }} />
        <div style={{ fontWeight: 700, fontSize: 15, color: textMain }}>Loading dashboard data…</div>
        <div style={{ fontSize: 12, color: textMuted }}>Fetching real-time metrics and repository telemetry</div>
      </div>
    );
  }

  const stats = dashData?.stats || {};
  const activity = dashData?.activity || dashData?.recent_logs || [];
  const recentRepos = dashData?.recent_repos || userRepos;
  const storageBytes = Number(stats.storage_bytes || 0);
  const quotaBytes = 15 * 1024 * 1024 * 1024; // 15 GB Free Quota
  const quotaPercent = quotaBytes > 0 ? (storageBytes / quotaBytes) * 100 : 0;
  const quotaPercentLabel = quotaPercent > 0 && quotaPercent < 0.01 ? '< 0.01%' : `${quotaPercent.toFixed(2)}%`;
  const storageFormatted = formatBytes(storageBytes);
  const storageBarWidth = storageBytes > 0 ? Math.max(quotaPercent, 0.75) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      
      {/* ── Welcome Banner ── */}
      <div style={{
        background: isDark
          ? (isAdmin ? 'linear-gradient(135deg, #1f1035, #161b22)' : 'linear-gradient(135deg, #0d1f47 0%, #161240 50%, #1a0d40 100%)')
          : (isAdmin ? 'linear-gradient(135deg, #f5f0ff, #f0fdf4)' : 'linear-gradient(135deg, #e0f2fe, #f0fdf4)'),
        border: '1px solid ' + (isAdmin ? (isDark ? '#6e40c9' : '#e9d5ff') : (isDark ? '#1f4280' : '#bae6fd')),
        borderRadius: 20,
        padding: '30px 34px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: shadow
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <UserAvatar user={profile || user} size={64} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontWeight: 900, fontSize: 24, color: textMain, margin: 0 }}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {(profile?.full_name || profile?.username || profile?.email || user?.full_name || user?.username || user?.email)}! 👋
              </h1>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 800,
                background: isAdmin
                  ? (isDark ? 'rgba(210,168,255,0.2)' : '#f3e8ff')
                  : (isDark ? 'rgba(88,166,255,0.2)' : '#e0f2fe'),
                color: isAdmin
                  ? (isDark ? '#d2a8ff' : '#7c3aed')
                  : (isDark ? '#79c0ff' : '#0284c7'),
                border: `1px solid ${isAdmin ? (isDark ? 'rgba(210,168,255,0.4)' : '#e9d5ff') : (isDark ? 'rgba(88,166,255,0.4)' : '#bae6fd')}`
              }}>
                {isAdmin ? 'ADMINISTRATOR' : 'DEVELOPER'}
              </span>
              {user.is_verified && (
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                  background: isDark ? 'rgba(63,185,80,0.15)' : '#dcfce7',
                  color: isDark ? '#3fb950' : '#15803d',
                  border: `1px solid ${isDark ? 'rgba(63,185,80,0.3)' : '#bbf7d0'}`
                }}>
                  ✅ Verified
                </span>
              )}
            </div>
            <p style={{ color: textMuted, fontSize: 13, margin: 0 }}>
              {isAdmin ? 'System Administrator Portal — Platform Management, User Moderation & Security Logs' : "Welcome to your active CodeHub developer environment. Everything is up to date."}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {!isAdmin && (
            <button
              onClick={onOpenCreateRepo}
              disabled={!user.is_verified}
              style={{
                padding: '11px 22px', borderRadius: 14, fontWeight: 800, fontSize: 13,
                background: user.is_verified ? 'linear-gradient(135deg, #238636, #2ea043)' : (isDark ? '#21262d' : '#e2e8f0'),
                color: user.is_verified ? '#fff' : textMuted,
                cursor: user.is_verified ? 'pointer' : 'not-allowed', border: 'none',
                boxShadow: user.is_verified ? '0 4px 16px rgba(35,134,54,0.35)' : 'none'
              }}
            >
              + New Repository
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              style={{
                padding: '11px 22px', borderRadius: 14, fontWeight: 800, fontSize: 13,
                background: isDark ? 'linear-gradient(135deg, #3d1f6e, #532b9b)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: '#fff', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(110,64,201,0.35)'
              }}
            >
              🛡️ Open Admin Cockpit
            </button>
          )}
        </div>
      </div>

      {/* ── Metric Cards Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {(isAdmin
          ? [
              { label: 'Total Users', value: stats.total_users ?? 0, icon: '👥', color: isDark ? '#58a6ff' : '#0969da', sub: `${stats.active_users ?? 0} active` },
              { label: 'Total Repositories', value: stats.total_repositories ?? 0, icon: '📁', color: isDark ? '#3fb950' : '#15803d', sub: `${stats.public_repositories ?? 0} public` },
              { label: 'Total Commits', value: stats.total_commits ?? 0, icon: '📦', color: isDark ? '#79c0ff' : '#0284c7', sub: `${stats.total_files ?? 0} files` },
              { label: 'Community Posts', value: stats.total_feed_posts ?? 0, icon: '📰', color: isDark ? '#d2a8ff' : '#7c3aed', sub: 'Active stream' },
              { label: 'Pending Purges', value: stats.pending_deletions ?? 0, icon: '🚨', color: isDark ? '#f85149' : '#b91c1c', sub: 'Review needed' },
              { label: 'System Access', value: 'Overriding', icon: '⚡', color: isDark ? '#e3b341' : '#a16207', sub: 'Full privilege' },
            ]
          : [
              { label: 'Repositories', value: stats.repositories ?? userRepos.length, icon: '📁', color: isDark ? '#58a6ff' : '#0969da', sub: 'Hosted projects' },
              { label: 'Total Commits', value: stats.commits ?? 0, icon: '📦', color: isDark ? '#3fb950' : '#15803d', sub: 'Pushed versions' },
              { label: 'Issues & PRs', value: (stats.issues ?? 0) + (stats.pull_requests ?? 0), icon: '🔀', color: isDark ? '#d2a8ff' : '#7c3aed', sub: `${stats.pull_requests ?? 0} PRs, ${stats.issues ?? 0} issues` },
              { label: 'Community Feed', value: stats.feed_posts ?? 0, icon: '📰', color: isDark ? '#79c0ff' : '#0284c7', sub: `${stats.likes_received ?? 0} likes received` },
              { label: 'Drive Storage', value: storageFormatted, icon: '☁️', color: isDark ? '#e3b341' : '#a16207', sub: `${stats.files_stored ?? 0} files (${quotaPercentLabel} used)` },
              { label: 'Account Tier', value: user.role?.toUpperCase(), icon: '👤', color: isDark ? '#58a6ff' : '#0969da', sub: user.is_verified ? 'Verified access' : 'Unverified' },
            ]
        ).map((s, i) => (
          <div key={i} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: shadow }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <span style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{s.label}</span>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Developer Profile & Cloud Sync Summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Developer Info Card */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: shadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: textMain, margin: 0 }}>👤 Developer Identity</h3>
            <button
              onClick={() => triggerNav('settings')}
              style={{ background: 'none', border: 'none', color: isDark ? '#58a6ff' : '#0969da', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
              Edit Profile →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Username</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#58a6ff' : '#0969da', fontFamily: 'monospace' }}>@{profile?.username || 'not_set'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Organization</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textMain }}>{profile?.organization || 'Independent'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Location</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textMain }}>{profile?.location || 'Remote / Worldwide'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Website</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#58a6ff' : '#0969da', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.website_url ? <a href={profile.website_url} target="_blank" rel="noreferrer" style={{ color: isDark ? '#58a6ff' : '#0969da', textDecoration: 'none' }}>{profile.website_url.replace(/^https?:\/\//, '')}</a> : '—'}
              </div>
            </div>
          </div>
          {profile?.bio && (
            <div style={{ background: innerBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '10px 14px', fontSize: 12, color: textMuted, lineHeight: 1.5 }}>
              "{profile.bio}"
            </div>
          )}
        </div>

        {/* Cloud Sync Status Card */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: shadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: textMain, margin: 0 }}>☁️ Cloud Drive Sync & Health</h3>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: isDark ? 'rgba(63,185,80,0.15)' : '#dcfce7', color: isDark ? '#3fb950' : '#15803d', fontWeight: 700 }}>Connected</span>
          </div>
          <p style={{ fontSize: 12, color: textMuted, margin: 0, lineHeight: 1.5 }}>
            Automated Google Drive version sync active. All commits create real-time snapshot files in isolated repository cloud folders.
          </p>
          <div style={{ background: innerBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: textMuted }}>Storage Used</span>
              <span style={{ fontWeight: 800, color: isDark ? '#58a6ff' : '#0969da' }}>
                {storageFormatted} / 15 GB Free Quota ({quotaPercentLabel})
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: isDark ? '#21262d' : '#eaeef2', overflow: 'hidden' }}>
              <div style={{ width: `${storageBarWidth}%`, height: '100%', background: isDark ? '#58a6ff' : '#0969da', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => triggerNav('ai')}
              style={{ flex: 1, padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#1f6feb,#388bfd)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              ✨ Ask AI Review
            </button>
            <button
              onClick={() => (typeof onNavFeed === 'function' ? onNavFeed() : triggerNav('feed'))}
              style={{ flex: 1, padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: isDark ? '#21262d' : '#f6f8fa', color: isDark ? '#58a6ff' : '#0969da', border: `1px solid ${cardBorder}`, cursor: 'pointer' }}>
              📰 Feed Updates
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Actions Bar ── */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '22px 24px', boxShadow: shadow }}>
        <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: textMain }}>⚡ Developer Quick Launch</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { icon: '💼', label: isAdmin ? 'Manage Jobs' : 'Explore Jobs', action: () => (typeof onNavJobs === 'function' ? onNavJobs() : triggerNav('jobs')) },
            { icon: '📰', label: 'Community Feed', action: () => (typeof onNavFeed === 'function' ? onNavFeed() : triggerNav('feed')) },
            { icon: '✨', label: 'Ask AI Copilot', action: () => triggerNav('ai') },
            ...(!isAdmin ? [
              { icon: '📁', label: 'New Repository', action: onOpenCreateRepo },
              { icon: '🔀', label: 'View Repos', action: () => triggerNav('repos') },
            ] : []),
            { icon: '⚙️', label: 'Settings', action: () => triggerNav('settings') },
            ...(!isAdmin && user.account_status !== 'deletion_pending'
              ? [{ icon: '🗑️', label: 'Delete Account', action: onOpenDeleteAccount }]
              : []),
            ...(isAdmin ? [{ icon: '🛡️', label: 'Admin Cockpit', action: () => (typeof onOpenAdmin === 'function' ? onOpenAdmin() : triggerNav('admin_cockpit')) }] : []),
          ].map((qa, i) => (
            <button
              key={i}
              onClick={qa.action}
              style={{
                padding: '14px 10px', borderRadius: 14, background: innerBg,
                border: `1px solid ${cardBorder}`, color: textMain, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
                boxShadow: isDark ? 'none' : '0 1px 2px rgba(31,35,40,0.04)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0969da';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = cardBorder;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: 22 }}>{qa.icon}</span>
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Recommended Tech Jobs & Careers (Developer Dashboard) ── */}
      {!isAdmin && (
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '22px 24px', boxShadow: shadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 16, color: textMain, margin: 0 }}>
                💼 Recommended Tech Jobs & Career Opportunities
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: textMuted }}>
                Active open positions curated across engineering disciplines. Click to view full details and apply.
              </p>
            </div>
            <button
              onClick={() => (typeof onNavJobs === 'function' ? onNavJobs() : triggerNav('jobs'))}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                background: isDark ? '#21262d' : '#e0f2fe',
                border: `1px solid ${isDark ? '#30363d' : '#bae6fd'}`,
                color: isDark ? '#58a6ff' : '#0969da',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Explore All Jobs →
            </button>
          </div>

          {jobsLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: textMuted, fontSize: 13 }}>Loading opportunities...</div>
          ) : featuredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: textMuted, fontSize: 13, background: innerBg, borderRadius: 12, border: `1px solid ${cardBorder}` }}>
              No open job postings available right now. Check back soon!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {featuredJobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => {
                    if (typeof onNavJobs === 'function') onNavJobs(job.id);
                    else triggerNav('jobs', { jobId: job.id });
                  }}
                  style={{
                    background: innerBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: 14,
                    padding: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    transition: 'all 0.2s',
                    boxShadow: isDark ? 'none' : '0 1px 2px rgba(31,35,40,0.04)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#0969da'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = cardBorder; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: textMain }}>{job.title}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: isDark ? 'rgba(63,185,80,0.15)' : '#dcfce7', color: isDark ? '#3fb950' : '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
                        {job.job_type}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: isDark ? '#58a6ff' : '#0969da', marginTop: 4 }}>🏢 {job.company}</div>
                    <div style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>📍 {job.location} · 💰 {job.salary_range}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${isDark ? '#21262d' : '#e2e8f0'}`, paddingTop: 10 }}>
                    <span style={{ fontSize: 11, color: textMuted }}>{job.skills && job.skills.slice(0, 2).join(' · ')}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (typeof onNavJobs === 'function') onNavJobs(job.id);
                        else triggerNav('jobs', { jobId: job.id });
                      }}
                      style={{
                        background: isDark ? 'rgba(88,166,255,0.15)' : '#e0f2fe',
                        border: `1px solid ${isDark ? 'rgba(88,166,255,0.3)' : '#bae6fd'}`,
                        color: isDark ? '#58a6ff' : '#0969da',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 8,
                        cursor: 'pointer'
                      }}
                    >
                      Apply Now →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Lower Grid: Repositories & Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {isAdmin ? (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '22px 24px', boxShadow: shadow }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: 15, color: textMain, margin: 0 }}>📰 Community Feed Moderation</h3>
              <button onClick={() => (typeof onNavFeed === 'function' ? onNavFeed() : triggerNav('feed'))} style={{ background: 'none', border: 'none', color: isDark ? '#58a6ff' : '#0969da', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                Open Feed →
              </button>
            </div>
            <p style={{ fontSize: 13, color: textMuted, lineHeight: 1.5, marginBottom: 16 }}>
              Review technical updates and snippets shared across the developer ecosystem. Administrators have overriding deletion and moderation authority.
            </p>
            <button
              onClick={() => (typeof onNavFeed === 'function' ? onNavFeed() : triggerNav('feed'))}
              style={{ padding: '9px 18px', borderRadius: 12, background: isDark ? '#21262d' : '#f6f8fa', border: `1px solid ${cardBorder}`, color: isDark ? '#58a6ff' : '#0969da', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              View Community Stream
            </button>
          </div>
        ) : (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '22px 24px', boxShadow: shadow }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 0, color: textMain }}>📁 Active Repositories</h3>
              {user.is_verified && (
                <button onClick={onOpenCreateRepo} style={{ background: 'none', border: 'none', color: isDark ? '#58a6ff' : '#0969da', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                  + New
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentRepos.slice(0, 5).map(r => (
                <div
                  key={r.id}
                  onClick={() => onSelectRepo(r.id)}
                  style={{
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    border: `1px solid ${cardBorder}`, background: innerBg,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all 0.2s',
                    boxShadow: isDark ? 'none' : '0 1px 2px rgba(31,35,40,0.04)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#0969da';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = cardBorder;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: isDark ? '#58a6ff' : '#0969da' }}>📦 {r.name}</div>
                    <div style={{ fontSize: 11, color: textMuted, marginTop: 3 }}>{r.description || 'No description provided'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: textMuted, alignItems: 'center' }}>
                    <span>🌿 {r.branch_count || 1}</span>
                    <span>📦 {r.commit_count || 1}</span>
                    <span style={{ color: isDark ? '#58a6ff' : '#0969da', fontWeight: 600 }}>💾 {formatBytes(r.size_bytes || 0)}</span>
                  </div>
                </div>
              ))}
              {recentRepos.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: textMuted, fontSize: 13 }}>
                  No repositories yet. Create your first code workspace!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Panel – Recent System & Workspace Activity */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: '22px 24px', boxShadow: shadow }}>
          <h3 style={{ fontWeight: 800, fontSize: 15, color: textMain, marginBottom: 14 }}>📊 Recent Activity Stream</h3>
          {activity.length === 0 ? (
            <p style={{ color: textMuted, fontSize: 13 }}>No recent activity recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activity.slice(0, 7).map((a, i) => {
                const actionType = a && typeof a === 'object' ? (a.action_type || a.actionType || '') : String(a || '');
                const timestamp = a && typeof a === 'object' ? (a.timestamp || a.created_at || '') : '';
                const description = a && typeof a === 'object' ? (typeof a.description === 'string' ? a.description : JSON.stringify(a.description)) : String(a || '');
                return (
                  <div key={i} style={{ padding: '10px 14px', background: innerBg, border: `1px solid ${cardBorder}`, borderRadius: 10, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: isDark ? 'rgba(88,166,255,0.15)' : '#e0f2fe', color: isDark ? '#58a6ff' : '#0969da' }}>{actionType || 'EVENT'}</span>
                      <span style={{ marginLeft: 'auto', color: textMuted, fontSize: 11 }}>{timestamp}</span>
                    </div>
                    <div style={{ color: textMain, lineHeight: 1.4 }}>{description}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
