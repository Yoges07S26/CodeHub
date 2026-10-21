const path = require('path');
const fs = require('fs');
const { connectDB, mongoose } = require('./config/db');
const Job = require('./models/Job');
const { getNextSequence } = require('./models/Counter');
const {
  STORAGE_DIR,
  PUBLIC_DIR,
  downloadAndSaveImage,
  ensureRoleDefaultImages
} = require('./services/jobImageService');

const SAMPLE_JOBS = [
  {
    title: 'Senior Full Stack Engineer',
    company: 'DevFlow Technologies',
    location: 'Remote (Global)',
    type: 'Full-time',
    role: 'Full Stack',
    experienceLevel: 'Senior',
    salary: '$130k - $160k / yr',
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1581291518655-9523c93209dd?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&auto=format&fit=crop&q=80',
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
    role: 'Data Engineer',
    experienceLevel: 'Mid Level',
    salary: '$115k - $150k / yr',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
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
    image_url: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=600&auto=format&fit=crop&q=80',
    description: 'Architect scalable webhook workers, background queue processors, and secure multi-tenant data pipelines for developer platforms.',
    requirements: ['5+ years designing enterprise Node.js & Express systems', 'Deep understanding of event loops, asynchronous concurrency, and Redis', 'Experience writing automated unit and integration test suites'],
    skills: ['Node.js', 'Express', 'Redis', 'MongoDB', 'REST API', 'Docker'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },

  // ==========================================
  // EXPANDED NEW JOBS (19 - 45)
  // ==========================================
  {
    title: 'Lead React & Next.js Systems Architect',
    company: 'FinVantage Capital',
    location: 'New York, NY (Hybrid)',
    type: 'Full-time',
    role: 'Frontend',
    experienceLevel: 'Lead / Staff',
    salary: '$160k - $200k / yr',
    image_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80',
    description: 'Architect institutional-grade financial trading portals and high-concurrency developer dashboards with micro-frontends and SSR caching.',
    requirements: ['6+ years mastering React, Next.js, and TypeScript', 'Experience building latency-sensitive market data visualizations', 'Track record establishing frontend build systems and performance budgets'],
    skills: ['Next.js', 'React', 'TypeScript', 'TailwindCSS', 'Redux Toolkit', 'Microfrontends'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Distributed Systems Core Engineer (Rust & Go)',
    company: 'ApexMesh Network',
    location: 'Zurich, Switzerland (Remote)',
    type: 'Full-time',
    role: 'Backend',
    experienceLevel: 'Senior',
    salary: '$155k - $195k / yr',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    description: 'Build low-latency peer-to-peer repository synchronization, deduplicated block storage engines, and consensus networking protocols.',
    requirements: ['Strong command of Rust or Go in production distributed environments', 'Deep understanding of POSIX filesystems, memory management, and socket programming', 'Familiarity with Raft, Paxos, or gossip protocols'],
    skills: ['Rust', 'Go', 'Distributed Systems', 'gRPC', 'Networking', 'Concurrency'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'AI Prompt & LLM Evaluation Specialist',
    company: 'Synthetix Intelligence',
    location: 'Austin, TX (Remote)',
    type: 'Full-time',
    role: 'AI / ML Engineer',
    experienceLevel: 'Mid Level',
    salary: '$110k - $140k / yr',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    description: 'Design automated benchmarking suites, multi-turn prompt pipelines, and semantic evaluation metrics for developer-focused coding assistants.',
    requirements: ['Hands-on experience with LLM evaluation frameworks and prompt engineering', 'Proficiency in Python, LangChain, and API-based model testing', 'Demonstrated understanding of hallucinations, safety guardrails, and context windows'],
    skills: ['Prompt Engineering', 'Python', 'LLM', 'Gemini API', 'LangChain', 'Evaluation'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'Kubernetes Platform & GitOps Engineer',
    company: 'CloudWeave Systems',
    location: 'Seattle, WA (Remote)',
    type: 'Full-time',
    role: 'DevOps / Cloud',
    experienceLevel: 'Senior',
    salary: '$145k - $180k / yr',
    image_url: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=600&auto=format&fit=crop&q=80',
    description: 'Operate enterprise Kubernetes clusters across hybrid clouds using ArgoCD, Helm, and custom Kubernetes operators for containerized applications.',
    requirements: ['CKA / CKS certification preferred with 4+ years production Kubernetes experience', 'Expertise in ArgoCD, Flux, or GitOps operational workflows', 'Deep knowledge of service meshes (Istio/Linkerd) and ingress controllers'],
    skills: ['Kubernetes', 'ArgoCD', 'GitOps', 'Helm', 'Docker', 'Terraform', 'Prometheus'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Senior Zero-Trust Security Architect',
    company: 'Vigilance Cyber Defense',
    location: 'Washington, DC (Remote)',
    type: 'Full-time',
    role: 'Cybersecurity',
    experienceLevel: 'Senior',
    salary: '$155k - $190k / yr',
    image_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
    description: 'Spearhead zero-trust network access, secret rotation infrastructure, OAuth2/OIDC token verification, and SOC2 / FedRAMP compliance automation.',
    requirements: ['Extensive background in identity management, SAML, OAuth2, and mutual TLS', 'Proficiency in cloud security posture management (CSPM) and container auditing', 'CISSP, CCSP, or equivalent industry accreditation'],
    skills: ['Zero Trust', 'OAuth2', 'JWT', 'Cybersecurity', 'SOC2', 'InfraSec'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Cross-Platform Mobile Engineer (Flutter & Dart)',
    company: 'NovaByte Interactive',
    location: 'Los Angeles, CA (Remote)',
    type: 'Full-time',
    role: 'Mobile Developer',
    experienceLevel: 'Mid Level',
    salary: '$120k - $150k / yr',
    image_url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&auto=format&fit=crop&q=80',
    description: 'Craft fluid, high-performance mobile user experiences across Android and iOS using Flutter, BLoC state management, and native camera/storage integrations.',
    requirements: ['3+ years shipping production Flutter applications', 'Strong mastery of Dart, asynchronous streams, and reactive state', 'Experience integrating REST APIs and handling offline database synchronization'],
    skills: ['Flutter', 'Dart', 'Mobile', 'iOS', 'Android', 'BLoC', 'REST API'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'Principal Design System Architect (Figma & Tokens)',
    company: 'Aura Design Systems',
    location: 'London, UK (Remote)',
    type: 'Full-time',
    role: 'UI/UX & Product',
    experienceLevel: 'Lead / Staff',
    salary: '$145k - $185k / yr',
    image_url: 'https://images.unsplash.com/photo-1542744094-3a31727221eb?w=600&auto=format&fit=crop&q=80',
    description: 'Unify design tokens, interactive component libraries, accessible micro-interactions, and documentation across web, desktop, and mobile suites.',
    requirements: ['7+ years crafting scalable enterprise design systems', 'Deep knowledge of CSS variables, Tailwind, W3C Design Tokens, and Storybook', 'Relentless passion for typography, spacing scales, and WCAG AAA compliance'],
    skills: ['Design Systems', 'Figma', 'UI/UX', 'Storybook', 'CSS', 'Typography'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Engineering Director - Developer Ecosystem',
    company: 'DevSphere Global',
    location: 'San Francisco, CA (Hybrid)',
    type: 'Full-time',
    role: 'Engineering Manager',
    experienceLevel: 'Lead / Staff',
    salary: '$220k - $280k / yr',
    image_url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&auto=format&fit=crop&q=80',
    description: 'Lead 25+ engineers and engineering managers across developer experience, repository engines, public APIs, and enterprise cloud infrastructure.',
    requirements: ['Demonstrated leadership managing multiple engineering teams and managers', 'Strategic vision for developer platform roadmaps and technical scalability', 'Strong engineering pedigree in cloud-native SaaS platforms'],
    skills: ['Engineering Management', 'Executive Leadership', 'System Architecture', 'Agile', 'Strategy'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Senior QA Automation & Performance Engineer',
    company: 'TestForge Automation',
    location: 'Chicago, IL (Remote)',
    type: 'Full-time',
    role: 'QA & Testing',
    experienceLevel: 'Senior',
    salary: '$115k - $145k / yr',
    image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
    description: 'Architect end-to-end browser automation suites with Playwright, load testing pipelines with k6, and regression gates inside GitHub Actions.',
    requirements: ['4+ years in automated web and API testing with Playwright or Cypress', 'Hands-on experience running distributed stress and performance tests with k6 or JMeter', 'Solid JavaScript/TypeScript scripting skills and CI pipeline integration'],
    skills: ['QA Automation', 'Playwright', 'Cypress', 'k6', 'Jest', 'CI/CD'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Real-Time Data Streaming Architect (Kafka & Spark)',
    company: 'DataFlow Dynamics',
    location: 'Boston, MA (Remote)',
    type: 'Full-time',
    role: 'Data Engineer',
    experienceLevel: 'Lead / Staff',
    salary: '$160k - $205k / yr',
    image_url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&auto=format&fit=crop&q=80',
    description: 'Design fault-tolerant data streaming architectures processing billions of telemetry events daily using Apache Kafka, Flink, and cloud data warehouses.',
    requirements: ['5+ years designing enterprise data pipelines and stream processing systems', 'Deep expertise in Apache Kafka, Spark Streaming, and columnar data formats (Parquet)', 'Proficiency in Python, Scala, or Java, alongside SQL optimization'],
    skills: ['Apache Kafka', 'Spark', 'Data Pipelines', 'Python', 'Flink', 'Big Data'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'Junior Full Stack Web Developer (Node & React)',
    company: 'LaunchPad Innovations',
    location: 'Denver, CO (Remote)',
    type: 'Full-time',
    role: 'Full Stack',
    experienceLevel: 'Entry Level',
    salary: '$70k - $90k / yr',
    image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
    description: 'Join a dynamic team building modern web features. You will learn best practices in full stack development, code reviews, and test-driven architecture.',
    requirements: ['Demonstrated understanding of HTML, CSS, JavaScript (ES6+), React, and Node.js', 'Familiarity with MongoDB or relational databases', 'Strong communication skills and passion for continuous learning'],
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'HTML5', 'Git'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Computer Vision & Edge AI Engineer',
    company: 'OpticSense AI',
    location: 'San Diego, CA (Remote)',
    type: 'Full-time',
    role: 'AI / ML Engineer',
    experienceLevel: 'Senior',
    salary: '$150k - $195k / yr',
    image_url: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=600&auto=format&fit=crop&q=80',
    description: 'Train edge computer vision models for automated document OCR, structural code diagram recognition, and real-time biometric identity verification.',
    requirements: ['Extensive hands-on experience in OpenCV, PyTorch, YOLO, and TensorRT', 'Proven deployment of optimized models to edge devices or low-latency servers', 'Background in neural network pruning, quantization, and ONNX conversion'],
    skills: ['Computer Vision', 'PyTorch', 'OpenCV', 'Python', 'YOLO', 'Deep Learning'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'Native iOS Engineer (Swift & SwiftUI)',
    company: 'Starlight Mobile',
    location: 'San Jose, CA (Remote)',
    type: 'Full-time',
    role: 'Mobile Developer',
    experienceLevel: 'Senior',
    salary: '$140k - $175k / yr',
    image_url: 'https://images.unsplash.com/photo-1537498425277-c283d32ef9db?w=600&auto=format&fit=crop&q=80',
    description: 'Design first-class iOS developer tools, widgets, and lock-screen live activities using Swift 6, SwiftUI, Combine, and modern concurrency async/await.',
    requirements: ['4+ years shipping premier iOS applications to the App Store', 'Mastery of Swift, SwiftUI, Instruments memory profiling, and CoreData/SwiftData', 'Deep understanding of Apple HIG and accessibility standards'],
    skills: ['Swift', 'SwiftUI', 'iOS', 'Apple HIG', 'Combine', 'Xcode'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Native Android Engineer (Kotlin & Jetpack Compose)',
    company: 'DroidCraft Labs',
    location: 'Berlin, Germany (Remote)',
    type: 'Full-time',
    role: 'Mobile Developer',
    experienceLevel: 'Mid Level',
    salary: '$115k - $145k / yr',
    image_url: 'https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=600&auto=format&fit=crop&q=80',
    description: 'Build responsive, Material 3 mobile interfaces using Jetpack Compose, Kotlin Coroutines, Flow, and clean MVVM architecture.',
    requirements: ['3+ years in Android app development with Kotlin', 'Expertise in Jetpack Compose, Hilt dependency injection, and Room database', 'Experience writing automated unit tests and UI tests with Espresso'],
    skills: ['Kotlin', 'Android', 'Jetpack Compose', 'Coroutines', 'Material Design', 'Room'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Cloud Security & IAM Governance Engineer',
    company: 'GuardianCloud Solutions',
    location: 'Atlanta, GA (Remote)',
    type: 'Full-time',
    role: 'Cybersecurity',
    experienceLevel: 'Mid Level',
    salary: '$125k - $160k / yr',
    image_url: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=600&auto=format&fit=crop&q=80',
    description: 'Implement principle-of-least-privilege IAM policies, automate key rotations, and configure AWS GuardDuty and Security Hub across cloud accounts.',
    requirements: ['3+ years in cloud infrastructure security with AWS or Azure', 'Strong proficiency with Terraform and policy-as-code (OPA / Sentinel)', 'Experience auditing access permissions and resolving compliance gaps'],
    skills: ['Cloud Security', 'AWS IAM', 'Terraform', 'DevSecOps', 'Compliance', 'Cybersecurity'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Senior GraphQL & API Gateway Architect',
    company: 'QueryScale Labs',
    location: 'Toronto, Canada (Remote)',
    type: 'Full-time',
    role: 'Backend',
    experienceLevel: 'Senior',
    salary: '$135k - $170k / yr',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    description: 'Architect unified GraphQL federated schemas, query complexity analysis, distributed rate limiters, and reverse proxy caching layers.',
    requirements: ['5+ years in backend API engineering and distributed architectures', 'Deep knowledge of GraphQL Federation (Apollo Federation / GraphQL Mesh)', 'Experience tuning Node.js and Redis for sub-10ms response times'],
    skills: ['GraphQL', 'Apollo Federation', 'Node.js', 'Redis', 'API Gateway', 'TypeScript'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Junior UI/UX Designer & Prototyper',
    company: 'CreativePixels',
    location: 'Portland, OR (Remote)',
    type: 'Full-time',
    role: 'UI/UX & Product',
    experienceLevel: 'Entry Level',
    salary: '$65k - $85k / yr',
    image_url: 'https://images.unsplash.com/photo-1581291518655-9523c93209dd?w=600&auto=format&fit=crop&q=80',
    description: 'Collaborate with senior designers to build wireframes, interactive user journeys, and component variants in Figma for our developer platform.',
    requirements: ['Proficiency with Figma components, auto-layout, and prototyping', 'Strong eye for visual hierarchy, layout spacing, and color theory', 'A creative design portfolio demonstrating web or mobile UI explorations'],
    skills: ['Figma', 'UI/UX', 'Wireframing', 'Prototyping', 'Design', 'HTML/CSS'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'High-Performance WebGL & 3D Web Graphics Engineer',
    company: 'Vivid3D Studio',
    location: 'Vancouver, Canada (Remote)',
    type: 'Full-time',
    role: 'Frontend',
    experienceLevel: 'Senior',
    salary: '$130k - $165k / yr',
    image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    description: 'Build cutting-edge 3D repository visualization graphs, code topology maps, and interactive shaders using Three.js, WebGL, and WebGPU.',
    requirements: ['4+ years in modern WebGL, Three.js, or Babylon.js development', 'Strong mathematical foundation in 3D linear algebra and matrix transformations', 'Experience writing custom GLSL shaders and optimizing browser frame rates'],
    skills: ['Three.js', 'WebGL', 'WebGPU', 'GLSL', 'JavaScript', '3D Graphics'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Multi-Region Site Reliability Engineer (SRE)',
    company: 'ResilienceOps',
    location: 'Amsterdam, Netherlands (Remote)',
    type: 'Full-time',
    role: 'DevOps / Cloud',
    experienceLevel: 'Senior',
    salary: '$135k - $175k / yr',
    image_url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=600&auto=format&fit=crop&q=80',
    description: 'Architect active-active multi-region failover, automated circuit breaking, chaos engineering simulations, and OpenTelemetry tracing pipelines.',
    requirements: ['4+ years supporting critical 24/7 web platforms as an SRE', 'Proficiency with distributed tracing (OpenTelemetry, Jaeger) and Prometheus', 'Experience conducting chaos drills with tools like Chaos Mesh or Gremlin'],
    skills: ['SRE', 'Chaos Engineering', 'OpenTelemetry', 'Kubernetes', 'Linux', 'Go'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'CI/CD & Release Automation Engineer (GitHub Actions)',
    company: 'PipelinePro Technologies',
    location: 'Dallas, TX (Remote)',
    type: 'Full-time',
    role: 'DevOps / Cloud',
    experienceLevel: 'Mid Level',
    salary: '$115k - $145k / yr',
    image_url: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=600&auto=format&fit=crop&q=80',
    description: 'Standardize self-hosted GitHub Actions runners, multi-architecture Docker container builds, automated semantic versioning, and npm packaging.',
    requirements: ['3+ years architecting CI/CD pipelines with GitHub Actions or GitLab CI', 'Strong scripting skills in Bash, PowerShell, and Python', 'Experience with Docker buildx, caching strategies, and artifact registries'],
    skills: ['GitHub Actions', 'CI/CD', 'Docker', 'Bash', 'PowerShell', 'DevOps'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Staff AI Researcher - Multimodal Foundation Models',
    company: 'CognitionForge',
    location: 'Cambridge, MA (Hybrid)',
    type: 'Full-time',
    role: 'AI / ML Engineer',
    experienceLevel: 'Lead / Staff',
    salary: '$195k - $260k / yr',
    image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80',
    description: 'Pioneer next-generation foundation models that reason jointly over source code, terminal execution traces, and software architecture diagrams.',
    requirements: ['PhD or equivalent research publication track record (NeurIPS, ICML, ICLR)', 'Expertise in transformer architectures, attention mechanisms, and RLHF', 'Extensive experience training large models on multi-GPU/TPU clusters'],
    skills: ['AI Research', 'PyTorch', 'Transformers', 'RLHF', 'LLM', 'Distributed Training'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'Staff Backend Architect (Event Sourcing & CQRS)',
    company: 'MicroScale Systems',
    location: 'Singapore (Remote)',
    type: 'Full-time',
    role: 'Backend',
    experienceLevel: 'Lead / Staff',
    salary: '$165k - $215k / yr',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
    description: 'Design immutable commit histories, event sourcing backbones, snapshotting mechanisms, and CQRS projection workers for collaborative repositories.',
    requirements: ['6+ years architecting enterprise event-driven architectures', 'Deep understanding of event sourcing, CQRS patterns, and eventual consistency', 'Extensive experience with Node.js, Go, or Java microservices'],
    skills: ['Event Sourcing', 'CQRS', 'Node.js', 'System Design', 'Microservices', 'MongoDB'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Senior Developer Experience (DX) Engineer',
    company: 'SyncPoint Software',
    location: 'Sydney, Australia (Remote)',
    type: 'Full-time',
    role: 'Full Stack',
    experienceLevel: 'Senior',
    salary: '$140k - $175k / yr',
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    description: 'Empower thousands of software engineers by building lightning-fast CLI tools, local development environments, and instant preview deployments.',
    requirements: ['4+ years in full stack development with empathy for developer workflows', 'Proficiency creating Node.js / Go CLI tools, linting rules, and editor plugins', 'Experience optimizing webpack/esbuild/Vite build speeds'],
    skills: ['Developer Experience', 'CLI', 'TypeScript', 'Node.js', 'esbuild', 'DevTools'],
    posted_by_user_id: 3,
    poster_name: 'Yogeswaran',
    poster_email: 'yoges@codehub.com'
  },
  {
    title: 'QA Automation Engineer (Playwright & Cypress)',
    company: 'QualityFirst Systems',
    location: 'Dublin, Ireland (Remote)',
    type: 'Full-time',
    role: 'QA & Testing',
    experienceLevel: 'Mid Level',
    salary: '$95k - $125k / yr',
    image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
    description: 'Write robust UI and REST API test suites, integrate visual regression snapshots, and prevent flaky test runs in automated build pipelines.',
    requirements: ['3+ years in automated web testing with Playwright or Cypress', 'Solid JavaScript/TypeScript programming foundation', 'Experience configuring automated test reports and failure screenshots'],
    skills: ['Playwright', 'Cypress', 'API Testing', 'JavaScript', 'Jest', 'CI/CD'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Embedded Systems & IoT Firmware Engineer (C/C++)',
    company: 'SmartHardware Dynamics',
    location: 'Munich, Germany (Remote)',
    type: 'Full-time',
    role: 'Other',
    experienceLevel: 'Senior',
    salary: '$125k - $165k / yr',
    image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    description: 'Develop low-power real-time operating system (FreeRTOS) firmware, OTA update protocols, and secure hardware crypto-element integrations.',
    requirements: ['4+ years in embedded C/C++ firmware development on ARM Cortex-M or ESP32', 'Hands-on familiarity with I2C, SPI, UART, BLE, and MQTT protocols', 'Experience with secure bootloaders and remote OTA firmware updates'],
    skills: ['Embedded C', 'C++', 'FreeRTOS', 'IoT', 'ESP32', 'Hardware'],
    posted_by_user_id: 2,
    poster_name: 'System Administrator',
    poster_email: 'system@codehub.com'
  },
  {
    title: 'Blockchain Smart Contract Security Auditor (Solidity)',
    company: 'DecentralGuard',
    location: 'Remote (Global)',
    type: 'Contract',
    role: 'Blockchain & Web3',
    experienceLevel: 'Senior',
    salary: '$90 - $140 / hr',
    image_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&auto=format&fit=crop&q=80',
    description: 'Audit decentralized protocol smart contracts, detect reentrancy and oracle manipulation vectors, and verify mathematical invariants with formal methods.',
    requirements: ['3+ years auditing EVM smart contracts (Solidity, Foundry, Hardhat)', 'Deep understanding of common DeFi attack vectors and MEV vulnerabilities', 'Experience using static analysis tools like Slither, Mythril, or Certora'],
    skills: ['Solidity', 'Web3', 'Smart Contracts', 'Security Auditing', 'Ethereum', 'Foundry'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  },
  {
    title: 'Technical Product Manager - Developer Tools',
    company: 'StackCraft Corp',
    location: 'San Francisco, CA (Hybrid)',
    type: 'Full-time',
    role: 'Other',
    experienceLevel: 'Senior',
    salary: '$150k - $190k / yr',
    image_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80',
    description: 'Define product requirements, developer documentation, and roadmap execution for next-generation repository hosting and CI/CD pipelines.',
    requirements: ['4+ years as a Product Manager for developer-centric or B2B SaaS products', 'Strong technical background with ability to read code and understand API architectures', 'Data-driven mindset with proven ability to run customer discovery interviews'],
    skills: ['Product Management', 'Developer Tools', 'Agile', 'User Research', 'API Design', 'Roadmap'],
    posted_by_user_id: 1,
    poster_name: 'CodeHub Admin',
    poster_email: 'admin@codehub.com'
  }
];

async function seedJobs() {
  try {
    console.log('================================================================');
    console.log('       CodeHub Jobs Seeder — Local Storage & Database Sync      ');
    console.log('================================================================\n');

    await connectDB();
    console.log('[Seed Jobs] Connected to MongoDB database "codehub".');

    // 1. Ensure Role Default local fallback images exist in storage/jobs/
    console.log('\n[Seed Jobs] Step 1: Ensuring local role default images in storage/jobs/ ...');
    const roleImages = await ensureRoleDefaultImages();
    console.log('[Seed Jobs] Local role default images ready in folder:', Object.keys(roleImages).length);

    // 2. Iterate through SAMPLE_JOBS and download/store images locally into folder
    console.log(`\n[Seed Jobs] Step 2: Seeding & syncing ${SAMPLE_JOBS.length} jobs with local folder images ...`);

    let seededCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < SAMPLE_JOBS.length; i++) {
      const jobData = SAMPLE_JOBS[i];
      const roleSlug = (jobData.role || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const filename = `job_${i + 1}_${roleSlug}.jpg`;

      // Check if job already exists in MongoDB
      let jobRecord = await Job.findOne({ title: jobData.title, company: jobData.company });

      // Determine local image path
      let localImageUrl = `/uploads/jobs/${filename}`;
      const destPath = path.join(STORAGE_DIR, filename);

      // Download and store into folder if not already cached
      if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 100) {
        process.stdout.write(`[Seed Jobs] Downloading image for "${jobData.title}" (${jobData.company}) ... `);
        localImageUrl = await downloadAndSaveImage(jobData.image_url, filename, {
          title: jobData.title,
          company: jobData.company,
          role: jobData.role
        });
        console.log('Done! Stored at:', localImageUrl);
      }

      if (jobRecord) {
        // Update job record to use local folder image
        if (!jobRecord.image_url || jobRecord.image_url !== localImageUrl || jobRecord.image_url.startsWith('http')) {
          jobRecord.image_url = localImageUrl;
          jobRecord.role = jobData.role;
          jobRecord.requirements = jobData.requirements;
          jobRecord.skills = jobData.skills;
          jobRecord.salary = jobData.salary;
          jobRecord.description = jobData.description;
          await jobRecord.save();
          console.log(`[Seed Jobs] 🔄 Updated Job #${jobRecord.id} with local folder image: ${localImageUrl}`);
          updatedCount++;
        }
      } else {
        // Create new job in MongoDB
        const id = await getNextSequence('jobs');
        jobRecord = await Job.create({
          id,
          ...jobData,
          image_url: localImageUrl,
          status: 'open',
          applicants_count: 0,
          created_at: new Date()
        });
        console.log(`[Seed Jobs] ✅ Seeded new Job #${id}: "${jobData.title}" at ${jobData.company} [${jobData.role}] -> ${localImageUrl}`);
        seededCount++;
      }
    }

    // 3. Scan MongoDB for any remaining jobs that still have remote http/https URLs and migrate them to local folder
    console.log('\n[Seed Jobs] Step 3: Checking for any existing database jobs with remote URLs ...');
    const remoteJobs = await Job.find({ image_url: { $regex: /^https?:\/\//i } });
    if (remoteJobs.length > 0) {
      console.log(`[Seed Jobs] Found ${remoteJobs.length} database jobs with remote URLs. Downloading to local folder ...`);
      for (const rJob of remoteJobs) {
        const rFilename = `job_${rJob.id}_downloaded.jpg`;
        const localPath = await downloadAndSaveImage(rJob.image_url, rFilename, {
          title: rJob.title,
          company: rJob.company,
          role: rJob.role
        });
        rJob.image_url = localPath;
        await rJob.save();
        console.log(`[Seed Jobs] 💾 Downloaded and updated Job #${rJob.id} -> ${localPath}`);
      }
    } else {
      console.log('[Seed Jobs] All jobs in MongoDB are verified to use local folder storage!');
    }

    // 4. Ensure any job with blank or missing image uses role fallback image
    const blankJobs = await Job.find({ $or: [{ image_url: { $exists: false } }, { image_url: '' }, { image_url: null }] });
    for (const bJob of blankJobs) {
      const fallback = roleImages[bJob.role] || roleImages['Full Stack'];
      bJob.image_url = fallback;
      await bJob.save();
      console.log(`[Seed Jobs] Assigned fallback local folder image for Job #${bJob.id} -> ${fallback}`);
    }

    // 5. Final Statistics
    const totalJobs = await Job.countDocuments();
    const storageFiles = fs.readdirSync(STORAGE_DIR);

    console.log('\n================================================================');
    console.log(`  🎉 SUCCESS: Jobs & Local Image Storage Complete!`);
    console.log(`  📊 Total Jobs in MongoDB:       ${totalJobs}`);
    console.log(`  🆕 Newly Seeded Jobs:          ${seededCount}`);
    console.log(`  🔄 Updated Jobs:                ${updatedCount}`);
    console.log(`  📁 Files Stored in Folder:      ${storageFiles.length} files in ${STORAGE_DIR}`);
    console.log(`  🌐 Public Storage Path:         ${PUBLIC_DIR}`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Jobs] Error occurred during seeding:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedJobs();
