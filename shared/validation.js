export function object(value, label = 'Request') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}
export function integer(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
  }
  return value;
}
export function enumValue(value, allowed, label) {
  if (!allowed.includes(value)) throw new Error(`Choose a valid ${label}.`);
  return value;
}
export function boundedText(value, min, max, label) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new Error(`${label} must contain ${min}–${max} characters.`);
  }
  return value.trim();
}
export function httpLink(value, optional = true) {
  if (!value && optional) return '';
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) throw 0;
    return url.href;
  } catch {
    throw new Error('Use a full http or https link.');
  }
}
export function validateProfileUpdate(p, tracks) {
  object(p);
  if (p.year !== undefined) integer(p.year, 1, 4, 'College year');
  if (p.dailyMinutes !== undefined) integer(p.dailyMinutes, 30, 180, 'Daily minutes');
  if (p.weeklyDays !== undefined) enumValue(p.weeklyDays, [3, 5, 6], 'weekly schedule');
  if (p.track !== undefined) enumValue(p.track, tracks, 'learning path');
  for (const key of ['autoResume', 'notifications', 'onboardingDone']) {
    if (p[key] !== undefined && typeof p[key] !== 'boolean') throw new Error(`${key} must be true or false.`);
  }
  if (p.name !== undefined) boundedText(p.name, 2, 80, 'Name');
  if (p.bio !== undefined && (typeof p.bio !== 'string' || p.bio.length > 300)) throw new Error('Keep your bio under 300 characters.');
  if (p.level !== undefined) boundedText(p.level, 2, 100, 'Starting experience');
  if (p.onboardingAnswers !== undefined && (!Array.isArray(p.onboardingAnswers) || p.onboardingAnswers.length !== 12 || p.onboardingAnswers.some(v => !['string', 'number'].includes(typeof v)))) throw new Error('Complete all 12 setup questions.');
}
