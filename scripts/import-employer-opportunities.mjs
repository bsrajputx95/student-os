import { writeFileSync, renameSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// GET-only public metadata import. No applications or full job adverts are imported.
export const employerBoards = [{
  token: 'stripe',
  company: 'Stripe',
  official: 'https://stripe.com/careers/search',
  color: 'purple',
  domains: ['stripe.com', 'www.stripe.com'],
  origin: 'embedded-ids'
}, {
  token: 'cloudflare',
  company: 'Cloudflare',
  official: 'https://www.cloudflare.com/careers/jobs/',
  color: 'peach',
  domains: [],
  origin: 'careers-component'
}, {
  token: 'databricks',
  company: 'Databricks',
  official: 'https://www.databricks.com/company/careers/open-positions',
  color: 'pink',
  domains: ['databricks.com', 'www.databricks.com'],
  origin: 'employer-job'
}, {
  token: 'mongodb',
  company: 'MongoDB',
  official: 'https://www.mongodb.com/company/careers/see-jobs',
  color: 'mint',
  domains: ['mongodb.com', 'www.mongodb.com'],
  origin: 'embedded-feed'
}, {
  token: 'figma',
  company: 'Figma',
  official: 'https://www.figma.com/careers/',
  color: 'blue',
  domains: ['figma.com', 'www.figma.com'],
  origin: 'embedded-board'
}];
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const include = /\b(intern(ship)?|graduate|new[ -]grad|apprentice(ship)?|early[ -]career|university|engineer i|associate)\b/i;
const exclude = /\b(senior|sr\.?|staff|lead|principal|manager|director|counsel|legal|recruiter|sales|hr|people|account executive|marketing|comms|high school|phd|ph\.d\.|engineer ii|engineer iii|tse ii|tse iii)\b/i;
export const eligibleTitle = title => include.test(title) && !exclude.test(title);
const technical = /engineer|software|data|design|security|technical|tech operations|infrastructure/i;
const india = /\b(india|bengaluru|bangalore|gurugram|gurgaon|hyderabad|pune|mumbai|chennai|noida|delhi)\b/i;
export function inferCountry(location) {
  const countries = [['India', india], ['United States', /\b(united states|usa|u\.s\.|san francisco|seattle|new york|nyc|austin|texas|california|washington|bellevue|mountain view|chicago|san jose)\b/i], ['Canada', /\b(canada|toronto|vancouver|montreal)\b/i], ['United Kingdom', /\b(united kingdom|uk|london|england)\b/i], ['Ireland', /\b(ireland|dublin)\b/i], ['Singapore', /\bsingapore\b/i], ['Netherlands', /\b(netherlands|amsterdam)\b/i], ['Germany', /\b(germany|berlin|munich)\b/i], ['Denmark', /\b(denmark|aarhus)\b/i], ['Serbia', /\b(serbia|belgrade)\b/i], ['Spain', /\b(spain|barcelona|madrid)\b/i], ['Italy', /\b(italy|milan)\b/i], ['Mexico', /\b(mexico|cdmx)\b/i], ['Portugal', /\b(portugal|lisbon)\b/i], ['France', /\b(france|paris)\b/i], ['Poland', /\b(poland|warsaw)\b/i], ['Romania', /\b(romania|bucharest)\b/i]].filter(([, pattern]) => pattern.test(location)).map(([country]) => country);
  return countries.length ? countries.join(' / ') : 'See employer posting';
}
function preparationTags(title) {
  if (/design/i.test(title)) return ['Frontend', 'Communication'];
  if (/data scientist|data science|machine learning|ai applied/i.test(title)) return ['Databases', 'Backend', 'Communication'];
  if (/data engineer/i.test(title)) return ['Databases', 'Backend', 'DevOps'];
  if (/data analyst|finance|pricing|monetization|risk/i.test(title)) return ['Databases', 'Communication'];
  if (/security|cloud|technical services|reliability|infrastructure/i.test(title)) return ['DevOps', 'Backend', 'Communication'];
  if (/front.?end/i.test(title)) return ['Frontend', 'DSA', 'Communication'];
  if (/software|engineer/i.test(title)) return ['DSA', 'Backend', 'Communication'];
  return ['Communication', 'Databases'];
}
const metadataValue = (job, name) => {
  const value = job.metadata?.find(m => m.name === name)?.value;
  return Array.isArray(value) ? value.map(clean).filter(Boolean).join(' · ') : clean(value);
};
export function normalizeOpportunity(job, board, department, retrievedAt) {
  const title = clean(job.title),
    postedLocation = metadataValue(job, 'Job Posting Location');
  const location = postedLocation || clean(job.location?.name) || 'See employer posting';
  const type = /\bapprentice(ship)?\b/i.test(title) ? 'Apprenticeship' : /\bintern(ship)?\b/i.test(title) ? 'Internship' : 'Full-time';
  const category = (clean(department) || metadataValue(job, 'Career Site Department') || metadataValue(job, 'Career Page Posting Category')).replace(/^\d+[-\s]+/, '');
  const checkDate = retrievedAt.slice(0, 10);
  return {
    id: 'gh-' + board.token + '-' + job.id,
    company: board.company,
    title,
    location,
    country: inferCountry(location),
    type,
    years: type === 'Full-time' ? [4] : [1, 2, 3, 4],
    duration: 'Confirm term and start date with employer',
    sourceUrl: job.absolute_url,
    eligibility: 'Explore by study year, then verify the employer’s degree, graduation window, experience, location and work-authorization requirements. A matching title or year filter does not establish eligibility.',
    description: `Explore ${board.company}’s ${title} role${category ? ' in ' + category : ''}, listed for ${location}. Review the employer’s posting for responsibilities, qualifications and the application process.`,
    requirements: ['Check degree, graduation window and experience requirements on the employer posting.', 'Confirm location, language, availability and work-authorization rules before applying.'],
    skills: preparationTags(title),
    skillBasis: 'StudentOS preparation tags inferred from the public title, not verified employer requirements.',
    initial: board.company.split(/\s+/).map(s => s[0]).slice(0, 2).join(''),
    color: board.color,
    channel: 'Off campus',
    posted: 'Checked ' + checkDate,
    verifiedAt: checkDate,
    retrievedAt,
    source: 'Employer public Greenhouse board',
    sourceKind: 'employer',
    deadline: typeof job.application_deadline === 'string' ? job.application_deadline.slice(0, 10) : null,
    status: 'Listed on source',
    sourceBoard: board.token,
    sourcePostingId: String(job.id),
    sourceUpdatedAt: job.updated_at || null,
    sourcePublishedAt: job.first_published || null,
    ...(category ? {
      department: category
    } : {})
  };
}
export { mergeEmployerOpportunities } from '../shared/opportunity-snapshot.js';
async function get(url, json = false) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    headers: {
      Accept: json ? 'application/json' : 'text/html'
    }
  });
  if (!response.ok) throw new Error('Source failed (' + response.status + '): ' + url);
  const text = await response.text();
  if (text.length > 12000000) throw new Error('Source response exceeded metadata limit: ' + url);
  return json ? JSON.parse(text) : {
    text,
    url: response.url
  };
}
function sourceAllowed(job, board) {
  if (job.company_name && clean(job.company_name).toLowerCase() !== board.company.toLowerCase()) return false;
  try {
    const url = new URL(job.absolute_url);
    return url.protocol === 'https:' && !url.username && !url.password && (board.domains.includes(url.hostname) || ['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(url.hostname) && url.pathname.startsWith('/' + board.token + '/jobs/'));
  } catch {
    return false;
  }
}
async function verifyOrigin(board, source, candidates) {
  if (board.origin === 'embedded-board' && !source.text.includes('greenhouse.io/' + board.token + '/jobs/')) throw new Error('Official board reference changed for ' + board.company);
  if (board.origin === 'embedded-feed' && !source.text.includes('/boards/' + board.token + '/jobs')) throw new Error('Official metadata feed reference changed for ' + board.company);
  if (board.origin === 'embedded-ids' && (!source.text.includes('greenhouseId') || !candidates.every(job => source.text.includes(String(job.id))))) throw new Error('Official job IDs could not be matched for ' + board.company);
  if (board.origin === 'careers-component') {
    const component = source.text.match(/component-url="([^"]+)"\s+component-export="CareersJobsListing"/);
    if (!component) throw new Error('Official careers component changed for ' + board.company);
    const script = await get(new URL(component[1], source.url).href);
    if (!script.text.includes('https://boards-api.greenhouse.io/v1/boards/' + board.token + '/jobs')) throw new Error('Official careers feed changed for ' + board.company);
  }
  if (board.origin === 'employer-job' && candidates.length) {
    const job = candidates.find(j => /Software Engineering Intern/i.test(j.title)) || candidates[0],
      page = await get(job.absolute_url);
    if (!board.domains.includes(new URL(page.url).hostname) || !page.text.includes(String(job.id)) || !page.text.includes(clean(job.title))) throw new Error('Employer job title/ID could not be cross-checked for ' + board.company);
  }
}
export async function importEmployerOpportunities({
  limit = 60
} = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 60) throw new Error('Choose an import limit from 1 to 60.');
  const retrievedAt = new Date().toISOString();
  const results = await Promise.all(employerBoards.map(async board => {
    const [source, payload, departmentPayload] = await Promise.all([get(board.official), get('https://boards-api.greenhouse.io/v1/boards/' + board.token + '/jobs?content=false', true), get('https://boards-api.greenhouse.io/v1/boards/' + board.token + '/departments', true)]);
    if (!Array.isArray(payload.jobs) || payload.jobs.length > 10000 || !Array.isArray(departmentPayload.departments)) throw new Error('Unexpected public metadata shape for ' + board.company);
    const departments = new Map();
    for (const department of departmentPayload.departments) for (const job of department.jobs || []) if (job.id) departments.set(job.id, department.name);
    const candidates = payload.jobs.filter(job => eligibleTitle(job.title) && sourceAllowed(job, board) && (board.origin !== 'embedded-ids' || source.text.includes(String(job.id)))).sort((a, b) => Number(technical.test(b.title)) - Number(technical.test(a.title)) || Number(india.test(b.location?.name || '')) - Number(india.test(a.location?.name || '')) || String(b.first_published || b.updated_at).localeCompare(String(a.first_published || a.updated_at)));
    await verifyOrigin(board, source, candidates);
    return {
      board,
      all: payload.jobs.length,
      candidates: candidates.map(job => normalizeOpportunity(job, board, departments.get(job.id), retrievedAt))
    };
  }));
  // Round-robin keeps a large board from displacing smaller employers.
  const records = [];
  for (let index = 0; records.length < limit && results.some(result => result.candidates[index]); index++) for (const result of results) if (result.candidates[index] && records.length < limit) records.push(result.candidates[index]);
  if (!records.length) throw new Error('No matching employer opportunities were found; the previous snapshot is retained.');
  const output = new URL('../shared/content/employer-opportunities.json', import.meta.url),
    temporary = new URL(output.href + '.tmp');
  try {
    writeFileSync(temporary, JSON.stringify(records, null, 2) + '\n', {
      flag: 'wx'
    });
    renameSync(temporary, output);
  } finally {
    rmSync(temporary, {
      force: true
    });
  }
  return {
    retrievedAt,
    total: records.length,
    boards: results.map(result => ({
      company: result.board.company,
      publishedMetadata: result.all,
      matches: result.candidates.length,
      imported: records.filter(job => job.sourceBoard === result.board.token).length
    })),
    countries: [...new Set(records.map(job => job.country))],
    types: Object.fromEntries(['Internship', 'Apprenticeship', 'Full-time'].map(type => [type, records.filter(job => job.type === type).length]))
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await importEmployerOpportunities(), null, 2));
