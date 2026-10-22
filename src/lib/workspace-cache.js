// Only a student's own learning summary is eligible for a saved startup view.
// API responses, messages, faculty rosters and active exams never enter this cache.
export const CACHE_SCHEMA = 1;
export const CACHE_TTL = 6 * 60 * 60 * 1000;
const MAX_BYTES = 2 * 1024 * 1024;
const ownFields = ['version', 'skills', 'journey', 'tasks', 'activity', 'metrics', 'skillHistory', 'solved', 'practiceCompleted', 'historicalSolved', 'courseProgress', 'courseBaseProgress', 'lessonCompletions', 'projectProgress', 'resumeProjects', 'registrations', 'savedJobs', 'applications', 'quizAttempts', 'practicePreferences', 'courseCertificates', 'realtimeTransport', 'aiConfigured', 'accountProtected'];
const profileFields = ['id', 'role', 'collegeId', 'college', 'name', 'handle', 'year', 'department', 'section', 'track', 'roleId', 'avatar', 'onboardingDone', 'enrollmentStatus', 'dailyMinutes', 'weeklyDays'];
export function cacheIdentity(profile) {
  return profile?.id && profile.role === 'student' && profile.enrollmentStatus !== 'pending' ? [profile.collegeId || profile.college, profile.role, profile.id].join(':') : null;
}
export function savedWorkspace(state, now = Date.now()) {
  const identity = cacheIdentity(state?.profile);
  if (!identity || !state.metrics || !state.journey || !Array.isArray(state.tasks)) return null;
  const view = Object.fromEntries(ownFields.filter(key => state[key] !== undefined).map(key => [key, state[key]]));
  view.profile = Object.fromEntries(profileFields.filter(key => state.profile[key] !== undefined).map(key => [key, state.profile[key]]));
  Object.assign(view, {
    assignments: [], notifications: [], posts: [], messages: [], following: [], likes: [], comments: {},
    communityEnabled: false, communityPeople: [], communityPosts: [], communityMessages: [], communityFollows: [], collegeEvents: [],
    resume: {}, diagnosticSessions: [], quizSessions: [], interviewSessions: [], staffMessages: [], campusUpdates: []
  });
  const record = { schema: CACHE_SCHEMA, identity, savedAt: now, view };
  return new TextEncoder().encode(JSON.stringify(record)).byteLength <= MAX_BYTES ? record : null;
}
export function validWorkspace(record, identity, now = Date.now()) {
  const view = record?.view;
  return record?.schema === CACHE_SCHEMA && record.identity === identity && cacheIdentity(view?.profile) === identity &&
    Number.isFinite(record.savedAt) && record.savedAt <= now + 60000 && now - record.savedAt < CACHE_TTL &&
    Number.isFinite(view?.version) && Number.isFinite(view?.metrics?.readiness) && view?.metrics?.readinessDetails?.skillScores &&
    Number.isFinite(view?.journey?.day) && Number.isFinite(view?.journey?.totalDays) &&
    Array.isArray(view?.activity) && Array.isArray(view?.tasks) && Array.isArray(view?.solved) &&
    view?.courseProgress && view?.projectProgress && Array.isArray(view?.notifications) && Array.isArray(view?.assignments);
}
export function createWorkspaceCache(storage) {
  let generation = 0, queue = Promise.resolve();
  const enqueue = work => (queue = queue.catch(() => {}).then(work).catch(() => null));
  return {
    read: () => enqueue(async () => {
      const record = await storage.read();
      if (!validWorkspace(record, record?.identity)) {
        await storage.write(null);
        return null;
      }
      return record;
    }),
    save: state => {
      const ticket = generation, record = savedWorkspace(state);
      return enqueue(async () => {
        if (ticket !== generation) return;
        const previous = await storage.read();
        if (ticket !== generation) return;
        if (record && previous?.identity === record.identity && previous.view?.version > record.view.version) return;
        await storage.write(record);
      });
    },
    clear: () => {
      generation++;
      return enqueue(() => storage.write(null));
    }
  };
}
export function browserWorkspaceCache() {
  let opening;
  const open = () => opening ||= new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('Local storage unavailable'));
    const request = window.indexedDB.open('studentos-learning-view', CACHE_SCHEMA);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('workspace')) request.result.createObjectStore('workspace');
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Local storage is busy'));
  });
  const transaction = async (mode, callback) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workspace', mode), request = callback(tx.objectStore('workspace'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  };
  return createWorkspaceCache({
    read: () => transaction('readonly', store => store.get('current')),
    write: record => transaction('readwrite', store => record ? store.put(record, 'current') : store.delete('current'))
  });
}
