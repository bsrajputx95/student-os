// Public role discovery and routing metadata; scored answers live on the server.
const role = (id, name, track, skills, topics, courses, labs, companies, focus, interview) => ({
  id,
  name,
  track,
  skills,
  topics,
  courses,
  labs,
  companies,
  focus,
  interview,
  quizId: 'role-' + id
});
export const practiceRoles = [role('data-analyst', 'Data analyst', 'Data analytics', ['Databases', 'Communication'], ['Database', 'Array', 'Hash Table', 'Sorting'], ['sql', 'analytics', 'statistics', 'python'], ['net-revenue', 'duplicate-events', 'customer-average', 'department-ranking'], ['google', 'microsoft', 'walmart-global-tech', 'jpmorganchase', 'salesforce'], 'SQL, reliable metrics, dashboards and business decisions.', 'Revenue grew while conversion fell. How would you investigate and explain the result?'), role('business-analyst', 'Business analyst', 'Data analytics', ['Communication', 'Databases'], ['Database', 'Math', 'Sorting'], ['analytics', 'statistics', 'sql'], ['net-revenue', 'customer-average', 'duplicate-events'], ['jpmorganchase', 'sap', 'salesforce', 'oracle', 'walmart-global-tech'], 'Requirements, process mapping, metrics and stakeholder communication.', 'Two stakeholders disagree about the success metric. How would you reach a testable requirement?'), role('data-scientist', 'Data scientist', 'Data science', ['Databases', 'Backend', 'Communication'], ['Database', 'Math', 'Probability and Statistics', 'Array', 'Hash Table'], ['statistics', 'machine-learning', 'python', 'analytics'], ['customer-average', 'net-revenue', 'department-ranking'], ['google', 'microsoft', 'nvidia', 'meta', 'uber'], 'Statistics, experiments, leakage-free evaluation and model interpretation.', 'Your fraud model has 99% accuracy and finds almost no fraud. Design a better evaluation.'), role('ml-engineer', 'Machine learning engineer', 'Data science', ['Backend', 'DevOps', 'Databases'], ['Array', 'Hash Table', 'Math', 'Binary Search'], ['machine-learning', 'python', 'system-design', 'devops'], ['retry-storm', 'tenant-isolation', 'inventory-atomicity'], ['nvidia', 'google', 'microsoft', 'meta', 'qualcomm'], 'Model serving, feature contracts, monitoring and reproducible pipelines.', 'A model works offline but fails in serving. How do you separate data, model and infrastructure causes?'), role('data-engineer', 'Data engineer', 'Data science', ['Databases', 'Backend', 'DevOps'], ['Database', 'Array', 'Hash Table', 'Heap (Priority Queue)'], ['sql', 'python', 'system-design', 'analytics'], ['duplicate-events', 'latest-payment', 'net-revenue', 'tenant-isolation'], ['amazon', 'google', 'microsoft', 'oracle', 'sap'], 'SQL, idempotent pipelines, data quality and dependable delivery.', 'A batch is replayed after a crash. How do you prevent duplicate records and prove the recovery is correct?'), role('devops-engineer', 'DevOps engineer', 'DevOps', ['DevOps', 'Backend'], ['Shell', 'Concurrency', 'Queue', 'Hash Table'], ['linux', 'networks', 'devops', 'system-design'], ['retry-storm', 'webhook-replay', 'inventory-atomicity'], ['amazon', 'microsoft', 'google', 'cisco', 'ibm'], 'Linux, CI/CD, observability, incident response and rollback.', 'A deployment causes intermittent 502 errors. Walk through your first ten minutes and rollback criteria.'), role('cloud-engineer', 'Cloud engineer', 'DevOps', ['DevOps', 'Backend', 'Databases'], ['Shell', 'Concurrency', 'Queue', 'Database'], ['networks', 'linux', 'system-design', 'devops'], ['retry-storm', 'tenant-isolation', 'inventory-atomicity'], ['amazon', 'microsoft', 'google', 'oracle', 'ibm'], 'Networking, least privilege, scaling, availability and cloud cost tradeoffs.', 'Design a small resilient service across failure zones. Explain access, backups, cost and recovery.'), role('cybersecurity-analyst', 'Cybersecurity analyst', 'DevOps', ['DevOps', 'Backend', 'Communication'], ['Shell', 'Hash Table', 'String', 'Database'], ['networks', 'linux', 'system-design'], ['tenant-isolation', 'webhook-replay', 'duplicate-events'], ['cisco', 'microsoft', 'ibm', 'google', 'jpmorganchase'], 'Access control, security logs, threat reasoning and incident evidence.', 'An API returns another tenant’s order. Explain containment, authorization checks and a regression test.'), role('backend-developer', 'Backend developer', 'Full-stack development', ['Backend', 'Databases', 'DSA'], ['Hash Table', 'Database', 'Queue', 'Concurrency', 'Tree', 'Array'], ['system-design', 'sql', 'javascript', 'networks'], ['webhook-replay', 'refund-boundary', 'tenant-isolation', 'inventory-atomicity'], ['stripe', 'amazon', 'uber', 'oracle', 'jpmorganchase'], 'APIs, transactions, concurrency, data modeling and reliable services.', 'Two requests buy the last seat at the same time. Explain the invariant and a safe database operation.'), role('frontend-developer', 'Frontend developer', 'Full-stack development', ['Frontend', 'DSA', 'Communication'], ['Array', 'String', 'Hash Table', 'Stack'], ['react', 'javascript', 'networks'], ['retry-storm', 'tenant-isolation'], ['adobe', 'atlassian', 'microsoft', 'meta', 'salesforce'], 'Components, accessible interfaces, state, performance and browser behavior.', 'An old search result replaces a newer result. Explain the race and how you would test the fix.'), role('fullstack-developer', 'Full-stack developer', 'Full-stack development', ['Frontend', 'Backend', 'Databases', 'DSA'], ['Array', 'String', 'Hash Table', 'Database', 'Tree', 'Graph'], ['react', 'javascript', 'sql', 'system-design'], ['webhook-replay', 'refund-boundary', 'inventory-atomicity', 'tenant-isolation', 'retry-storm'], ['atlassian', 'stripe', 'amazon', 'microsoft', 'servicenow'], 'Build an accessible interface, a reliable API and a correct data model.', 'Design an event-registration flow end to end, including validation, concurrent requests and recovery.'), role('ui-ux-designer', 'UI / UX designer', 'Explore my interests', ['Frontend', 'Communication'], ['Array', 'String'], ['react', 'analytics', 'javascript'], [], ['adobe', 'apple', 'atlassian', 'microsoft', 'intuit'], 'User research, accessible interaction, information architecture and usability.', 'Students cannot find an assignment deadline. How would you research, redesign and validate the flow?'), role('mobile-developer', 'Mobile developer', 'Full-stack development', ['Frontend', 'Backend', 'DSA'], ['Array', 'String', 'Hash Table', 'Queue'], ['javascript', 'system-design', 'networks'], ['retry-storm', 'webhook-replay', 'tenant-isolation'], ['apple', 'google', 'meta', 'uber', 'qualcomm'], 'Mobile interaction, offline state, API sync and performance.', 'A user submits a payment while offline and retries later. How should the app synchronize safely?'), role('qa-engineer', 'QA / automation engineer', 'Full-stack development', ['Backend', 'Frontend', 'Communication'], ['String', 'Array', 'Database', 'Hash Table'], ['javascript', 'python', 'sql', 'system-design'], ['webhook-replay', 'refund-boundary', 'inventory-atomicity', 'retry-storm', 'tenant-isolation'], ['atlassian', 'servicenow', 'salesforce', 'adobe', 'ibm'], 'Risk-based tests, API/UI automation, boundary cases and reproducible defects.', 'Create a test strategy for refunds, including boundaries, retries, concurrency and a useful bug report.'), role('software-engineer', 'Software engineer', 'Explore my interests', ['DSA', 'Backend', 'Communication'], ['Array', 'String', 'Hash Table', 'Tree', 'Graph', 'Dynamic Programming'], ['dsa', 'javascript', 'python', 'system-design'], ['inventory-atomicity', 'retry-storm', 'webhook-replay'], ['google', 'microsoft', 'amazon', 'apple', 'meta'], 'Algorithms, clear reasoning, testing and software design foundations.', 'Compare two ways to find duplicates. Explain complexity, edge cases and how you would test them.')];
export function practiceRole(id) {
  return practiceRoles.find(r => r.id === id);
}
export function recommendedRole(profile) {
  return practiceRole(profile.practiceRole) || practiceRole({
    'Data science': 'data-scientist',
    'Data analytics': 'data-analyst',
    'DevOps': 'devops-engineer',
    'Full-stack development': 'fullstack-developer'
  }[profile.track] || 'software-engineer');
}
export function practiceScope(state, selection = {}) {
  const role = practiceRole(selection.roleId) || recommendedRole(state.profile);
  const scores = state.metrics?.readinessDetails?.skillScores || {};
  const weak = [...role.skills].sort((a, b) => (scores[a] || 0) - (scores[b] || 0)).slice(0, 2);
  const level = selection.level === 'auto' || !selection.level ? state.profile.year === 1 ? 'Foundation' : state.profile.year === 4 ? 'All levels' : 'Intermediate' : selection.level;
  return {
    role,
    roleId: selection.roleId || role.id,
    all: selection.roleId === 'all',
    level,
    focus: selection.focus || 'recommended',
    weak
  };
}
export function matchesLevel(difficulty, scope) {
  return scope.level === 'All levels' || !difficulty || difficulty === 'Mixed' || ({
    Easy: 'Foundation',
    Medium: 'Intermediate',
    Hard: 'Advanced'
  }[difficulty] || difficulty) === scope.level;
}
export function matchesPracticeProblem(p, scope) {
  const gapTopics = {
    DSA: scope.role.topics,
    Frontend: ['Array', 'String', 'Stack'],
    Backend: ['Hash Table', 'Queue', 'Concurrency', 'Tree'],
    Databases: ['Database'],
    DevOps: ['Shell', 'Concurrency', 'Queue']
  };
  const relevant = scope.focus === 'gaps' ? scope.weak.flatMap(s => gapTopics[s] || []) : scope.role.topics;
  return matchesLevel(p.difficulty, scope) && (scope.all || p.topics.some(t => scope.role.topics.includes(t) && relevant.includes(t)));
}
export function matchesPracticeQuiz(q, scope) {
  if (!matchesLevel(q.difficulty, scope)) return false;
  if (scope.all) return true;
  if (q.roleId) return q.roleId === scope.role.id;
  return (scope.focus === 'gaps' ? scope.weak : scope.role.skills).includes(q.topic) || ['Communication', 'Aptitude'].includes(q.topic);
}
export function matchesPracticeLab(l, scope) {
  return matchesLevel(l.difficulty, scope) && (scope.all || scope.role.labs.includes(l.id)) && (scope.focus !== 'gaps' || scope.weak.includes(l.skill));
}
