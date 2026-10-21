// Original summaries and preview outlines. Provider material stays at its source.
export const coursePresentation = {
  react: {
    short: 'Interfaces that respond.',
    label: 'REACT STUDIO',
    code: '<YourNextIdea />',
    color: '#176bba',
    icon: 'PanelsTopLeft',
    topics: ['Components & props', 'State & events', 'Accessible forms', 'Loading and errors'],
    outcome: 'Build a searchable campus directory with reusable components and clear empty states.'
  },
  javascript: {
    short: 'Make the web do things.',
    label: 'JAVASCRIPT FOUNDATIONS',
    code: 'const future = build();',
    color: '#9a580d',
    icon: 'Braces',
    topics: ['Values & functions', 'Arrays & objects', 'Async requests', 'Debugging with evidence'],
    outcome: 'Create an interactive project board with validation, filtering and a dependable save flow.'
  },
  sql: {
    short: 'Find the story in the rows.',
    label: 'SQL & DATABASES',
    code: 'SELECT your_next_skill;',
    color: '#087a65',
    icon: 'Database',
    topics: ['SELECT & filters', 'Joins & aggregates', 'Window functions', 'Transactions'],
    outcome: 'Answer revenue and customer questions with queries you can explain and test.'
  },
  dsa: {
    short: 'Patterns before puzzles.',
    label: 'ALGORITHM LAB',
    code: 'O(n) > guesswork',
    color: '#7133b5',
    icon: 'Network',
    topics: ['Arrays & hashing', 'Two pointers', 'Trees & graphs', 'Complexity & tests'],
    outcome: 'Recognize a useful pattern, justify its complexity and test the tricky cases.'
  },
  python: {
    short: 'Small scripts. Useful results.',
    label: 'PYTHON WORKSHOP',
    code: 'for idea in possibilities:',
    color: '#245b99',
    icon: 'Code2',
    topics: ['Collections', 'Functions & files', 'Clean transformations', 'Tests & exceptions'],
    outcome: 'Build a small data-cleaning tool with explicit assumptions and useful error messages.'
  },
  devops: {
    short: 'Build it. Ship it. Keep it up.',
    label: 'DEPLOYMENT PLAYBOOK',
    code: 'commit → test → deploy',
    color: '#c14e30',
    icon: 'Rocket',
    topics: ['Git & pipelines', 'Containers', 'Health checks', 'Rollback & recovery'],
    outcome: 'Package a service, release it safely and explain how to recover from a failed change.'
  },
  statistics: {
    short: 'Turn uncertainty into clarity.',
    label: 'STATISTICS STUDIO',
    code: 'signal ≠ noise',
    color: '#7a3fa3',
    icon: 'ChartNoAxesCombined',
    topics: ['Distributions', 'Sampling', 'Confidence intervals', 'Experiment decisions'],
    outcome: 'Explain a change in product metrics without confusing correlation and causation.'
  },
  'machine-learning': {
    short: 'Build a baseline you can trust.',
    label: 'MACHINE LEARNING',
    code: 'fit → evaluate → improve',
    color: '#ac3f6c',
    icon: 'Brain',
    topics: ['Data splits', 'Baselines', 'Useful metrics', 'Leakage & fairness'],
    outcome: 'Compare a model against a sensible baseline using a repeatable evaluation.'
  },
  analytics: {
    short: 'A dashboard with a point.',
    label: 'DATA ANALYTICS',
    code: 'data → insight → decision',
    color: '#087f88',
    icon: 'ChartPie',
    topics: ['Metric definitions', 'Data cleaning', 'Chart selection', 'Stakeholder storytelling'],
    outcome: 'Build a small decision-focused dashboard and document where its numbers came from.'
  },
  linux: {
    short: 'Understand what the server sees.',
    label: 'LINUX OPERATIONS',
    code: '$ investigate --with-evidence',
    color: '#50668c',
    icon: 'Code2',
    topics: ['Files & permissions', 'Processes', 'Logs & resources', 'Safe troubleshooting'],
    outcome: 'Investigate a service incident with logs and process evidence before changing anything.'
  },
  networks: {
    short: 'Follow a request, end to end.',
    label: 'NETWORKING ESSENTIALS',
    code: 'DNS → TCP → TLS → HTTP',
    color: '#3854b5',
    icon: 'Globe2',
    topics: ['DNS & addressing', 'HTTP contracts', 'TLS basics', 'Timeouts & retries'],
    outcome: 'Trace a failed request and distinguish connection, application and client failures.'
  },
  'system-design': {
    short: 'Design for the next thousand.',
    label: 'SYSTEM DESIGN',
    code: 'reliable by design',
    color: '#79521a',
    icon: 'Blocks',
    topics: ['Requirements', 'Data models', 'Queues & caches', 'Failure boundaries'],
    outcome: 'Design an event-booking service with clear invariants and recovery choices.'
  }
};
const resource = (id, title, provider, url, courseId, category, description, level = 'Beginner') => ({
  id,
  title,
  provider,
  url,
  courseId,
  category,
  description,
  level,
  checkedAt: '2026-10-21',
  kind: 'Official learning resource'
});
export const learningResources = [resource('mdn-html', 'Semantic HTML', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/curriculum/core/semantic-html/', 'react', 'Frontend', 'Structure pages with meaningful elements, usable forms and a clear document outline.'), resource('mdn-css', 'CSS fundamentals', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/curriculum/core/css-fundamentals/', 'react', 'Frontend', 'Understand selectors, the box model and the rules that shape a page.'), resource('mdn-layout', 'Responsive CSS layout', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/curriculum/core/css-layout/', 'react', 'Frontend', 'Build flexible interfaces that remain useful on narrow and wide screens.'), resource('mdn-js', 'JavaScript fundamentals', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/curriculum/core/javascript-fundamentals/', 'javascript', 'Frontend', 'Develop a working foundation in browser scripting and language concepts.'), resource('mdn-a11y', 'Accessibility for the web', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/curriculum/core/accessibility/', 'react', 'Frontend', 'Make interfaces operable and understandable with semantic controls and accessible content.'), resource('mdn-design', 'Design for developers', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/curriculum/core/design-for-developers/', 'react', 'Design', 'Use basic design principles to make content and interaction easier to understand.'), resource('mdn-git', 'Version control', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/curriculum/core/version-control/', 'devops', 'DevOps', 'Learn how version control supports collaboration and a recoverable change history.'), resource('react-start', 'React Quick Start', 'React', 'https://react.dev/learn', 'react', 'Frontend', 'Practise components, data, conditions, events and shared state in the official React guide.'), resource('python-tutorial', 'The Python Tutorial', 'Python Software Foundation', 'https://docs.python.org/3/tutorial/', 'python', 'Backend', 'Explore Python collections, functions, modules and errors. Prior programming familiarity helps.'), resource('postgres-tutorial', 'PostgreSQL tutorial', 'PostgreSQL', 'https://www.postgresql.org/docs/current/tutorial.html', 'sql', 'Databases', 'Work through relational tables, queries, joins and transactions in PostgreSQL.'), resource('docker-start', 'Get started with Docker', 'Docker', 'https://docs.docker.com/get-started/', 'devops', 'DevOps', 'Choose a container tutorial, build an image and run an application stack.'), resource('kubernetes-basics', 'Learn Kubernetes Basics', 'Kubernetes', 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', 'devops', 'DevOps', 'Explore the core workflow for deploying and operating a containerized application.', 'Intermediate'), resource('github-learn', 'GitHub learning paths', 'GitHub', 'https://learn.github.com/', 'devops', 'DevOps', 'Find official activities for repositories, collaboration and developer workflows.'), resource('security-academy', 'Web Security Academy', 'PortSwigger', 'https://portswigger.net/web-security', 'networks', 'Cybersecurity', 'Study web vulnerabilities and apply the concepts in intentionally vulnerable training labs.', 'Intermediate'), resource('google-ml-course', 'Machine Learning Crash Course', 'Google for Developers', 'https://developers.google.com/machine-learning/crash-course', 'machine-learning', 'AI & data', 'Explore regression, classification, data preparation and evaluation through interactive learning.', 'Intermediate'), resource('google-ml-linear', 'Linear regression', 'Google for Developers', 'https://developers.google.com/machine-learning/crash-course/linear-regression', 'machine-learning', 'AI & data', 'Connect a linear model to loss, gradient descent and the choices used in training.', 'Intermediate'), resource('google-ml-classification', 'Classification', 'Google for Developers', 'https://developers.google.com/machine-learning/crash-course/classification', 'machine-learning', 'AI & data', 'Reason about decision thresholds, precision, recall and the cost of prediction errors.', 'Intermediate'), resource('google-ml-data', 'Datasets, generalization and overfitting', 'Google for Developers', 'https://developers.google.com/machine-learning/crash-course/overfitting', 'machine-learning', 'AI & data', 'Understand how dataset choices and overfitting affect evaluation and generalization.', 'Intermediate'), resource('ms-analyst', 'Data analyst training', 'Microsoft Learn', 'https://learn.microsoft.com/en-us/training/career-paths/data-analyst', 'analytics', 'AI & data', 'Explore the official data analyst plan and Power BI learning pathways.'), resource('ms-analytics-start', 'Get started with Microsoft data analytics', 'Microsoft Learn', 'https://learn.microsoft.com/en-us/training/paths/data-analytics-microsoft/', 'analytics', 'AI & data', 'Discover the role of a data analyst and begin the Microsoft analytics learning path.', 'Intermediate'), resource('ms-powerbi-data', 'Prepare data for analysis with Power BI', 'Microsoft Learn', 'https://learn.microsoft.com/en-us/training/paths/prepare-data-power-bi/', 'analytics', 'AI & data', 'Follow the provider’s learning path for preparing data before analysis.', 'Intermediate'), resource('ms-powerbi-model', 'Model data with Power BI', 'Microsoft Learn', 'https://learn.microsoft.com/en-us/training/paths/model-data-power-bi/', 'analytics', 'AI & data', 'Explore the official learning path for building Power BI data models.', 'Intermediate'), resource('ibm-university', 'University technology learning catalog', 'IBM SkillsBuild', 'https://skillsbuild.org/learning-catalog/university-catalog', 'machine-learning', 'AI & data', 'Browse university learning in AI, cybersecurity, data and professional skills.'), resource('mdn-standards', 'Web standards', 'MDN Web Docs', 'https://developer.mozilla.org/en-US/curriculum/core/web-standards/', 'networks', 'Frontend', 'Understand the foundations and shared standards that make the web work.')];
