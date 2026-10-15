const { connectDB, mongoose } = require('./config/db');
const Job = require('./models/Job');
const { getNextSequence } = require('./models/Counter');

const SAMPLE_JOBS = [
  {
    title: 'Senior Full Stack Engineer',
    company: 'DevFlow Technologies',
    location: 'Remote (Global)',
    type: 'Full-time',
    role: 'Full Stack',
    experienceLevel: 'Senior',
    salary: '$130k - $160k / yr',
    description: 'We are seeking an experienced Full Stack Engineer to architect high-throughput repository hosting, code collaboration, and real-time developer workflows.',
    requirements: ['5+ years with React, Node.js and MongoDB', 'Experience with Git internals & VCS architecture', 'Strong proficiency in TypeScript and RESTful microservices'],
    skills: ['React', 'Node.js', 'Express', 'MongoDB', 'Docker', 'TypeScript'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Frontend React & UI/UX Architect',
    company: 'PixelCraft Labs',
    location: 'San Francisco, CA (Hybrid)',
    type: 'Full-time',
    role: 'Frontend',
    experienceLevel: 'Mid Level',
    salary: '$110k - $140k / yr',
    description: 'Build polished, responsive developer tooling interfaces with accessible themes (light & dark), smooth micro-interactions, and real-time state sync.',
    requirements: ['3+ years in modern React and CSS design systems', 'Deep knowledge of web accessibility (WCAG) and responsive layouts', 'Experience with Monaco Editor or code diffing UIs'],
    skills: ['React', 'TailwindCSS', 'CSS3', 'JavaScript', 'Figma', 'UI/UX'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Backend Systems & Cloud Engineer',
    company: 'HyperScale Cloud',
    location: 'New York, NY (Remote)',
    type: 'Full-time',
    role: 'Backend',
    experienceLevel: 'Senior',
    salary: '$140k - $180k / yr',
    description: 'Design distributed database sharding, storage engines, and secure authentication pipelines for millions of developer commits and files.',
    requirements: ['Expertise in Node.js, Express, MongoDB and Redis', 'Deep understanding of JWT security, rate limiting, and RBAC', 'Cloud deployment experience (GCP / AWS / Docker)'],
    skills: ['Node.js', 'MongoDB', 'Express', 'Redis', 'Docker', 'REST API'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'AI / Machine Learning Engineer',
    company: 'CognitiveCode AI',
    location: 'Remote',
    type: 'Full-time',
    role: 'AI / ML Engineer',
    experienceLevel: 'Mid Level',
    salary: '$125k - $165k / yr',
    description: 'Integrate LLMs, code generation assistants (Gemini API), automated security auditing, and intelligent code review pipelines into IDE tooling.',
    requirements: ['Experience calling and fine-tuning Gemini / OpenAI APIs', 'Background in NLP, code analysis, and RAG pipelines', 'Proficiency in Python and Node.js'],
    skills: ['Gemini API', 'Python', 'Machine Learning', 'Node.js', 'LLM', 'AI'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'DevOps & Infrastructure Automation Engineer',
    company: 'GitOps Pipeline Solutions',
    location: 'Remote',
    type: 'Contract',
    role: 'DevOps / Cloud',
    experienceLevel: 'Lead / Staff',
    salary: '$80 - $110 / hr',
    description: 'Implement automated CI/CD pipelines, container orchestration, cluster monitoring, and automated backup disaster recovery systems.',
    requirements: ['Kubernetes, Docker, GitHub Actions, Terraform', 'Strong scripting skills (Bash, PowerShell, Python)', 'Experience maintaining high-availability database clusters'],
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'Linux', 'AWS'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Junior Mobile App Developer (React Native)',
    company: 'AppVenture Studios',
    location: 'Austin, TX (Remote)',
    type: 'Internship',
    role: 'Mobile Developer',
    experienceLevel: 'Entry Level',
    salary: '$60k - $80k / yr',
    description: 'Help develop our mobile companion app for CodeHub, enabling developers to review pull requests, inspect commit diffs, and receive alerts on the go.',
    requirements: ['Basic understanding of React and React Native', 'Passion for mobile UX and Git version control', 'Curious, eager to learn, and team-oriented'],
    skills: ['React Native', 'JavaScript', 'Mobile', 'Git', 'iOS', 'Android'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Senior Cybersecurity & Application Security Auditor',
    company: 'ShieldSec Systems',
    location: 'Remote (US/EU)',
    type: 'Full-time',
    role: 'Cybersecurity',
    experienceLevel: 'Senior',
    salary: '$150k - $190k / yr',
    description: 'Perform rigorous SAST and DAST penetration testing, vulnerability remediation, cryptographic token review, and threat modeling across developer platforms.',
    requirements: ['5+ years in AppSec, OWASP Top 10 mitigation, and auth protocols', 'Experience auditing Node.js, Express and MongoDB codebases', 'Security certifications (CISSP, CEH, or OSCP preferred)'],
    skills: ['Cybersecurity', 'AppSec', 'Penetration Testing', 'JWT', 'Node.js', 'Cryptography'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Lead Product & UI/UX Designer',
    company: 'DesignMatrix Studio',
    location: 'Seattle, WA (Remote)',
    type: 'Full-time',
    role: 'UI/UX & Product',
    experienceLevel: 'Lead / Staff',
    salary: '$135k - $175k / yr',
    description: 'Design intuitive developer-first experiences, code navigation interfaces, dashboard telemetry, and accessible design system components.',
    requirements: ['Extensive Figma prototyping portfolio for SaaS / Developer tools', 'Deep appreciation for dark/light theme ergonomics and WCAG contrast', 'Ability to conduct user research and turn feedback into actionable specs'],
    skills: ['UI/UX', 'Figma', 'Design Systems', 'User Research', 'CSS3', 'Wireframing'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'Engineering Manager - Core Platform',
    company: 'CodeHub Technologies',
    location: 'San Francisco, CA (Hybrid)',
    type: 'Full-time',
    role: 'Engineering Manager',
    experienceLevel: 'Lead / Staff',
    salary: '$180k - $230k / yr',
    description: 'Lead a world-class team of distributed systems and frontend engineers building the next generation of cloud code collaboration tools.',
    requirements: ['Prior experience managing 8+ software engineers', 'Track record delivering high-availability developer platforms', 'Strong technical foundation in full stack web technologies'],
    skills: ['Engineering Management', 'Agile', 'System Design', 'Mentorship', 'Node.js', 'Git'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Staff Database Architect (MongoDB & Distributed Sharding)',
    company: 'AtlasData Labs',
    location: 'Remote',
    type: 'Full-time',
    role: 'Backend',
    experienceLevel: 'Lead / Staff',
    salary: '$165k - $210k / yr',
    description: 'Optimize MongoDB replica sets, write custom aggregation pipelines, design compound indexing strategies, and ensure zero-downtime data migrations.',
    requirements: ['Deep MongoDB internals knowledge, WiredTiger engine, and indexing', 'Experience handling terabyte-scale document collections', 'Proficiency in Node.js Mongoose or Go drivers'],
    skills: ['MongoDB', 'NoSQL', 'Database Architecture', 'Performance Tuning', 'Node.js'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Cloud Solutions Architect (AWS & GCP)',
    company: 'SkyBridge Cloud Partners',
    location: 'Remote',
    type: 'Contract',
    role: 'DevOps / Cloud',
    experienceLevel: 'Senior',
    salary: '$95 - $130 / hr',
    description: 'Architect multi-cloud disaster recovery, Terraform infrastructure-as-code, and serverless edge functions for developer collaboration services.',
    requirements: ['AWS Certified Solutions Architect or GCP Professional Cloud Architect', 'Strong proficiency with Terraform, Docker, and Kubernetes', 'Proven background in high-concurrency microservices'],
    skills: ['AWS', 'Google Cloud', 'Terraform', 'Kubernetes', 'Docker', 'DevOps'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Full Stack JavaScript / TypeScript Engineer',
    company: 'Veloce Software',
    location: 'Boston, MA (Remote)',
    type: 'Full-time',
    role: 'Full Stack',
    experienceLevel: 'Mid Level',
    salary: '$115k - $145k / yr',
    description: 'Build full-cycle features across our React single-page frontend and Express.js REST API. Implement state caching, real-time webhooks, and git diff views.',
    requirements: ['3+ years with modern JavaScript (ES6+), React and Node.js', 'Experience building RESTful APIs and connecting MongoDB databases', 'Proficiency with Git version control and PR code reviews'],
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'MongoDB'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'Junior Frontend Developer',
    company: 'BrightByte Tech',
    location: 'Remote',
    type: 'Full-time',
    role: 'Frontend',
    experienceLevel: 'Entry Level',
    salary: '$75k - $95k / yr',
    description: 'Collaborate with senior designers and engineers to implement reusable UI components, forms, modals, and responsive layouts across our web portals.',
    requirements: ['Solid foundation in HTML5, CSS3, and JavaScript', 'Hands-on experience building projects with React', 'Enthusiasm for writing clean, readable code with attention to detail'],
    skills: ['HTML5', 'CSS3', 'JavaScript', 'React', 'Git', 'Responsive Design'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Machine Learning Research Engineer (LLM & NLP)',
    company: 'NexusAI Labs',
    location: 'San Jose, CA (Remote)',
    type: 'Full-time',
    role: 'AI / ML Engineer',
    experienceLevel: 'Senior',
    salary: '$160k - $210k / yr',
    description: 'Train and fine-tune large language models for code synthesis, semantic bug detection, and automated PR change explanations.',
    requirements: ['MS or PhD in Computer Science, Machine Learning, or related field', 'Experience with PyTorch, TensorFlow, HuggingFace transformers', 'Background in code representation models and tokenization'],
    skills: ['PyTorch', 'TensorFlow', 'NLP', 'Python', 'LLM', 'AI', 'Machine Learning'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'Senior iOS & Android Engineer (React Native)',
    company: 'PulseMobile Systems',
    location: 'Remote',
    type: 'Full-time',
    role: 'Mobile Developer',
    experienceLevel: 'Senior',
    salary: '$135k - $170k / yr',
    description: 'Lead mobile app development for CodeHub across iOS and Android. Ensure 60fps animations, offline-first sync, and push notifications.',
    requirements: ['4+ years building cross-platform apps with React Native', 'Experience deploying to Apple App Store and Google Play Store', 'Knowledge of native modules (Swift / Kotlin) when necessary'],
    skills: ['React Native', 'Mobile', 'iOS', 'Android', 'JavaScript', 'TypeScript'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Site Reliability Engineer (SRE & Observability)',
    company: 'UptimeForge Global',
    location: 'Remote',
    type: 'Full-time',
    role: 'DevOps / Cloud',
    experienceLevel: 'Mid Level',
    salary: '$120k - $155k / yr',
    description: 'Maintain 99.99% service availability, configure Prometheus and Grafana dashboards, establish alerting thresholds, and conduct incident post-mortems.',
    requirements: ['3+ years in SRE or DevOps operations', 'Proficiency with Linux systems administration and shell scripting', 'Experience with containerized microservices and automated rollback strategies'],
    skills: ['SRE', 'Linux', 'Docker', 'Kubernetes', 'Monitoring', 'Bash', 'DevOps'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Data Platform Engineer (Python & Pipelines)',
    company: 'DataStream Analytics',
    location: 'Chicago, IL (Remote)',
    type: 'Full-time',
    role: 'Other',
    experienceLevel: 'Mid Level',
    salary: '$115k - $150k / yr',
    description: 'Construct real-time streaming data ingestion pipelines, repository activity analytics, and developer contribution graphs.',
    requirements: ['Strong Python development skills', 'Experience with Pandas, NumPy, Kafka, or Spark', 'Relational and NoSQL database modeling expertise'],
    skills: ['Python', 'Pandas', 'NumPy', 'MongoDB', 'Data Pipelines', 'SQL'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'Senior Backend Engineer (Node.js & Microservices)',
    company: 'OmniCode Inc.',
    location: 'Remote',
    type: 'Full-time',
    role: 'Backend',
    experienceLevel: 'Senior',
    salary: '$135k - $170k / yr',
    description: 'Architect scalable webhook workers, background queue processors, and secure multi-tenant data pipelines for developer platforms.',
    requirements: ['5+ years designing enterprise Node.js & Express systems', 'Deep understanding of event loops, asynchronous concurrency, and Redis', 'Experience writing automated unit and integration test suites'],
    skills: ['Node.js', 'Express', 'Redis', 'MongoDB', 'REST API', 'Docker'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  }
];

async function seedJobs() {
  try {
    await connectDB();
    console.log('[Seed Jobs] Connected to MongoDB.');

    for (const jobData of SAMPLE_JOBS) {
      const existing = await Job.findOne({ title: jobData.title, company: jobData.company });
      if (existing) {
        console.log(`[Seed Jobs] ⏭️  Job "${jobData.title}" at ${jobData.company} already exists.`);
        continue;
      }

      const id = await getNextSequence('jobs');
      await Job.create({
        id,
        ...jobData,
        status: 'open',
        applicants_count: 0,
        created_at: new Date()
      });
      console.log(`[Seed Jobs] ✅ Seeded job #${id}: ${jobData.title} at ${jobData.company} (${jobData.role})`);
    }

    const totalCount = await Job.countDocuments();
    console.log(`\n[Seed Jobs] Jobs seeding complete! Total active jobs in MongoDB: ${totalCount}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Jobs] Error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedJobs();
