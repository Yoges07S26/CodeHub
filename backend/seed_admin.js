/**
 * Seed Admin Script — Creates default admin users in MongoDB
 * Run: node seed_admin.js
 */
const { connectDB, mongoose } = require('./config/db');
const User = require('./models/User');
const { getNextSequence } = require('./models/Counter');
const bcrypt = require('bcryptjs');

const DEFAULT_TECH_STACK = [
  'C', 'C++', 'CSS3', 'JAVA', 'HTML5', 'JAVASCRIPT', 'PYTHON', 'TYPESCRIPT',
  'BASH SCRIPT', 'WINDOWS TERMINAL', 'POWERSHELL', 'ORACLE', 'FIREBASE',
  'GOOGLECLOUD', 'AWS', '.NET', 'ANACONDA', 'ANGULAR', 'ANGULAR.JS', 'BOOTSTRAP',
  'JQUERY', 'NODE.JS', 'REACT NATIVE', 'MYSQL', 'SQLITE', 'MONGODB', 'MARIADB',
  'CANVA', 'ADOBE ACROBAT READER', 'NUMPY', 'PANDAS', 'TENSORFLOW', 'PYTORCH',
  'SCIKIT-LEARN', 'MATPLOTLIB', 'KERAS', 'GIT', 'GITHUB', 'UNITY', 'UBISOFT', 'STEAM', 'UNREALENGINE', 'XBOX', 'GODOT'
];

const DEFAULT_README = 
`### 💫 About Me:

🔭 I'm currently working on building my first full-stack web application.
👯 I'm looking to collaborate on open-source web development projects.
🤝 I'm looking for help with mastering advanced CSS layouts and design systems.
🌱 I'm currently learning Java and TypeScript.
💬 Ask me about my favorite programming languages, productivity hacks, or tech blogs.
⚡ Fun fact I can successfully cook a perfect meal without following a recipe!`;

const ADMIN_USERS = [
  {
    email: 'admin@codehub.com',
    full_name: 'CodeHub Admin',
    username: 'admin',
    password: 'Admin@2026',
    role_type: 'admin',
    location: 'Chennai, India',
    pronouns: 'they/them',
    bio: 'Lead Platform Administrator & System Architect on CodeHub',
    tech_stack: ['JavaScript', 'TypeScript', 'Node.js', 'Express', 'MongoDB', 'Docker', 'Git'],
    readme_content: '### 🛡️ CodeHub Master Administrator\n\n- 🚀 Overseeing developer workflows, recruitment pipelines, and platform moderation.\n- 💡 Passionate about distributed systems, API architecture, and developer tools.\n- 🌐 Contact: admin@codehub.com'
  },
  {
    email: 'system@codehub.com',
    full_name: 'System Administrator',
    username: 'system',
    password: 'System@2026',
    role_type: 'admin',
    location: 'Bengaluru, India',
    pronouns: 'they/them',
    bio: 'Core Infrastructure & Reliability Admin',
    tech_stack: ['Python', 'Bash', 'Linux', 'Docker', 'MongoDB', 'AWS', 'Git'],
    readme_content: '### ⚙️ System & Infrastructure Administrator\n\n- 🔒 Maintaining platform security, Google Drive sync, and service reliability.\n- 📊 Real-time monitoring of community activity and job recruitment boards.'
  },
  {
    email: 'yoges@codehub.com',
    full_name: 'Yoges',
    username: 'Yoges07S26',
    pronouns: 'he/him',
    password: 'Yoges@2007',
    role_type: 'admin',
    location: 'Kamuthi',
    social_email: 'ponyogeswaran@gmail.com',
    social_instagram: 'https://instagram.com',
    bio: 'Software engineer & tech enthusiast building modern web applications.',
    tech_stack: ['C', 'C++', 'Java', 'Python', 'JavaScript', 'TypeScript', 'MongoDB', 'Node.js', 'React', 'AWS', 'Git'],
    readme_content: '### 💫 Developer Profile\n\n- 🔭 Building modern web applications with Node.js and MongoDB.\n- 🌱 Learning advanced systems programming and cloud architectures.\n- 📫 Reach me via email or GitHub.'
  },
  {
    email: 'ponyogeswaran@gmail.com',
    full_name: 'Yoges',
    username: 'Yoges07S26',
    pronouns: 'he/him',
    password: 'Yoges@2007',
    role_type: 'admin',
    location: 'Kamuthi',
    social_email: 'ponyogeswaran@gmail.com',
    social_instagram: 'https://instagram.com',
    bio: 'Software engineer & tech enthusiast building modern web applications.',
    tech_stack: ['C', 'C++', 'Java', 'Python', 'JavaScript', 'TypeScript', 'MongoDB', 'Node.js', 'React', 'AWS', 'Git'],
    readme_content: '### 💫 Developer Profile\n\n- 🔭 Building modern web applications with Node.js and MongoDB.\n- 🌱 Learning advanced systems programming and cloud architectures.\n- 📫 Reach me via email or GitHub.'
  }
];

async function seedAdmins() {
  try {
    await connectDB();
    console.log('[Seed] Connected to MongoDB.\n');

    for (const admin of ADMIN_USERS) {
      let user = await User.findOne({ email: admin.email });
      const passwordHash = await bcrypt.hash(admin.password, 10);

      if (user) {
        user.full_name = admin.full_name;
        user.username = admin.username;
        user.role_type = 'admin';
        user.email_verified_status = true;
        user.pronouns = admin.pronouns || 'he/him';
        user.bio = admin.bio;
        user.location = admin.location;
        user.social_email = admin.social_email || admin.email;
        user.social_instagram = admin.social_instagram || '';
        user.tech_stack = admin.tech_stack;
        user.readme_content = admin.readme_content;
        user.followers_count = 0;
        user.following_count = 1;
        user.password_hash = passwordHash;
        await user.save();
        console.log(`[Seed] 🔄 Updated Admin "${admin.email}" (username: @${admin.username}, role: ${user.role_type})`);
      } else {
        const id = await getNextSequence('users');
        await User.create({
          id,
          email: admin.email,
          full_name: admin.full_name,
          username: admin.username,
          password_hash: passwordHash,
          role_type: 'admin',
          email_verified_status: true,
          pronouns: admin.pronouns || 'he/him',
          bio: admin.bio,
          location: admin.location,
          social_email: admin.social_email || admin.email,
          social_instagram: admin.social_instagram || '',
          tech_stack: admin.tech_stack,
          readme_content: admin.readme_content,
          followers_count: 0,
          following_count: 1,
          account_status: 'active'
        });
        console.log(`[Seed] ➕ Created Admin "${admin.email}" (username: @${admin.username})`);
      }
    }

    console.log('\n[Seed] Admin seeding & sync complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error:', err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedAdmins();
