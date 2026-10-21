import { readFileSync, writeFileSync } from 'node:fs';
import { directJobs, verifiedAt } from '../shared/content/curated.js';
const imported = JSON.parse(readFileSync(new URL('../.runtime/research/internshala-selected.json', import.meta.url), 'utf8'));
const palette = ['purple', 'blue', 'mint', 'peach', 'pink'];
const job = (entry, i) => ({
  ...entry,
  initial: entry.company[0],
  color: palette[i % palette.length],
  channel: 'Off campus',
  posted: entry.posted || `Checked ${verifiedAt}`,
  verifiedAt,
  source: entry.source || 'Employer website',
  sourceKind: entry.sourceKind || 'employer',
  deadline: null,
  status: 'Listed on source'
});
const data = directJobs.map(job);
for (const [i, j] of imported.entries()) {
  const isData = /data|research/i.test(j.Title),
    isCloud = /cloud|sap/i.test(j.Title);
  data.push(job({
    id: `internshala-${j.id}`,
    company: j.CompanyName,
    title: j.Title.replace(/ - (Internship|Fresher).*$/, ''),
    location: j.Locations,
    country: 'India',
    type: j.kind,
    years: j.kind === 'Internship' ? [1, 2, 3, 4] : [4],
    duration: j.Duration || 'Entry level',
    compensation: j.Salary,
    sourceUrl: j.Url,
    source: 'Internshala',
    sourceKind: 'job-board',
    posted: j.PostedOn,
    skills: isCloud ? ['Backend', 'DevOps'] : isData ? ['Databases', 'Communication'] : ['Frontend', 'Backend', 'DSA'],
    eligibility: j.Experience || 'See the listing for student eligibility, dates, and availability.',
    description: `${j.CompanyName} lists this ${j.kind === 'Internship' ? 'internship' : 'entry-level role'} on Internshala. Open the source for the full description, requirements, and application process.`,
    requirements: ['Confirm eligibility on the source listing', 'Check the work arrangement and application deadline']
  }, i));
}
const amazon = JSON.parse(readFileSync(new URL('../.runtime/research/amazon-jobs.json', import.meta.url), 'utf8')).jobs;
for (const [i, j] of amazon.filter(j => /software.*intern|sde.*intern|software.*co.?op/i.test(j.title)).slice(0, 16).entries()) {
  const country = {
    USA: 'USA',
    CAN: 'Canada',
    GBR: 'UK',
    DEU: 'Germany',
    BRA: 'Brazil',
    IND: 'India',
    FRA: 'France',
    ESP: 'Spain',
    POL: 'Poland'
  }[j.country_code] || j.country_code;
  const id = `amazon-${j.id_icims}`;
  if (data.some(x => x.id === id)) continue;
  data.push(job({
    id,
    company: 'Amazon',
    title: j.title,
    location: `${j.city || j.location}, ${country}`,
    country,
    type: 'Internship',
    years: [2, 3, 4],
    duration: 'See employer posting',
    sourceUrl: `https://www.amazon.jobs${j.job_path}`,
    posted: j.posted_date,
    skills: ['DSA', 'Backend', 'Databases'],
    eligibility: 'Review the employer’s education, availability, and country-specific work authorization requirements.',
    description: 'An internship listed in Amazon’s official careers index. View the employer page for the exact team, term, and requirements.',
    requirements: ['Review current university requirements', 'Verify location and work authorization', 'Check the exact internship term']
  }, i));
}
writeFileSync(new URL('../shared/content/jobs.json', import.meta.url), JSON.stringify(data, null, 2));
console.log(`Imported ${data.length} real opportunity listings (${data.filter(j => j.country === 'India').length} in India).`);
