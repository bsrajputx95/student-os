export function opportunityStatus(job, now = Date.now()) {
  if (job.availability === 'closed' || job.closesAt && Date.parse(job.closesAt) < now) return {
    label: 'Closed',
    color: 'gray',
    open: false
  };
  const age = Math.floor((now - Date.parse(job.verifiedAt || '')) / 86400000);
  if (!Number.isFinite(age) || age > 14) return {
    label: 'Needs a fresh source check',
    color: 'peach',
    open: true
  };
  return {
    label: 'Source checked ' + Math.max(0, age) + 'd ago',
    color: 'mint',
    open: true
  };
}
