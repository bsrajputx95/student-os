import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const output = new URL('../shared/content/', import.meta.url);
mkdirSync(output, {
  recursive: true
});
const cache = new URL('../.runtime/research/leetcode-topics.json', import.meta.url);
let questions = existsSync(cache) ? JSON.parse(readFileSync(cache, 'utf8')).problemsetQuestionList.questions : [];
const query = 'query Library($skip:Int!){problemsetQuestionList:questionList(categorySlug:"",limit:100,skip:$skip,filters:{}){total:totalNum questions:data{questionFrontendId title titleSlug difficulty isPaidOnly topicTags{name slug} acRate}}}';
for (let start = 100; start < 4100; start += 400) {
  const batch = await Promise.allSettled(Array.from({
    length: Math.min(4, Math.ceil((4100 - start) / 100))
  }, (_, i) => start + i * 100).map(async skip => {
    const response = await fetch('https://leetcode.com/graphql/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        variables: {
          skip
        }
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error(`${response.status}`);
    const json = await response.json();
    return json.data.problemsetQuestionList.questions;
  }));
  for (const result of batch) if (result.status === 'fulfilled') questions.push(...result.value);
  console.log(`Read ${questions.length} public catalog entries`);
}
if (questions.length < 1000) throw new Error('Import incomplete: leaving existing catalog unchanged.');
const local = {
  'two-sum': 'two-sum',
  'valid-parentheses': 'valid-parentheses',
  'best-time-to-buy-and-sell-stock': 'max-profit',
  'product-of-array-except-self': 'product-array',
  'longest-substring-without-repeating-characters': 'longest-substring',
  'climbing-stairs': 'climbing-stairs'
};
const unique = [...new Map(questions.filter(q => !q.isPaidOnly && /^\d+$/.test(q.questionFrontendId)).map(q => [q.titleSlug, q])).values()];
const problems = unique.map(q => ({
  id: local[q.titleSlug] || `lc-${q.questionFrontendId}`,
  number: Number(q.questionFrontendId),
  title: q.title,
  difficulty: q.difficulty,
  topic: q.topicTags?.[0]?.name || 'Algorithms',
  topics: q.topicTags?.map(t => t.name) || ['Algorithms'],
  source: 'LeetCode',
  sourceUrl: `https://leetcode.com/problems/${q.titleSlug}/`,
  acceptance: Math.round(q.acRate || 0),
  minutes: q.difficulty === 'Easy' ? 20 : q.difficulty === 'Medium' ? 35 : 50,
  skill: 'DSA',
  external: !local[q.titleSlug],
  verifiedAt: '2026-10-19'
})).sort((a, b) => a.number - b.number);
writeFileSync(new URL('problems.json', output), JSON.stringify(problems));
writeFileSync(new URL('provenance.json', output), JSON.stringify({
  verifiedAt: '2026-10-19',
  problems: {
    count: problems.length,
    source: 'https://leetcode.com/problemset/',
    method: 'Public question metadata. Premium problems and copyrighted problem statements are not imported.'
  }
}, null, 2));
console.log(`Imported ${problems.length} free LeetCode problem links with topic tags.`);
