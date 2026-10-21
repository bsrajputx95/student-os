import { advancedLessonNames } from './advanced-course-metadata.js';
export const pathPresets = {
  'Full-stack development': {
    destination: 'Backend basecamp',
    focus: 'Backend',
    skills: ['Frontend', 'DSA', 'Backend'],
    course: 'react',
    project: 'campus',
    task: 'Give your project its first API',
    detail: 'Campus, connected. · Build your event endpoint.',
    quiz: 'js-basics'
  },
  'Data science': {
    destination: 'The data discovery lab',
    focus: 'Databases',
    skills: ['Databases', 'Backend', 'DSA'],
    course: 'python',
    project: 'insight',
    task: 'Find a story in your first dataset',
    detail: 'Data with a story. · Ask three useful questions.',
    quiz: 'sql-check'
  },
  'Data analytics': {
    destination: 'Insight lookout',
    focus: 'Databases',
    skills: ['Databases', 'Communication', 'DSA'],
    course: 'sql',
    project: 'insight',
    task: 'Turn a small dataset into an insight',
    detail: 'Data with a story. · Write a useful SQL query.',
    quiz: 'sql-check'
  },
  'DevOps': {
    destination: 'Your first deployment',
    focus: 'DevOps',
    skills: ['DevOps', 'Backend', 'Databases'],
    course: 'devops',
    project: 'deploy',
    task: 'Give your project a delivery pipeline',
    detail: 'From local to live. · Plan a repeatable deployment.',
    quiz: 'js-basics'
  },
  'Explore my interests': {
    destination: 'Discovery meadow',
    focus: 'Frontend',
    skills: ['DSA', 'Frontend', 'Databases'],
    course: 'javascript',
    project: 'spend',
    task: 'Build a tiny idea and see what clicks',
    detail: 'Try a small spending tracker. Let curiosity lead.',
    quiz: 'dsa-patterns'
  }
};
export function getPath(track) {
  return pathPresets[track] || pathPresets['Explore my interests'];
}
export const lessonNames = {
  react: ['Think in components', 'Your first component', 'A little JSX', 'Pass data with props', 'Compose a useful card', 'Render a list', 'Give every item a key', 'Respond to a click', 'Make room for state', 'Update an object safely', 'Keep forms in sync', 'Lift shared state', 'Design the loading state', 'Handle an empty list', 'Pass data through your interface', 'Build a reusable input', 'Understand an effect', 'Fetch a list of events', 'Handle a failed request', 'Extract a custom hook', 'Make keyboard access work', 'Test the important interaction', 'Polish the small-screen layout', 'Ship your little interface'],
  javascript: ['Meet your first values', 'Variables that tell a story', 'Strings and numbers', 'Make a choice with if', 'Repeat a useful step', 'Write your first function', 'Return a useful result', 'Arrays as numbered boxes', 'Transform with map', 'Keep what matters with filter', 'Objects and their properties', 'Understand lexical scope', 'Closures, one example at a time', 'Promises and waiting', 'Async and await', 'Handle a failed operation', 'Work with a browser event', 'Build a tiny application'],
  sql: ['Think in tables', 'Select what you need', 'Filter with WHERE', 'Sort the useful bits', 'Work with missing values', 'Count and summarize', 'Group to find patterns', 'Filter a group with HAVING', 'Give a column a clear name', 'Connect two tables', 'Keep unmatched rows', 'Understand primary keys', 'Define a useful relationship', 'Design a small schema', 'Write a subquery', 'Investigate your first dataset'],
  dsa: ['Start with a small example', 'Describe time complexity', 'Read an array carefully', 'Keep a map of what you know', 'Two pointers, one clear idea', 'Try a sliding window', 'Strings and repeated characters', 'Remember with a stack', 'Work in first-in-first-out order', 'Search a sorted space', 'Compare sorting strategies', 'Write a recursive base case', 'Trace a recursive call', 'Linked lists, node by node', 'Reverse a small list', 'Meet your first tree', 'Traverse depth first', 'Traverse breadth first', 'Find a place in a search tree', 'Keep priorities in a heap', 'Represent a graph', 'Visit connected nodes', 'Recognize overlapping work', 'Memoize a recursive answer', 'Build a bottom-up table', 'Choose a useful state', 'Work through a greedy choice', 'Try a backtracking decision', 'Explain your tradeoffs', 'Mix the patterns in a checkpoint'],
  python: ['Hello, a little Python', 'Name your values', 'Work with text', 'Make a choice', 'Repeat with a loop', 'Define a useful function', 'Remember a list', 'Look things up in a dictionary', 'Work with a tuple', 'Keep unique values in a set', 'Read a small file', 'Handle a missing file', 'Write a clear comprehension', 'Import a useful module', 'Understand a simple class', 'Explore a CSV dataset', 'Inspect missing values', 'Ask a question of the data', 'Transform a column', 'Draw a useful chart', 'Explain your findings', 'Package your little investigation'],
  devops: ['Understand a delivery journey', 'A useful Git workflow', 'Read a process and a port', 'Write a health check', 'Meet your first container', 'Build a repeatable image', 'Configure an environment', 'Keep a secret out of Git', 'Automate useful checks', 'Ship a version', 'Observe what happened', 'Plan a safe rollback']
};
Object.assign(lessonNames, advancedLessonNames);
