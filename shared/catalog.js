import employerOpportunities from './content/employer-opportunities.json' with { type: 'json' };
import { mergeEmployerOpportunities } from './opportunity-snapshot.js';
import { additionalCompanies } from './content/company-expansion.js';
import { curriculum } from './curriculum.js';
import { advancedCourses } from './advanced-curriculum.js';
import { coreQuizzes } from './core-quizzes.js';
import { roleQuizzes } from './role-quizzes.js';
import { assessmentLabs } from './assessments.js';
import verifiedProblems from './content/problems.json' with { type: 'json' };
import verifiedJobs from './content/jobs.json' with { type: 'json' };
import { companies as baseCompanies, programs, realEvents, verifiedAt } from './content/curated.js';
export const companies = [...baseCompanies, ...additionalCompanies];
export const tracks = ['Full-stack development', 'Data science', 'Data analytics', 'DevOps', 'Explore my interests'];
export const skillColors = {
  'DSA': '#7d6ae4',
  'Frontend': '#77adf4',
  'Backend': '#eba86d',
  'Databases': '#64baaa',
  'DevOps': '#e0a3c2',
  'Communication': '#9c9ddf'
};
export const courses = [{
  id: 'react',
  title: 'React, one component at a time',
  category: 'Frontend',
  type: 'Read & do',
  level: 'Beginner',
  lessons: 24,
  completed: 14,
  minutes: 18,
  color: 'blue',
  author: 'StudentOS Learning',
  tags: ['Full-stack development'],
  description: 'Build a small, useful interface while learning components, state, and the ideas that make React click.'
}, {
  id: 'javascript',
  title: 'JavaScript: the good foundations',
  category: 'Frontend',
  type: 'Video + practice',
  level: 'Beginner',
  lessons: 18,
  completed: 6,
  minutes: 22,
  color: 'peach',
  author: 'freeCodeCamp · video lesson',
  video: 'PkZNo7MFNFg',
  tags: ['Full-stack development', 'Explore my interests'],
  description: 'Understand the language behind the web. Watch, experiment, and test your understanding.'
}, {
  id: 'sql',
  title: 'A little SQL goes a long way',
  category: 'Databases',
  type: 'Read & do',
  level: 'Beginner',
  lessons: 16,
  completed: 3,
  minutes: 15,
  color: 'mint',
  author: 'StudentOS Learning',
  tags: ['Full-stack development', 'Data science', 'Data analytics'],
  description: 'Turn a collection of rows into answers. Learn to select, filter, group, and join real-looking data.'
}, {
  id: 'dsa',
  title: 'Make friends with algorithms',
  category: 'DSA',
  type: 'Read & do',
  level: 'Intermediate',
  lessons: 30,
  completed: 8,
  minutes: 25,
  color: 'purple',
  author: 'StudentOS Learning',
  tags: ['Full-stack development', 'Data science', 'Explore my interests'],
  description: 'Build intuition for patterns before reaching for solutions. Start with arrays and work toward graphs.'
}, {
  id: 'python',
  title: 'Python for curious minds',
  category: 'Backend',
  type: 'Read & do',
  level: 'Beginner',
  lessons: 22,
  completed: 0,
  minutes: 20,
  color: 'yellow',
  author: 'StudentOS Learning',
  tags: ['Data science', 'Data analytics', 'Explore my interests'],
  description: 'Small exercises that introduce Python, data structures, and working with simple datasets.'
}, {
  id: 'devops',
  title: 'Ship it: your first deployment',
  category: 'DevOps',
  type: 'Read & do',
  level: 'Intermediate',
  lessons: 12,
  completed: 0,
  minutes: 25,
  color: 'pink',
  author: 'StudentOS Learning',
  tags: ['DevOps', 'Full-stack development'],
  description: 'Follow an application from a local folder to a dependable deployment. Git, containers, and delivery basics.'
}];
courses.push(...advancedCourses);
export const problems = [{
  id: 'two-sum',
  title: 'Two Sum',
  difficulty: 'Easy',
  topic: 'Arrays',
  company: 'Google',
  acceptance: 57,
  minutes: 20,
  skill: 'DSA',
  functionName: 'twoSum',
  prompt: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. Each input has exactly one solution. You may return the indices in either order.',
  starter: 'function twoSum(nums, target) {\n  // Find two numbers that add up to target.\n  // Return their indices.\n  \n}',
  example: 'nums = [2, 7, 11, 15], target = 9 → [0, 1]',
  tests: [{
    args: [[2, 7, 11, 15], 9],
    expected: [0, 1]
  }, {
    args: [[3, 2, 4], 6],
    expected: [1, 2]
  }, {
    args: [[3, 3], 6],
    expected: [0, 1]
  }],
  hint: 'Keep a map from numbers you have seen to their indices. For each number, look for target minus that number.'
}, {
  id: 'valid-parentheses',
  title: 'Valid Parentheses',
  difficulty: 'Easy',
  topic: 'Stacks',
  company: 'Amazon',
  acceptance: 43,
  minutes: 20,
  skill: 'DSA',
  functionName: 'isValid',
  prompt: 'Return true if every opening bracket has a matching closing bracket in the correct order. The input contains only (), [], and {}.',
  starter: 'function isValid(s) {\n  // A stack can help remember opening brackets.\n  \n}',
  example: 's = "([])" → true',
  tests: [{
    args: ['([])'],
    expected: true
  }, {
    args: ['(]'],
    expected: false
  }, {
    args: ['([)]'],
    expected: false
  }],
  hint: 'Push opening brackets onto a stack. On a closing bracket, compare with the most recent opening bracket.'
}, {
  id: 'max-profit',
  title: 'Best Time to Buy and Sell Stock',
  difficulty: 'Easy',
  topic: 'Arrays',
  company: 'Microsoft',
  acceptance: 55,
  minutes: 25,
  skill: 'DSA',
  functionName: 'maxProfit',
  prompt: 'You may buy once and sell on a later day. Return the maximum profit, or 0 when there is no profitable transaction.',
  starter: 'function maxProfit(prices) {\n  // Track the lowest price seen so far.\n  \n}',
  example: 'prices = [7, 1, 5, 3, 6, 4] → 5',
  tests: [{
    args: [[7, 1, 5, 3, 6, 4]],
    expected: 5
  }, {
    args: [[7, 6, 4, 3, 1]],
    expected: 0
  }, {
    args: [[2, 4, 1]],
    expected: 2
  }],
  hint: 'At each day, compare the current price with the cheapest earlier price.'
}, {
  id: 'product-array',
  title: 'Product of Array Except Self',
  difficulty: 'Medium',
  topic: 'Arrays',
  company: 'Amazon',
  acceptance: 66,
  minutes: 30,
  skill: 'DSA',
  functionName: 'productExceptSelf',
  prompt: 'Return an array where each element is the product of every input element except itself. Try solving it without division.',
  starter: 'function productExceptSelf(nums) {\n  // Think about prefix and suffix products.\n  \n}',
  example: 'nums = [1, 2, 3, 4] → [24, 12, 8, 6]',
  tests: [{
    args: [[1, 2, 3, 4]],
    expected: [24, 12, 8, 6]
  }, {
    args: [[-1, 1, 0, -3, 3]],
    expected: [0, 0, 9, 0, 0]
  }],
  hint: 'Combine the product of elements before an index with the product of elements after it.'
}, {
  id: 'longest-substring',
  title: 'Longest Substring Without Repeating',
  difficulty: 'Medium',
  topic: 'Strings',
  company: 'Google',
  acceptance: 38,
  minutes: 35,
  skill: 'DSA',
  functionName: 'lengthOfLongestSubstring',
  prompt: 'Return the length of the longest substring that contains no repeated characters.',
  starter: 'function lengthOfLongestSubstring(s) {\n  // Maintain a window of unique characters.\n  \n}',
  example: 's = "abcabcbb" → 3',
  tests: [{
    args: ['abcabcbb'],
    expected: 3
  }, {
    args: ['bbbbb'],
    expected: 1
  }, {
    args: ['pwwkew'],
    expected: 3
  }],
  hint: 'Slide the left edge forward whenever the right edge introduces a duplicate.'
}, {
  id: 'climbing-stairs',
  title: 'Climbing Stairs',
  difficulty: 'Easy',
  topic: 'Dynamic programming',
  company: 'Microsoft',
  acceptance: 54,
  minutes: 25,
  skill: 'DSA',
  functionName: 'climbStairs',
  prompt: 'You can climb 1 or 2 steps at a time. Return the number of distinct ways to reach step n.',
  starter: 'function climbStairs(n) {\n  // How do the answers for n - 1 and n - 2 help?\n  \n}',
  example: 'n = 4 → 5',
  tests: [{
    args: [2],
    expected: 2
  }, {
    args: [4],
    expected: 5
  }, {
    args: [6],
    expected: 13
  }],
  hint: 'The last step must come from either n - 1 or n - 2. Start with the smallest cases.'
}];
const baseQuizzes = [{
  id: 'js-basics',
  title: 'JavaScript check-in',
  topic: 'Frontend',
  label: 'Technical',
  questions: [{
    text: 'What does a JavaScript closure let a function access?',
    options: ['Only its own arguments', 'Variables from its enclosing scope', 'Every variable in the browser', 'Only global constants'],
    correct: 1,
    explanation: 'A closure preserves access to the lexical environment in which a function was created.'
  }, {
    text: 'Which method creates a new array by transforming each element?',
    options: ['forEach()', 'push()', 'map()', 'pop()'],
    correct: 2,
    explanation: 'map() returns a new array containing the result of calling your function for each element.'
  }, {
    text: 'What does await do inside an async function?',
    options: ['Blocks the entire browser', 'Pauses that function until a promise settles', 'Converts every result to a string', 'Cancels the previous request'],
    correct: 1,
    explanation: 'await suspends the async function while other JavaScript work can continue.'
  }]
}, {
  id: 'dsa-patterns',
  title: 'Find the right pattern',
  topic: 'DSA',
  label: 'Topic quiz',
  questions: [{
    text: 'Which structure is useful for checking balanced brackets?',
    options: ['Queue', 'Stack', 'Binary search tree', 'Heap'],
    correct: 1,
    explanation: 'Brackets close in last-in, first-out order, which matches a stack.'
  }, {
    text: 'What is the time complexity of binary search on a sorted array?',
    options: ['O(n²)', 'O(n)', 'O(log n)', 'O(1)'],
    correct: 2,
    explanation: 'Each comparison halves the remaining search interval.'
  }, {
    text: 'Which technique fits a maximum-sum subarray of fixed length k?',
    options: ['Sliding window', 'Topological sort', 'Backtracking', 'Union-find'],
    correct: 0,
    explanation: 'Slide a window of k elements, subtracting the outgoing value and adding the incoming value.'
  }]
}, {
  id: 'aptitude',
  title: 'Aptitude, without the anxiety',
  topic: 'Communication',
  label: 'Aptitude',
  questions: [{
    text: 'A price increases from 200 to 250. What is the percentage increase?',
    options: ['20%', '25%', '50%', '125%'],
    correct: 1,
    explanation: 'The increase is 50. Divide 50 by the original 200 to get 25%.'
  }, {
    text: 'What comes next: 2, 6, 12, 20, 30, …?',
    options: ['36', '40', '42', '44'],
    correct: 2,
    explanation: 'The differences are 4, 6, 8, 10, so the next difference is 12.'
  }, {
    text: 'A person travels 60 km in 90 minutes. What is their average speed?',
    options: ['30 km/h', '40 km/h', '45 km/h', '60 km/h'],
    correct: 1,
    explanation: '90 minutes is 1.5 hours. 60 divided by 1.5 is 40 km/h.'
  }]
}, {
  id: 'sql-check',
  title: 'Think in SQL',
  topic: 'Databases',
  label: 'Teacher quiz',
  questions: [{
    text: 'Which clause filters rows before they are grouped?',
    options: ['ORDER BY', 'HAVING', 'WHERE', 'LIMIT'],
    correct: 2,
    explanation: 'WHERE filters individual rows; HAVING filters the results of grouping.'
  }, {
    text: 'Which JOIN keeps every row from the left table?',
    options: ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'SELF JOIN'],
    correct: 1,
    explanation: 'LEFT JOIN includes unmatched left-side rows, with NULL values for missing right-side columns.'
  }, {
    text: 'What does COUNT(*) count?',
    options: ['Only non-NULL names', 'Columns', 'All rows in the group', 'Only distinct rows'],
    correct: 2,
    explanation: 'COUNT(*) counts rows, including rows containing NULL values.'
  }]
}];
export const legacyJobs = [{
  id: 'orbit',
  company: 'Orbit Labs',
  initial: 'O',
  color: 'purple',
  title: 'Full-stack Developer Intern',
  location: 'Bengaluru · Hybrid',
  type: 'Internship',
  channel: 'Off campus',
  years: [2, 3, 4],
  skills: ['Frontend', 'Backend', 'Databases'],
  description: 'Build thoughtful web experiences with a small product team. You will work on React interfaces, API endpoints, and the data that connects them.',
  requirements: ['Comfort with JavaScript and React', 'A project using an API and a database', 'Clear communication and curiosity'],
  deadline: '2026-11-10',
  duration: '6 months',
  posted: '2 hours ago'
}, {
  id: 'pixel',
  company: 'Pixelworks',
  initial: 'p',
  color: 'blue',
  title: 'Frontend Engineering Intern',
  location: 'Remote · India',
  type: 'Internship',
  channel: 'Off campus',
  years: [1, 2, 3, 4],
  skills: ['Frontend', 'Communication'],
  description: 'Help build accessible, responsive interfaces. Bring your curiosity, an eye for detail, and a project you are proud to explain.',
  requirements: ['HTML, CSS, and JavaScript foundations', 'A responsive interface in your portfolio', 'Interest in accessibility'],
  deadline: '2026-11-05',
  duration: '3 months',
  posted: '5 hours ago'
}, {
  id: 'nova',
  company: 'Nova Systems',
  initial: 'N',
  color: 'mint',
  title: 'Graduate Software Engineer',
  location: 'Hyderabad · On site',
  type: 'Full-time',
  channel: 'Campus drive',
  years: [4],
  skills: ['DSA', 'Backend', 'Databases', 'Communication'],
  description: 'Join the graduate engineering programme and work across services and developer tools. The campus selection includes aptitude, coding, and a technical conversation.',
  requirements: ['Final-year student', 'DSA and problem-solving foundations', 'One complete project to discuss'],
  deadline: '2026-11-18',
  duration: 'Campus · 18 Nov',
  posted: 'Drive announced today'
}, {
  id: 'data',
  company: 'Datafold Studio',
  initial: 'd',
  color: 'peach',
  title: 'Data Analyst Apprentice',
  location: 'Pune · Hybrid',
  type: 'Apprenticeship',
  channel: 'Off campus',
  years: [1, 2, 3, 4],
  skills: ['Databases', 'Communication'],
  description: 'Learn to clean data, ask useful questions, and build dashboards that help a team make decisions.',
  requirements: ['Basic SQL', 'Comfort with spreadsheets', 'A small analysis project'],
  deadline: '2026-11-14',
  duration: '6 months',
  posted: 'Yesterday'
}, {
  id: 'cloud',
  company: 'Cloudnest',
  initial: 'c',
  color: 'pink',
  title: 'Platform Engineering Intern',
  location: 'Remote · India',
  type: 'Internship',
  channel: 'Off campus',
  years: [2, 3, 4],
  skills: ['DevOps', 'Backend'],
  description: 'Explore how applications are deployed and monitored. Learn container basics, automation, and reliable delivery with a mentor.',
  requirements: ['Git and command-line basics', 'An interest in Linux and containers', 'Willingness to document what you learn'],
  deadline: '2026-11-22',
  duration: '4 months',
  posted: '1 day ago'
}];
const courseCheckpoints = Object.entries(curriculum).flatMap(([course, lessons]) => Array.from({
  length: Math.ceil(lessons.length / 6)
}, (_, block) => ({
  id: `checkpoint-${course}-${block + 1}`,
  title: `${courses.find(c => c.id === course).title} · checkpoint ${block + 1}`,
  topic: courses.find(c => c.id === course).category,
  label: 'Course checkpoint',
  questions: lessons.slice(block * 6, block * 6 + 6).map(l => ({
    text: l.title + '\n' + l.example + '\n' + l.question,
    options: l.options,
    correct: l.correct,
    explanation: l.explanation
  }))
})));
export const quizzes = [...baseQuizzes, ...coreQuizzes, ...courseCheckpoints, ...roleQuizzes].map(q => q.id.includes('aptitude') ? {
  ...q,
  topic: 'Aptitude'
} : q);
export const projects = [{
  id: 'campus',
  title: 'Campus, connected.',
  subtitle: 'A useful campus companion',
  category: 'Full stack',
  color: 'purple',
  skills: ['Frontend', 'Backend', 'Databases'],
  level: 'Intermediate',
  weeks: '3–4 weeks',
  description: 'Build a campus event board where students discover events, save a spot, and connect with a team. A real problem, a complete product, and a story worth telling.',
  steps: ['Define the student flow and sketch three screens', 'Build a responsive event listing', 'Create an API and connect a database', 'Add registration and input validation', 'Test the complete journey and deploy', 'Write a README with decisions and screenshots']
}, {
  id: 'spend',
  title: 'Where did it go?',
  subtitle: 'Your personal spending dashboard',
  category: 'Frontend',
  color: 'peach',
  skills: ['Frontend', 'Databases'],
  level: 'Beginner',
  weeks: '2–3 weeks',
  description: 'Make a small expense tracker with clear charts, category filters, and persistent transactions. Focus on a polished, accessible experience.',
  steps: ['Sketch the dashboard and transaction form', 'Create category and date filters', 'Add charts and budget indicators', 'Persist and validate transactions', 'Test on mobile and publish your README']
}, {
  id: 'insight',
  title: 'Data with a story.',
  subtitle: 'An exploratory data investigation',
  category: 'Data',
  color: 'mint',
  skills: ['Databases', 'Communication'],
  level: 'Beginner',
  weeks: '2 weeks',
  description: 'Choose an open dataset, ask three interesting questions, and present your findings with clear, honest visualizations.',
  steps: ['Choose a dataset and document its source', 'Clean missing values and inspect distributions', 'Answer three questions with SQL or Python', 'Create readable charts', 'Write a short findings report with limitations']
}, {
  id: 'deploy',
  title: 'From local to live.',
  subtitle: 'A tiny deployment pipeline',
  category: 'DevOps',
  color: 'blue',
  skills: ['DevOps', 'Backend'],
  level: 'Intermediate',
  weeks: '2–3 weeks',
  description: 'Take a small application from a local machine to an automated, documented delivery workflow.',
  steps: ['Create a small health-check service', 'Write a container configuration', 'Add automated checks', 'Set up a deployment workflow', 'Document monitoring and rollback']
}];
projects.push({
  id: 'fraud-baseline',
  title: 'Explainable fraud baseline',
  subtitle: 'An honest machine-learning experiment',
  category: 'Data',
  color: 'mint',
  skills: ['Backend', 'Databases', 'Communication'],
  level: 'Intermediate',
  weeks: '4–6 weeks',
  tags: ['Data science'],
  description: 'Build a reproducible classification baseline with explicit prediction timing, a data contract and an evaluation report.',
  steps: ['Document dataset license, prediction moment and leakage risks', 'Split by time or entity and implement a reproducible data pipeline', 'Fit a simple baseline and report class balance', 'Compare precision, recall and threshold costs on held-out data', 'Write model limitations and test invalid serving inputs', 'Package the model, experiment report and a reproducible README']
}, {
  id: 'revenue-investigation',
  title: 'Revenue, reconciled',
  subtitle: 'A metric layer and decision dashboard',
  category: 'Data',
  color: 'peach',
  skills: ['Databases', 'Communication'],
  level: 'Intermediate',
  weeks: '3–4 weeks',
  tags: ['Data analytics', 'Data science'],
  description: 'Reconcile orders, captured payments and refunds into documented metrics with a dashboard that exposes data quality.',
  steps: ['Write the grain and keys for orders, payments and refunds', 'Create duplicate, missing-value and reconciliation checks', 'Build SQL metrics without multiplying joined amounts', 'Compare comparable cohorts and explain rate versus volume changes', 'Build a dashboard with units, date filters and accessible charts', 'Publish findings, assumptions and a reproducible refresh procedure']
}, {
  id: 'reliable-service',
  title: 'The service stays up',
  subtitle: 'A practical reliability lab',
  category: 'DevOps',
  color: 'blue',
  skills: ['DevOps', 'Backend'],
  level: 'Advanced',
  weeks: '4–5 weeks',
  tags: ['DevOps', 'Full-stack development'],
  description: 'Build and operate a small service with measurable health, bounded retries, durable work and recovery drills.',
  steps: ['Define a service-level goal and instrument request latency', 'Containerize the service with separate configuration and secrets', 'Implement a durable job with idempotent retry behavior', 'Simulate dependency timeouts and verify bounded failure handling', 'Run a database and attachment backup/restore drill', 'Document an incident, rollback trigger and release verification']
}, {
  id: 'api-design',
  title: 'A booking API that keeps its promises',
  subtitle: 'Concurrency, contracts and tests',
  category: 'Full stack',
  color: 'purple',
  skills: ['Backend', 'Databases', 'DevOps'],
  level: 'Advanced',
  weeks: '4–6 weeks',
  tags: ['Full-stack development'],
  description: 'Build a documented booking API that protects capacity and identity when requests arrive concurrently.',
  steps: ['Define resources, error responses and tenant authorization', 'Model bookings, capacity and uniqueness constraints', 'Implement atomic booking and cancellation transactions', 'Write race-condition and cross-tenant regression tests', 'Add pagination, idempotency and rate limits', 'Publish an API guide, load measurements and deployment notes']
}, {
  id: 'algorithm-explorer',
  title: 'Watch an algorithm think',
  subtitle: 'A visual teaching tool with real checks',
  category: 'Frontend',
  color: 'blue',
  skills: ['DSA', 'Frontend', 'Communication'],
  level: 'Beginner',
  weeks: '2–3 weeks',
  tags: ['Full-stack development', 'Explore my interests'],
  description: 'Create an accessible visual explorer for sorting or graph traversal with deterministic examples and a written complexity analysis.',
  steps: ['Choose one algorithm and trace three small inputs by hand', 'Implement a pure algorithm that emits named steps', 'Build play, pause and single-step keyboard controls', 'Show complexity and edge cases beside the visualization', 'Test empty, duplicate and boundary inputs', 'Publish your source, examples and explanation']
});
export const legacyEvents = [{
  id: 'buildathon',
  title: 'Build something that matters.',
  name: 'Campus Buildathon 2026',
  type: 'Hackathon',
  day: 23,
  month: 'OCT',
  date: '2026-10-23',
  time: '9:00 AM – 6:00 PM',
  location: 'Innovation Hub · Northstar campus',
  color: 'purple',
  label: '48 HOURS. ONE BIG IDEA.',
  attendees: 128,
  description: 'Bring a curious mind and leave with a working idea. Meet your team, find a campus problem, and build a prototype with support from student mentors.',
  agenda: ['Friday · Ideas, team matching, and kickoff', 'Saturday · Build sessions and mentor hours', 'Sunday · Demos, feedback, and a celebration'],
  recommendedYears: [1, 2, 3]
}, {
  id: 'design',
  title: 'A better first impression.',
  name: 'Design for Developers',
  type: 'Workshop',
  day: 26,
  month: 'OCT',
  date: '2026-10-26',
  time: '3:00 PM – 5:00 PM',
  location: 'Online · Campus design club',
  color: 'peach',
  label: 'MAKE IT SIMPLE. MAKE IT USEFUL.',
  attendees: 64,
  description: 'A hands-on session on spacing, hierarchy, and accessible interfaces. Bring a screen you want to improve.',
  agenda: ['15 min · What makes a clear interface', '60 min · Redesign a small screen', '30 min · Peer feedback and next steps'],
  recommendedYears: [1, 2, 3]
}, {
  id: 'opensource',
  title: 'Your first pull request.',
  name: 'Open Source, Open Doors',
  type: 'Meetup',
  day: 2,
  month: 'NOV',
  date: '2026-11-02',
  time: '10:00 AM – 12:30 PM',
  location: 'Library Makerspace · Northstar campus',
  color: 'mint',
  label: 'A SMALL CONTRIBUTION. A GREAT START.',
  attendees: 42,
  description: 'Find a beginner-friendly issue, understand a repository, and make a useful first contribution with a buddy.',
  agenda: ['Find a project and read its contribution guide', 'Make and test a small change', 'Write a clear pull request'],
  recommendedYears: [1, 2, 3]
}];
export const people = [{
  id: 'me',
  name: 'Aarav Shah',
  handle: 'aarav.builds',
  year: 3,
  initials: 'AS',
  color: 'purple',
  bio: 'Learning by building. Currently making friends with the backend.',
  college: 'Northstar Institute of Technology',
  studentId: 'NIT23CS047',
  followers: 248,
  following: 186,
  track: 'Full-stack development'
}, {
  id: 'riya',
  name: 'Riya Mehta',
  handle: 'riya.codes',
  year: 3,
  initials: 'RM',
  color: 'peach',
  bio: 'Frontend, good interfaces, and too many side projects.',
  college: 'Northstar Institute of Technology',
  studentId: 'NIT23CS028',
  followers: 326,
  following: 142,
  track: 'Frontend development'
}, {
  id: 'kabir',
  name: 'Kabir Sethi',
  handle: 'kabir.dev',
  year: 2,
  initials: 'KS',
  color: 'blue',
  bio: 'One problem at a time. Looking for a buildathon team.',
  college: 'Northstar Institute of Technology',
  studentId: 'NIT24CS019',
  followers: 94,
  following: 118,
  track: 'Full-stack development'
}, {
  id: 'ananya',
  name: 'Ananya Rao',
  handle: 'ananya.data',
  year: 4,
  initials: 'AR',
  color: 'mint',
  bio: 'Making sense of data. Happy to help with SQL.',
  college: 'Northstar Institute of Technology',
  studentId: 'NIT22CS061',
  followers: 512,
  following: 203,
  track: 'Data science'
}, {
  id: 'dev',
  name: 'Dev Patel',
  handle: 'dev.explores',
  year: 1,
  initials: 'DP',
  color: 'pink',
  bio: 'New here. Exploring code, design, and everything in between.',
  college: 'Northstar Institute of Technology',
  studentId: 'NIT26CS012',
  followers: 38,
  following: 72,
  track: 'Exploring'
}];
export const interviewQuestions = [{
  id: 'intro',
  question: 'Tell me about yourself and a project you enjoyed building.',
  tips: ['Start with your current focus.', 'Explain the problem your project solves.', 'Describe one decision you made and what you learned.'],
  keywords: ['project', 'built', 'learn', 'problem']
}, {
  id: 'api',
  question: 'Imagine your frontend needs to show a list of campus events. How would you design the API?',
  tips: ['Describe a resource and an HTTP method.', 'Think about filtering, pagination, and errors.', 'Explain how the frontend handles loading and empty states.'],
  keywords: ['get', 'event', 'error', 'page']
}, {
  id: 'tradeoff',
  question: 'Tell me about a time you got stuck. How did you decide what to try next?',
  tips: ['Use a specific example.', 'Describe what you tried and how you evaluated it.', 'Close with the outcome and what you would change.'],
  keywords: ['try', 'learn', 'result', 'help']
}];
export const jobs = mergeEmployerOpportunities(verifiedJobs, employerOpportunities);
export const events = realEvents;
const library = verifiedProblems.map(meta => ({
  ...problems.find(p => p.id === meta.id),
  ...meta,
  company: 'LeetCode'
}));
export const catalog = {
  assessmentLabs,
  courses,
  problems: library,
  quizzes: quizzes.map(({
    questions,
    ...quiz
  }) => ({
    ...quiz,
    questions: questions.map(({
      correct,
      explanation,
      ...question
    }) => question)
  })),
  jobs,
  projects,
  events,
  people,
  tracks,
  interviewQuestions,
  skillColors,
  companies,
  programs,
  verifiedAt
};
