import { createHash } from 'node:crypto';
import { requirePermission } from '../shared/permissions.js';
import { boundedText, httpLink } from '../shared/validation.js';
export function createOpportunities({
  db,
  jobs,
  clock = Date.now,
  fetcher = fetch
}) {
  db.exec('CREATE TABLE IF NOT EXISTS opportunities(id TEXT PRIMARY KEY,source_url TEXT UNIQUE NOT NULL,document TEXT NOT NULL,checked_at TEXT NOT NULL);');
  function validate(row) {
    const sourceUrl = httpLink(row.sourceUrl, false);
    if (!sourceUrl.startsWith('https:')) throw new Error('Opportunity sources must use HTTPS.');
    if (!Array.isArray(row.years) || !row.years.length || row.years.some(y => ![1, 2, 3, 4].includes(y))) throw new Error('Choose eligibility years 1–4.');
    if (!Array.isArray(row.skills) || !row.skills.length || row.skills.some(s => !['DSA', 'Frontend', 'Backend', 'Databases', 'DevOps', 'Communication'].includes(s))) throw new Error('Choose valid preparation skills.');
    if (row.closesAt && !Number.isFinite(Date.parse(row.closesAt))) throw new Error('Invalid opportunity closing time.');
    return {
      id: 'feed-' + createHash('sha256').update(sourceUrl).digest('hex').slice(0, 20),
      sourceUrl,
      company: boundedText(row.company, 1, 100, 'Company'),
      title: boundedText(row.title, 3, 180, 'Title'),
      description: boundedText(row.description, 10, 5000, 'Description'),
      eligibility: boundedText(row.eligibility, 5, 3000, 'Eligibility'),
      years: row.years,
      skills: row.skills,
      country: boundedText(row.country, 2, 80, 'Country'),
      location: String(row.location || '').slice(0, 200),
      type: row.type === 'Internship' ? 'Internship' : row.type === 'Apprenticeship' ? 'Apprenticeship' : 'Full-time',
      requirements: (row.requirements || []).slice(0, 15).map(s => String(s).slice(0, 400)),
      availability: row.availability === 'closed' ? 'closed' : 'open',
      verifiedAt: new Date(clock()).toISOString().slice(0, 10),
      closesAt: row.closesAt || null,
      duration: String(row.duration || 'See source').slice(0, 200),
      compensation: String(row.compensation || '').slice(0, 200),
      initial: String(row.company).slice(0, 1),
      color: 'blue',
      channel: 'Off campus',
      sourceKind: 'authorized import',
      posted: 'Imported ' + new Date(clock()).toISOString().slice(0, 10)
    };
  }
  const base = structuredClone(jobs);
  function reload() {
    const rows = db.prepare('SELECT document FROM opportunities ORDER BY checked_at DESC').all().map(r => JSON.parse(r.document)),
      urls = new Set(rows.map(r => r.sourceUrl));
    jobs.splice(0, jobs.length, ...rows, ...base.filter(j => !urls.has(j.sourceUrl)));
  }
  function ingest(rows) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 500) throw new Error('Import 1–500 sourced opportunity records.');
    const records = rows.map(validate);
    db.exec('BEGIN IMMEDIATE');
    try {
      const put = db.prepare('INSERT INTO opportunities VALUES(?,?,?,?) ON CONFLICT(source_url) DO UPDATE SET document=excluded.document,checked_at=excluded.checked_at');
      for (const r of records) put.run(r.id, r.sourceUrl, JSON.stringify(r), new Date(clock()).toISOString());
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    reload();
    return {
      imported: records.length
    };
  }
  async function refresh() {
    if (!process.env.OPPORTUNITY_FEED_URL) throw new Error('An authorized opportunity feed is not configured.');
    const url = new URL(process.env.OPPORTUNITY_FEED_URL);
    if (url.protocol !== 'https:') throw new Error('Use an HTTPS feed.');
    const r = await fetcher(url, {
      headers: {
        Authorization: 'Bearer ' + (process.env.OPPORTUNITY_FEED_TOKEN || '')
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!r.ok) throw new Error('Opportunity feed returned ' + r.status);
    if (Number(r.headers.get('content-length') || 0) > 2000000) throw new Error('Feed exceeds the 2 MB limit.');
    const data = await r.text();
    if (data.length > 2000000) throw new Error('Feed exceeds the 2 MB limit.');
    return ingest(JSON.parse(data));
  }
  function importRows(actor, p) {
    requirePermission(actor.profile, 'institution.manage');
    return ingest(p.rows);
  }
  reload();
  return {
    importRows,
    refresh
  };
}
