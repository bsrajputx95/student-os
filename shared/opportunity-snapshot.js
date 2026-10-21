const key = job => {
  let url;
  try {
    url = new URL(job.sourceUrl);
  } catch {
    return String(job.id || '');
  }
  const id = job.sourcePostingId || url.searchParams.get('gh_jid') || url.pathname.match(/\/(\d{5,})\/?$/)?.[1];
  return id ? String(job.company).toLowerCase().replace(/[^a-z0-9]/g, '') + ':' + id : url.origin + url.pathname + '?' + [...url.searchParams].filter(([name]) => !name.startsWith('utm_')).sort().map(([name, value]) => name + '=' + value).join('&');
};
export function mergeEmployerOpportunities(base, imported) {
  const result = [...base],
    seen = new Set(base.map(key));
  for (const job of imported) {
    const id = key(job);
    if (!seen.has(id)) {
      seen.add(id);
      result.push(job);
    }
  }
  return result;
}
