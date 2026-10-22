// Imported opportunity records arrive with authenticated state. Static course
// and practice metadata can be CDN cached without hiding newer imported jobs.
export function mergePublicCatalog(base, updates) {
  if (!base || !updates?.jobs?.length) return base;
  const sources = new Set(updates.jobs.map(job => job.sourceUrl));
  return {
    ...base,
    jobs: [...updates.jobs, ...base.jobs.filter(job => !sources.has(job.sourceUrl))]
  };
}
