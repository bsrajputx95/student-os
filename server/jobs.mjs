import { randomUUID } from 'node:crypto';
export function createJobs({
  db,
  read,
  save,
  broadcast,
  config,
  clock = Date.now,
  shouldNotify = () => true,
  sendMail
}) {
  const handlers = new Map();
  const insert = db.prepare('INSERT OR IGNORE INTO jobs(id,profile_id,dedupe_key,kind,due_at,status,attempts,payload,updated_at) VALUES(?,?,?,?,?,\'pending\',0,?,?)');
  function enqueue({
    key,
    profileId = null,
    kind = 'notification',
    dueAt = clock(),
    payload
  }) {
    const id = randomUUID();
    insert.run(id, profileId, key, kind, dueAt, JSON.stringify(payload), clock());
    return id;
  }
  async function deliverMail(payload) {
    if (sendMail) return sendMail(payload);
    if (!config.mailConfigured) throw new Error('Mail delivery is not configured.');
    const endpoint = new URL(process.env.MAIL_WEBHOOK_URL);
    if (config.production && endpoint.protocol !== 'https:') throw new Error('Production mail webhook must use HTTPS.');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.MAIL_WEBHOOK_TOKEN
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        ...payload
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('Mail provider rejected delivery (' + response.status + ').');
  }
  let working = false;
  async function tick() {
    if (working) return;
    working = true;
    try {
      const jobs = db.prepare("SELECT * FROM jobs WHERE status='pending' AND due_at<=? ORDER BY due_at LIMIT 10").all(clock());
      for (const job of jobs) {
        db.prepare("UPDATE jobs SET status='running',attempts=attempts+1,updated_at=? WHERE id=?").run(clock(), job.id);
        try {
          const payload = JSON.parse(job.payload);
          if (job.kind === 'mail') await deliverMail(payload);else if (job.kind === 'notification') {
            const s = read(job.profile_id);
            const stillPending = s && (!payload.assignmentId || s.assignments?.some(a => a.id === payload.assignmentId && (!payload.deadline || a.deadline === payload.deadline) && ['pending', 'revision requested'].includes(a.status))) && (!payload.dailyDate || s.tasks.some(t => t.date === payload.dailyDate && t.status !== 'completed')) && (!payload.applicationId || s.applications?.some(a => a.id === payload.applicationId && a.nextActionAt === payload.nextActionAt));
            if (stillPending && shouldNotify(payload, s) && !s.profile.suspended && s.profile.notifications !== false) {
              if (!s.notifications.some(n => n.jobId === job.id)) {
                s.notifications.unshift({
                  id: randomUUID(),
                  jobId: job.id,
                  title: payload.title,
                  text: payload.text,
                  route: payload.route || '/overview',
                  read: false
                });
                s.notifications = s.notifications.slice(0, 150);
                s.version++;
                save(s);
                broadcast(s.profile.id);
              }
            }
          } else if (handlers.has(job.kind)) await handlers.get(job.kind)(payload, job);else throw new Error('Unsupported queued job.');
          db.prepare("UPDATE jobs SET status='done',last_error=NULL,updated_at=? WHERE id=?").run(clock(), job.id);
        } catch (error) {
          const failed = job.attempts + 1 >= 5;
          db.prepare('UPDATE jobs SET status=?,due_at=?,last_error=?,updated_at=? WHERE id=?').run(failed ? 'failed' : 'pending', clock() + Math.min(3600000, 30000 * 2 ** job.attempts), String(error.message).slice(0, 500), clock(), job.id);
        }
      }
    } finally {
      working = false;
    }
  }
  // A process restart releases jobs that were interrupted during delivery.
  db.prepare("UPDATE jobs SET status='pending' WHERE status='running'").run();
  function schedule(state) {
    if (state.profile.role !== 'student' || state.profile.notifications === false || state.profile.suspended) return;
    const now = new Date(clock()),
      today = now.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata'
      });
    for (const a of state.assignments || []) if (a.deadline && ['pending', 'revision requested'].includes(a.status)) {
      const dueAt = new Date(a.deadline + 'T09:00:00+05:30').getTime();
      if (dueAt >= clock() - 86400000) enqueue({
        key: `assignment:${state.profile.id}:${a.id}:${a.deadline}`,
        profileId: state.profile.id,
        dueAt: Math.max(clock(), dueAt),
        payload: {
          assignmentId: a.id,
          deadline: a.deadline,
          title: 'Assignment due: ' + a.title,
          text: 'Open your assignment, finish the work, and submit before the deadline.',
          route: '/learn?tab=assignments'
        }
      });
    }
    if (state.tasks.some(t => t.date === today && t.status !== 'completed')) enqueue({
      key: `daily:${state.profile.id}:${today}`,
      profileId: state.profile.id,
      dueAt: Math.max(clock(), new Date(today + 'T18:00:00+05:30').getTime()),
      payload: {
        dailyDate: today,
        title: 'Your next preparation step is ready',
        text: 'Review today’s plan and choose one useful activity.',
        route: '/overview'
      }
    });
    for (const a of state.applications || []) if (a.nextActionAt) {
      const dueAt = Date.parse(a.nextActionAt);
      if (Number.isFinite(dueAt) && dueAt >= clock() - 86400000) enqueue({
        key: `application:${state.profile.id}:${a.id}:${a.nextActionAt}`,
        profileId: state.profile.id,
        dueAt,
        payload: {
          applicationId: a.id,
          nextActionAt: a.nextActionAt,
          title: a.company + ' · next application step',
          text: a.nextAction || 'Review your application timeline.',
          route: '/career?tab=applications'
        }
      });
    }
  }
  function status(collegeId) {
    return db.prepare('SELECT j.id,j.kind,j.status,j.attempts,j.due_at,j.last_error,j.updated_at FROM jobs j LEFT JOIN profiles p ON p.id=j.profile_id WHERE j.profile_id IS NULL OR json_extract(p.document,\'$.profile.collegeId\')=? ORDER BY j.updated_at DESC LIMIT 100').all(collegeId);
  }
  return {
    enqueue,
    tick,
    schedule,
    status,
    register: (kind, handler) => handlers.set(kind, handler)
  };
}
