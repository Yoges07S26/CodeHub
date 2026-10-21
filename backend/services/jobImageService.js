const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const STORAGE_DIR = path.resolve(__dirname, '../../storage/jobs');
const PUBLIC_DIR = path.resolve(__dirname, '../../frontend/public/uploads/jobs');

// Ensure storage folders exist
for (const dir of [STORAGE_DIR, PUBLIC_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Modern SVG banner generator for offline fallback / generated job images
 */
function generateJobBannerSVG(title, company, role, accentColor = '#3b82f6') {
  const safeTitle = (title || 'Software Engineering Role').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeCompany = (company || 'CodeHub Tech Partner').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeRole = (role || 'Technology').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#1e1e38" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accentColor}" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1" />
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="800" height="450" fill="url(#bg)" />
  <rect width="800" height="450" fill="url(#grid)" />

  <!-- Glowing background elements -->
  <circle cx="700" cy="80" r="180" fill="${accentColor}" opacity="0.12" filter="blur(60px)" />
  <circle cx="100" cy="380" r="140" fill="#8b5cf6" opacity="0.10" filter="blur(50px)" />

  <!-- CodeHub Badge -->
  <g transform="translate(60, 50)">
    <rect width="130" height="32" rx="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
    <circle cx="20" cy="16" r="6" fill="#10b981" />
    <text x="36" y="21" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" letter-spacing="1">CODEHUB</text>
  </g>

  <!-- Role Tag Pill -->
  <g transform="translate(60, 100)">
    <rect width="${Math.max(140, safeRole.length * 9 + 30)}" height="28" rx="14" fill="url(#accentGrad)" opacity="0.95" />
    <text x="16" y="19" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800">${safeRole}</text>
  </g>

  <!-- Job Title -->
  <text x="60" y="210" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="800">
    ${safeTitle.length > 34 ? safeTitle.substring(0, 32) + '...' : safeTitle}
  </text>

  <!-- Company Name -->
  <g transform="translate(60, 260)">
    <text x="0" y="0" fill="${accentColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700">
      🏢 ${safeCompany}
    </text>
  </g>

  <!-- Decorative border line -->
  <rect x="60" y="380" width="680" height="2" fill="url(#accentGrad)" opacity="0.6" />

  <!-- Bottom Details & Status -->
  <text x="60" y="415" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600">
    ⚡ Actively Hiring • Verified Tech Partner
  </text>
  <text x="740" y="415" text-anchor="end" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">
    CodeHub Job Portal
  </text>
</svg>`;
}

const ROLE_COLORS = {
  'Full Stack': '#2563eb',
  'Frontend': '#06b6d4',
  'Backend': '#10b981',
  'AI / ML Engineer': '#8b5cf6',
  'DevOps / Cloud': '#f59e0b',
  'Mobile Developer': '#ec4899',
  'Cybersecurity': '#ef4444',
  'UI/UX & Product': '#d946ef',
  'Engineering Manager': '#6366f1',
  'Other': '#64748b'
};

/**
 * Downloads an image from an external URL and stores it locally into storage/jobs/
 * If download fails or is offline, generates and saves a high-quality SVG banner.
 */
function downloadAndSaveImage(url, filename, meta = {}) {
  return new Promise((resolve) => {
    const destStorage = path.join(STORAGE_DIR, filename);
    const destPublic = path.join(PUBLIC_DIR, filename);

    const fallbackToBanner = () => {
      try {
        const svgFilename = filename.replace(/\.(jpe?g|png|webp)$/i, '.svg');
        const svgStorage = path.join(STORAGE_DIR, svgFilename);
        const svgPublic = path.join(PUBLIC_DIR, svgFilename);
        const color = ROLE_COLORS[meta.role] || '#3b82f6';
        const svgContent = generateJobBannerSVG(meta.title, meta.company, meta.role, color);
        
        fs.writeFileSync(svgStorage, svgContent, 'utf8');
        fs.writeFileSync(svgPublic, svgContent, 'utf8');
        
        // Also write SVG content to original filename so either extension works
        fs.writeFileSync(destStorage, svgContent, 'utf8');
        fs.writeFileSync(destPublic, svgContent, 'utf8');
        
        console.log(`[JobImageService] Generated offline vector banner for ${filename}`);
        resolve(`/uploads/jobs/${filename}`);
      } catch (err) {
        console.error(`[JobImageService] Error creating fallback banner:`, err.message);
        resolve(`/uploads/jobs/${filename}`);
      }
    };

    if (!url || !url.startsWith('http')) {
      return fallbackToBanner();
    }

    // Use curl.exe with -s (silent), -k (insecure/allow self-signed proxy), -L (follow redirects)
    execFile('curl.exe', ['-s', '-k', '-L', '--max-time', '15', url, '-o', destStorage], (err) => {
      if (err || !fs.existsSync(destStorage) || fs.statSync(destStorage).size < 100) {
        return fallbackToBanner();
      }

      try {
        // Copy to public directory for immediate access
        fs.copyFileSync(destStorage, destPublic);
        resolve(`/uploads/jobs/${filename}`);
      } catch (copyErr) {
        resolve(`/uploads/jobs/${filename}`);
      }
    });
  });
}

/**
 * Saves a base64 or Buffer image directly into the jobs storage folder
 */
function saveImageBuffer(buffer, filename) {
  const destStorage = path.join(STORAGE_DIR, filename);
  const destPublic = path.join(PUBLIC_DIR, filename);

  fs.writeFileSync(destStorage, buffer);
  try {
    fs.copyFileSync(destStorage, destPublic);
  } catch (e) {}

  return `/uploads/jobs/${filename}`;
}

/**
 * Pre-downloads or generates local images for all standard job roles
 */
async function ensureRoleDefaultImages() {
  const roleImages = {
    'Full Stack': { filename: 'role_full_stack.jpg', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80' },
    'Frontend': { filename: 'role_frontend.jpg', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80' },
    'Backend': { filename: 'role_backend.jpg', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80' },
    'AI / ML Engineer': { filename: 'role_ai_ml.jpg', url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80' },
    'DevOps / Cloud': { filename: 'role_devops.jpg', url: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=600&auto=format&fit=crop&q=80' },
    'Mobile Developer': { filename: 'role_mobile.jpg', url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&auto=format&fit=crop&q=80' },
    'Cybersecurity': { filename: 'role_cybersecurity.jpg', url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80' },
    'UI/UX & Product': { filename: 'role_ui_ux.jpg', url: 'https://images.unsplash.com/photo-1581291518655-9523c93209dd?w=600&auto=format&fit=crop&q=80' },
    'Engineering Manager': { filename: 'role_engineering_manager.jpg', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80' },
    'Other': { filename: 'role_other.jpg', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80' }
  };

  const results = {};
  for (const [role, item] of Object.entries(roleImages)) {
    const dest = path.join(STORAGE_DIR, item.filename);
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 100) {
      console.log(`[JobImageService] Fetching / generating role asset: ${item.filename} (${role})...`);
      const localPath = await downloadAndSaveImage(item.url, item.filename, {
        title: `${role} Engineering`,
        company: 'CodeHub Tech Hub',
        role
      });
      results[role] = localPath;
    } else {
      results[role] = `/uploads/jobs/${item.filename}`;
    }
  }

  return results;
}

module.exports = {
  STORAGE_DIR,
  PUBLIC_DIR,
  downloadAndSaveImage,
  saveImageBuffer,
  ensureRoleDefaultImages,
  generateJobBannerSVG,
  ROLE_COLORS
};
