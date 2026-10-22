const errors = {
  401: 'Your session has expired. Sign in again to continue.',
  403: 'Your account does not have access to this action.',
  409: 'This workspace changed during your request. Refresh before trying again.',
  413: 'This upload is too large. Choose a smaller file.',
  429: 'Too many requests. Wait a moment before trying again.'
};
export async function readApiResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : errors[response.status] || 'The service is temporarily unavailable. Refresh to check your saved work before trying again.');
  if (!data || typeof data !== 'object') throw new Error('The service returned an incomplete response. Refresh to check your saved work.');
  return data;
}
