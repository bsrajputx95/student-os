export function eligibility(profile, rules = {}) {
  const reasons = [];
  if (rules.years?.length && !rules.years.includes(Number(profile.year))) reasons.push('College year is outside the eligible cohort.');
  if (rules.departments?.length && !rules.departments.includes(profile.department)) reasons.push('Branch is outside the employer criteria.');
  if (Number(rules.minCgpa) > 0 && (!Number.isFinite(Number(profile.cgpa)) || profile.cgpa === null || Number(profile.cgpa) < Number(rules.minCgpa))) reasons.push('CGPA must be confirmed at ' + rules.minCgpa + ' or above.');
  if (rules.maxBacklogs !== undefined && rules.maxBacklogs !== null && (!Number.isFinite(Number(profile.backlogs)) || profile.backlogs === undefined || Number(profile.backlogs) > Number(rules.maxBacklogs))) reasons.push('Backlog count must be confirmed at ' + rules.maxBacklogs + ' or below.');
  if (rules.graduationYear && Number(profile.graduationYear) !== Number(rules.graduationYear)) reasons.push('Graduation batch does not match.');
  if (profile.placementOptOut) reasons.push('Student has opted out of college placements.');
  return {
    eligible: !reasons.length,
    reasons
  };
}
export function validateEligibility(rules = {}) {
  const clean = {
    years: rules.years || [],
    departments: rules.departments || []
  };
  if (!Array.isArray(clean.years) || clean.years.some(y => ![1, 2, 3, 4].includes(y)) || !Array.isArray(clean.departments) || clean.departments.some(d => typeof d !== 'string' || d.length > 100)) throw new Error('Invalid eligibility cohort.');
  for (const [key, min, max] of [['minCgpa', 0, 10], ['maxBacklogs', 0, 50], ['graduationYear', 2020, 2100]]) if (rules[key] !== undefined && rules[key] !== null && rules[key] !== '') {
    const n = Number(rules[key]);
    if (!Number.isFinite(n) || n < min || n > max || key !== 'minCgpa' && !Number.isInteger(n)) throw new Error('Invalid ' + key + ' criterion.');
    clean[key] = n;
  }
  return clean;
}
