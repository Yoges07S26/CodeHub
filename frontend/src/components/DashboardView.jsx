import React, { useEffect, useState } from 'react';
import UserAvatar from './UserAvatar';

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
}) {
  const [dashData, setDashData] = useState(user ? { user } : null);
  const [fetchError, setFetchError] = useState('');
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
  }, [user, isAdmin]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: '#8b949e', fontSize: 16 }}>Please sign in to access your dashboard.</p>
      </div>
    );
  }

  if (!dashData && !fetchError) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#8b949e' }}>
        Loading dashboard data…
      </div>
    );
  }

  const stats = dashData?.stats || {};
  const activity = dashData?.activity || dashData?.recent_logs || [];
  const recentRepos = dashData?.recent_repos || userRepos;
  const storageMB = ((stats.storage_bytes || 0) / (1024 * 1024)).toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
      
      {/* ── Welcome Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1f47 0%, #161240 50%, #1a0d40 100%)',
        border: '1px solid #1f4280',
        borderRadius: 20,
        padding: '30px 34px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <UserAvatar user={profile || user} size={64} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h1 style={{ fontWeight: 900, fontSize: 24, color: '#e6edf3', margin: 0 }}>
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {(profile?.full_name || profile?.username || profile?.email || user?.full_name || user?.username || user?.email)}! 👋
              </h1>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 800,
                background: isAdmin ? 'rgba(210,168,255,0.2)' : 'rgba(88,166,255,0.2)',
                color: isAdmin ? '#d2a8ff' : '#79c0ff',
                border: `1px solid ${isAdmin ? 'rgba(210,168,255,0.4)' : 'rgba(88,166,255,0.4)'}`
              }}>
                {isAdmin ? 'ADMINISTRATOR' : 'DEVELOPER'}
              </span>
              {user.is_verified && (
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: 'rgba(63,185,80,0.15)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.3)' }}>
                  ✅ Verified
                </span>
              )}
            </div>
            <p style={{ color: '#8b949e', fontSize: 13, margin: 0 }}>
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
                background: user.is_verified ? 'linear-gradient(135deg, #238636, #2ea043)' : '#21262d',
                color: user.is_verified ? '#fff' : '#8b949e',
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
                background: 'linear-gradient(135deg, #3d1f6e, #532b9b)',
                color: '#d2a8ff', border: '1px solid #6e40c9', cursor: 'pointer',
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
              { label: 'Total Users', value: stats.total_users ?? 0, icon: '👥', color: '#58a6ff', sub: `${stats.active_users ?? 0} active` },
              { label: 'Total Repositories', value: stats.total_repositories ?? 0, icon: '📁', color: '#3fb950', sub: `${stats.public_repositories ?? 0} public` },
              { label: 'Total Commits', value: stats.total_commits ?? 0, icon: '📦', color: '#79c0ff', sub: `${stats.total_files ?? 0} files` },
              { label: 'Community Posts', value: stats.total_feed_posts ?? 0, icon: '📰', color: '#d2a8ff', sub: 'Active stream' },
              { label: 'Pending Purges', value: stats.pending_deletions ?? 0, icon: '🚨', color: '#f85149', sub: 'Review needed' },
              { label: 'System Access', value: 'Overriding', icon: '⚡', color: '#e3b341', sub: 'Full privilege' },
            ]
          : [
              { label: 'Repositories', value: stats.repositories ?? userRepos.length, icon: '📁', color: '#58a6ff', sub: 'Hosted projects' },
              { label: 'Total Commits', value: stats.commits ?? 0, icon: '📦', color: '#3fb950', sub: 'Pushed versions' },
              { label: 'Issues & PRs', value: (stats.issues ?? 0) + (stats.pull_requests ?? 0), icon: '🔀', color: '#d2a8ff', sub: `${stats.pull_requests ?? 0} PRs, ${stats.issues ?? 0} issues` },
              { label: 'Community Feed', value: stats.feed_posts ?? 0, icon: '📰', color: '#79c0ff', sub: `${stats.likes_received ?? 0} likes received` },
              { label: 'Drive Storage', value: `${storageMB} MB`, icon: '☁️', color: '#e3b341', sub: `${stats.files_stored ?? 0} files synced` },
              { label: 'Account Tier', value: user.role?.toUpperCase(), icon: '👤', color: '#58a6ff', sub: user.is_verified ? 'Verified access' : 'Unverified' },
            ]
        ).map((s, i) => (
          <div key={i} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 16, padding: '20px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <span style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{s.label}</span>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Developer Profile & Cloud Sync Summary ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Developer Info Card */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 16, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: '#e6edf3', margin: 0 }}>👤 Developer Identity</h3>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navTo', { detail: 'settings' }))}
              style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
              Edit Profile →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Username</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#58a6ff', fontFamily: 'monospace' }}>@{profile?.username || 'not_set'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Organization</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>{profile?.organization || 'Independent'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Location</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3' }}>{profile?.location || 'Remote / Worldwide'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Website</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#58a6ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.website_url ? <a href={profile.website_url} target="_blank" rel="noreferrer" style={{ color: '#58a6ff', textDecoration: 'none' }}>{profile.website_url.replace(/^https?:\/\//, '')}</a> : '—'}
              </div>
            </div>
          </div>
          {profile?.bio && (
            <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#8b949e', lineHeight: 1.5 }}>
              "{profile.bio}"
            </div>
          )}
        </div>

        {/* Cloud Sync Status Card */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 16, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, color: '#e6edf3', margin: 0 }}>☁️ Cloud Drive Sync & Health</h3>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(63,185,80,0.15)', color: '#3fb950', fontWeight: 700 }}>Connected</span>
          </div>
          <p style={{ fontSize: 12, color: '#8b949e', margin: 0, lineHeight: 1.5 }}>
            Automated Google Drive version sync active. All commits create real-time snapshot files in isolated repository cloud folders.
          </p>
          <div style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 12, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: '#8b949e' }}>Storage Used</span>
            <span style={{ fontWeight: 800, color: '#58a6ff' }}>{storageMB} MB / 15 GB Free Quota</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navTo', { detail: 'ai' }))}
              style={{ flex: 1, padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: 'linear-gradient(135deg,#1f6feb,#388bfd)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              ✨ Ask AI Review
            </button>
            <button
              onClick={onNavFeed}
              style={{ flex: 1, padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: '#21262d', color: '#58a6ff', border: '1px solid #30363d', cursor: 'pointer' }}>
              📰 Feed Updates
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Actions Bar ── */}
      <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 16, padding: '22px 24px' }}>
        <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: '#e6edf3' }}>⚡ Developer Quick Launch</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { icon: '📰', label: 'Community Feed', action: onNavFeed },
            { icon: '✨', label: 'Ask AI Copilot', action: () => window.dispatchEvent(new CustomEvent('navTo', { detail: 'ai' })) },
            ...(!isAdmin ? [
              { icon: '📁', label: 'New Repository', action: onOpenCreateRepo },
              { icon: '🔀', label: 'View Repos', action: () => window.dispatchEvent(new CustomEvent('navTo', { detail: 'repos' })) },
            ] : []),
            { icon: '⚙️', label: 'Settings', action: () => window.dispatchEvent(new CustomEvent('navTo', { detail: 'settings' })) },
            ...(!isAdmin && user.account_status !== 'deletion_pending'
              ? [{ icon: '🗑️', label: 'Delete Account', action: onOpenDeleteAccount }]
              : []),
            ...(isAdmin ? [{ icon: '🛡️', label: 'Admin Cockpit', action: onOpenAdmin }] : []),
          ].map((qa, i) => (
            <button
              key={i}
              onClick={qa.action}
              style={{
                padding: '14px 10px', borderRadius: 14, background: '#0d1117',
                border: '1px solid #30363d', color: '#e6edf3', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#58a6ff';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#30363d';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: 22 }}>{qa.icon}</span>
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lower Grid: Repositories & Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {isAdmin ? (
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 16, padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: 15, color: '#e6edf3', margin: 0 }}>📰 Community Feed Moderation</h3>
              <button onClick={onNavFeed} style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
                Open Feed →
              </button>
            </div>
            <p style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.5, marginBottom: 16 }}>
              Review technical updates and snippets shared across the developer ecosystem. Administrators have overriding deletion and moderation authority.
            </p>
            <button
              onClick={onNavFeed}
              style={{ padding: '9px 18px', borderRadius: 12, background: '#21262d', border: '1px solid #30363d', color: '#58a6ff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              View Community Stream
            </button>
          </div>
        ) : (
          <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 16, padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 0, color: '#e6edf3' }}>📁 Active Repositories</h3>
              {user.is_verified && (
                <button onClick={onOpenCreateRepo} style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
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
                    border: '1px solid #21262d', background: '#0d1117',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#58a6ff';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#21262d';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#58a6ff' }}>📦 {r.name}</div>
                    <div style={{ fontSize: 11, color: '#8b949e', marginTop: 3 }}>{r.description || 'No description provided'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#8b949e' }}>
                    <span>🌿 {r.branch_count || 1}</span>
                    <span>📦 {r.commit_count || 1}</span>
                  </div>
                </div>
              ))}
              {recentRepos.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: '#8b949e', fontSize: 13 }}>
                  No repositories yet. Create your first code workspace!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Panel – Recent System & Workspace Activity */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 16, padding: '22px 24px' }}>
          <h3 style={{ fontWeight: 800, fontSize: 15, color: '#e6edf3', marginBottom: 14 }}>📊 Recent Activity Stream</h3>
          {activity.length === 0 ? (
            <p style={{ color: '#8b949e', fontSize: 13 }}>No recent activity recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activity.slice(0, 7).map((a, i) => {
                const actionType = a && typeof a === 'object' ? (a.action_type || a.actionType || '') : String(a || '');
                const timestamp = a && typeof a === 'object' ? (a.timestamp || a.created_at || '') : '';
                const description = a && typeof a === 'object' ? (typeof a.description === 'string' ? a.description : JSON.stringify(a.description)) : String(a || '');
                return (
                  <div key={i} style={{ padding: '10px 12px', background: '#0d1117', border: '1px solid #21262d', borderRadius: 10, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: 'rgba(88,166,255,0.15)', color: '#58a6ff' }}>{actionType || 'EVENT'}</span>
                      <span style={{ marginLeft: 'auto', color: '#6e7681', fontSize: 11 }}>{timestamp}</span>
                    </div>
                    <div style={{ color: '#c9d1d9', lineHeight: 1.4 }}>{description}</div>
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
