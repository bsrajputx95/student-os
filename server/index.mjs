import { enrichPresentationCampus } from './presentation-seed.mjs';
import { expandHkbkRoster } from './roster-expansion.mjs';
import { courseCertificates, certificateSvg } from './certificates.mjs';
import { diagnosticAction, publicSession as publicDiagnostic } from './diagnostic.mjs';
import { publicLesson } from '../shared/curriculum.js';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSessions } from './sessions.mjs';
import { loadConfig, securityHeaders, requestAddress } from './config.mjs';
import { migrateDatabase, indexProgress, indexMember, createRateLimiter, audit } from './database.mjs';
import { createInterviewService } from './interview.mjs';
import { createJobs } from './jobs.mjs';
import { createAccounts } from './accounts.mjs';
import { createFiles } from './files.mjs';
import { createChallenges } from './challenges.mjs';
import { createQuidHistory } from './quid-history.mjs';
import { staffKnowledge } from './quid-context.mjs';
import { createOpportunities } from './opportunities.mjs';
import { createJudge } from './judge.mjs';
import { createTelemetry } from './telemetry.mjs';
import { collegeReport } from './reports.mjs';
import { createSupport } from './support.mjs';
import { readJsonBody as body } from './http-body.mjs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { requirePermission } from '../shared/permissions.js';
import { applyAction, metrics, ensureDailyPlan, assessmentSession, recordAssessment, finalizeProgress } from './model.mjs';
import { createProfile } from './profiles.mjs';
import { createCampusService, createStaffProfile, isStaff } from './campus.mjs';
import { campusKey } from '../shared/staff.js';
import { catalog } from '../shared/catalog.js';
import { quidReply, resumeAssist, aiConfigured } from './quid.mjs';
import { runSqlLab } from './assessment-service.mjs';
import { projectLabs, canonical } from '../shared/assessments.js';
import { defaultPlanDays, buildPlan } from '../shared/journey.js';
import { createAuth } from './auth.mjs';
import { createCommunity } from './community.mjs';
import { seedHkbk, HKBK_ID, HKBK_NAME } from './hkbk-seed.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
// Isolated HTTP tests must not inherit live provider credentials from this checkout.
if (process.env.STUDENTOS_TEST_DB !== 'memory' && process.env.STUDENTOS_SKIP_ENV !== '1' && process.env.STUDENTOS_SERVERLESS !== '1' && existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
export function createApplication(options = {}) {
  const config = loadConfig(root, options.env || process.env);
  mkdirSync(config.dataDir, {
    recursive: true
  });
  const db = options.db || new DatabaseSync(options.databasePath || (process.env.STUDENTOS_TEST_DB === 'memory' ? ':memory:' : resolve(config.dataDir, 'studentos.sqlite')));
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY,handle TEXT UNIQUE NOT NULL,document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,profile_id TEXT NOT NULL);');
  migrateDatabase(db);
  for (const row of db.prepare('SELECT p.document FROM profiles p LEFT JOIN public_members m ON m.profile_id=p.id WHERE m.profile_id IS NULL').all()) indexMember(db, JSON.parse(row.document).profile);
  if (config.production && !config.presentation && db.prepare("SELECT COUNT(*) AS n FROM profiles WHERE json_extract(document,'$.profile.sampleData')=1 OR json_extract(document,'$.profile.isDemo')=1").get().n) throw new Error('Production cannot use a database containing sample accounts. Configure a separate STUDENTOS_DATA_DIR.');
  const limit = createRateLimiter(db);
  const telemetry = createTelemetry({
    enabled: config.production
  });
  const subscribers = new Map();
  let jobService = null,
    seeding = true;
  const sessions = createSessions(db, {
    secure: config.production
  });
  function identity(req) {
    return sessions.identity(req.headers.cookie || '');
  }
  function getState(id) {
    const row = db.prepare('SELECT document FROM profiles WHERE id=?').get(id);
    if (!row) return null;
    const state = JSON.parse(row.document);
    if (state.skills && state.profile.isDemo && !state.demoHistoryVersion) {
      const history = Array.from({
        length: 12
      }, (_, i) => ({
        date: new Date(Date.now() - (11 - i) * 7 * 86400000).toISOString().slice(0, 10),
        skills: Object.fromEntries(Object.entries(state.skills).map(([key, value]) => [key, Math.max(0, value - (11 - i) * 2)]))
      }));
      state.skillHistory = [...new Map([...history, ...(state.skillHistory || [])].map(point => [point.date, point])).values()];
      state.demoHistoryVersion = 1;
      save(state);
    }
    return state;
  }
  function save(state) {
    if (!seeding && state.profile.role === 'student' && state.skills) finalizeProgress(state);
    db.prepare('INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(state.profile.id, state.profile.handle, JSON.stringify(state));
    indexProgress(db, state);
    if (jobService && !seeding) jobService.schedule(state);
  }
  function snapshot(state) {
    state = {
      ...state,
      assignments: state.assignments?.map(a => ({
        ...a,
        quiz: a.quiz ? {
          ...a.quiz,
          questions: a.quiz.questions.map(({
            correct,
            explanation,
            ...q
          }) => q)
        } : null
      })),
      diagnosticSessions: state.diagnosticSessions?.map(publicDiagnostic)
    };
    if (state.profile.enrollmentStatus === 'pending') return {
      ...state,
      communityEnabled: false,
      communityPeople: [],
      communityPosts: [],
      communityMessages: [],
      communityFollows: [],
      collegeEvents: [],
      metrics: state.skills ? metrics(state) : undefined
    };
    const shared = {
      ...community.snapshot(state, {
        limit: 25
      }),
      accountProtected: auth.protectedProfile(state.profile.id),
      catalogUpdates: {
        jobs: db.prepare('SELECT document FROM opportunities ORDER BY checked_at DESC').all().map(row => JSON.parse(row.document))
      }
    };
    if (isStaff(state.profile)) return {
      ...state,
      ...shared,
      aiConfigured: aiConfigured(),
      realtimeTransport: config.serverless ? 'poll' : 'sse',
      campusVersion: campus.getCampus(campusKey(state.profile)).version
    };
    return {
      ...state,
      ...shared,
      metrics: metrics(state),
      realtimeTransport: config.serverless ? 'poll' : 'sse',
      courseCertificates: courseCertificates(state),
      aiConfigured: aiConfigured()
    };
  }
  function broadcastChange(id) {
    const changed = getState(id);
    for (const [stream, owner] of subscribers) {
      const viewer = owner === id ? changed : getState(owner);
      if (owner === id || isStaff(viewer?.profile) && changed && campusKey(viewer.profile) === campusKey(changed.profile)) stream.write('data: update\n\n');
    }
  }
  const campus = createCampusService({
    db,
    readProfile: getState,
    saveProfile: save,
    broadcast: broadcastChange,
    onPublished: (actor, item) => community.shareItem(actor, item),
    onAudit: (actor, type, payload, result) => {
      audit(db, actor.profile, type, result.id || payload.id || payload.studentId || payload.itemId, {
        title: String(payload.title || '').slice(0, 140),
        recipients: result.recipients || 0
      });
      if (type === 'note.add' && payload.followUp && jobService) jobService.enqueue({
        key: 'mentor-follow-up:' + result.id,
        profileId: actor.profile.id,
        dueAt: Math.max(Date.now(), Date.parse(payload.followUp + 'T09:00:00+05:30')),
        payload: {
          mentorNoteId: result.id,
          collegeId: actor.profile.collegeId,
          followUp: payload.followUp,
          title: 'A student follow-up is due',
          text: 'Review the mentor note and the student’s progress since your last intervention.',
          route: '/staff/outreach'
        }
      });
    }
  });
  const auth = createAuth(db);
  const community = createCommunity({
    db,
    readProfile: getState,
    saveProfile: save,
    broadcastCampus: college => {
      for (const [stream, owner] of subscribers) {
        if (campusKey(getState(owner)?.profile || {}) === college) stream.write('data: update\n\n');
      }
    }
  });
  const interviewService = createInterviewService({
    read: getState,
    save,
    broadcast: broadcastChange
  });
  const quidHistory = createQuidHistory({
    read: getState,
    save,
    staffContext: (actor, input) => staffKnowledge(actor, input, {
      students: campus.allStudents,
      readCampus: campus.getCampus
    })
  });
  const hkbkEnabled = (config.presentation || !config.production) && (process.env.STUDENTOS_TEST_DB !== 'memory' || process.env.STUDENTOS_SEED_HKBK === '1');
  const passwordRequired = config.production || hkbkEnabled;
  jobService = createJobs({
    db,
    read: getState,
    save,
    broadcast: broadcastChange,
    config,
    shouldNotify: payload => !payload.mentorNoteId || campus.getCampus(payload.collegeId).notes.some(n => n.id === payload.mentorNoteId && !n.resolved && n.followUp === payload.followUp)
  });
  const accounts = createAccounts({
    db,
    read: getState,
    save,
    auth,
    sessions,
    config,
    enqueue: jobService.enqueue
  });
  const files = createFiles({
    db,
    dataDir: config.dataDir,
    inline: config.serverless,
    readProfile: getState,
    readCampus: campus.getCampus
  });
  const challenges = createChallenges({
    db,
    readProfile: getState,
    saveProfile: save,
    readCampus: campus.getCampus,
    enqueue: jobService.enqueue,
    broadcast: broadcastChange
  });
  jobService.register('challenge-grade', p => challenges.grade(p.sessionId));
  const opportunities = createOpportunities({
    db,
    jobs: catalog.jobs
  });
  const support = createSupport({
    db
  });
  const judge = createJudge({
    db,
    read: getState,
    save,
    broadcast: broadcastChange
  });
  jobService.register('opportunities-refresh', () => opportunities.refresh());
  if (hkbkEnabled && options.seed !== false) seedHkbk({
    db,
    auth,
    community,
    readProfile: getState,
    saveProfile: save
  });
  if (hkbkEnabled && options.seed !== false) enrichPresentationCampus({
    db,
    community,
    readProfile: getState,
    saveProfile: save
  });
  // A versioned, additive upgrade also runs against the existing hosted store.
  // Fresh seeding stays disabled there; user profiles and saved work are retained.
  if (hkbkEnabled) expandHkbkRoster({
    db,
    auth,
    community,
    readProfile: getState,
    saveProfile: save
  });
  seeding = false;
  if (hkbkEnabled) {
    for (const row of db.prepare("SELECT document FROM profiles WHERE json_extract(document,'$.profile.sampleData')=1 AND json_extract(document,'$.profile.department')='Academic Services'").all()) {
      const state = JSON.parse(row.document);
      if (!state.profile.staffPermissionsVersion) {
        state.profile.role = state.profile.id === 'hkbk-staff-91' ? 'admin' : 'support';
        state.profile.staffPermissionsVersion = 1;
        state.version++;
        save(state);
      }
    }
  }
  const acceptsGzip = new WeakMap();
  function json(res, status, data) {
    const text = JSON.stringify(data),
      compressed = acceptsGzip.get(res) && text.length > 32000,
      content = compressed ? gzipSync(text) : text;
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Accept-Encoding',
      ...(compressed ? {
        'Content-Encoding': 'gzip'
      } : {})
    });
    res.end(content);
  }
  const handleRequest = async (req, res) => {
    try {
      acceptsGzip.set(res, (req.headers['accept-encoding'] || '').includes('gzip'));
      const requestId = crypto.randomUUID();
      res.setHeader('X-Request-ID', requestId);
      telemetry.observe(req, res, requestId);
      for (const [key, value] of Object.entries(securityHeaders(config))) res.setHeader(key, value);
      const url = new URL(req.url, config.origin);
      if (req.method === 'POST' && req.headers.origin && !config.allowedOrigins.has(req.headers.origin)) return json(res, 403, {
        error: 'Origin is not allowed.'
      });
      if (req.method === 'POST') {
        const address = requestAddress(req, config);
        limit('all:' + address, 6000, 60000);
        if (url.pathname === '/api/session') limit('session:' + address, 1200, 60000);
        if (url.pathname === '/api/account/recover') limit('recovery:' + address, 5, 3600000);
        if (url.pathname === '/api/quid' || url.pathname === '/api/resume/assist' || url.pathname.startsWith('/api/interview')) limit('ai:' + address, 60, 60000);
        if (config.presentation && (url.pathname === '/api/quid' || url.pathname === '/api/resume/assist' || url.pathname.startsWith('/api/interview'))) {
          limit('presentation-ai-hour', 40, 3600000);
          limit('presentation-ai-day', 200, 86400000);
        }
      }
      if (url.pathname === '/api/health') return json(res, 200, {
        status: db.prepare('SELECT 1 AS ok').get().ok === 1 ? 'ready' : 'unavailable',
        storage: config.serverless ? 'private-blob-sqlite' : 'sqlite',
        services: {
          ai: config.aiConfigured ? 'configured' : 'unconfigured',
          mail: config.mailConfigured ? 'configured' : 'unconfigured',
          judge: process.env.JUDGE_URL ? 'configured' : 'unconfigured'
        }
      });
      if (url.pathname === '/api/catalog') {
        const content = JSON.stringify(catalog),
          etag = '"' + createHash('sha256').update(content).digest('hex').slice(0, 24) + '"';
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=60');
        res.setHeader('Vary', 'Accept-Encoding');
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304);
          res.end();
          return;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        if ((req.headers['accept-encoding'] || '').includes('gzip')) {
          res.setHeader('Content-Encoding', 'gzip');
          res.end(gzipSync(content));
        } else res.end(content);
        return;
      }
      if (url.pathname === '/api/campus-summary') return json(res, 200, {
        name: config.collegeName,
        students: db.prepare("SELECT COUNT(*) AS n FROM profiles WHERE json_extract(document,'$.profile.collegeId')=? AND json_extract(document,'$.profile.role')='student'").get(config.collegeId).n,
        staff: db.prepare("SELECT COUNT(*) AS n FROM profiles WHERE json_extract(document,'$.profile.collegeId')=? AND json_extract(document,'$.profile.role')!='student'").get(config.collegeId).n,
        hosted: config.serverless,
        sampleData: hkbkEnabled,
        enabled: hkbkEnabled
      });
      if (url.pathname === '/api/workspaces' && config.production) return json(res, 200, []);
      if (url.pathname === '/api/workspaces') return json(res, 200, db.prepare('SELECT id,handle,document FROM profiles').all().filter(row => !auth.protectedProfile(row.id)).map(row => {
        const p = JSON.parse(row.document).profile;
        return {
          id: row.id,
          handle: row.handle,
          name: p.name,
          isDemo: p.isDemo,
          role: p.role || 'student'
        };
      }));
      if (req.method === 'GET' && url.pathname === '/api/invite') return json(res, 200, accounts.inviteInfo(url.searchParams.get('token')));
      if (req.method === 'POST' && url.pathname === '/api/invite/accept') {
        const state = accounts.acceptInvite(await body(req));
        res.setHeader('Set-Cookie', sessions.create(state.profile.id));
        return json(res, 200, snapshot(state));
      }
      if (req.method === 'POST' && url.pathname === '/api/account/recover') return json(res, 200, accounts.recover(await body(req)));
      if (req.method === 'POST' && url.pathname === '/api/account/reset') return json(res, 200, accounts.reset(await body(req)));
      if (req.method === 'POST' && url.pathname === '/api/session') {
        const data = await body(req);
        let state;
        if (passwordRequired && !['login', 'register'].includes(data.mode)) {
          const e = new Error('Please sign in with your username and password.');
          e.status = 401;
          throw e;
        }
        if (data.mode === 'login') state = getState(auth.login(data.handle, data.password, requestAddress(req, config)));else if (data.mode === 'register') {
          if (typeof data.password !== 'string' || data.password.length < 8 || data.password.length > 128) throw new Error('Use a password with 8–128 characters.');
          const handle = String(data.handle || '').trim().toLowerCase();
          if (db.prepare('SELECT id FROM profiles WHERE lower(handle)=?').get(handle)) throw new Error('That username is already taken.');
          if (![1, 2, 3, 4].includes(Number(data.year))) throw new Error('Choose your college year.');
          state = createProfile({
            ...data,
            handle,
            college: config.collegeName
          });
          state.profile.collegeId = config.collegeId;
          state.profile.year = Number(data.year);
          state.profile.department = String(data.department || 'Computer Science').slice(0, 80);
          state.profile.role = 'student';
          state.profile.isDemo = false;
          state.profile.email = String(data.email || '').trim().toLowerCase().slice(0, 200);
          if (config.production && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.profile.email)) throw new Error('Enter your college email.');
          state.profile.enrollmentStatus = config.production && !config.presentation ? 'pending' : 'approved';
          state.journey = {
            ...buildPlan(state.profile, new Date().toLocaleDateString('en-CA', {
              timeZone: 'Asia/Kolkata'
            })),
            xp: 0
          };
          state.tasks = [];
          ensureDailyPlan(state);
          save(state);
          auth.setPassword(state.profile.id, data.password);
          community.notify(config.collegeId);
        } else if (data.mode === 'staff') {
          if (hkbkEnabled) {
            const e = new Error('Sign in with your staff account to open the college workspace.');
            e.status = 401;
            throw e;
          }
          if (!['teacher', 'placement'].includes(data.role)) throw new Error('Choose teacher or placement.');
          campus.ensureDemo();
          state = getState('demo-' + data.role) || createStaffProfile(data.role);
          save(state);
        } else if (data.mode === 'existing') {
          if (auth.protectedProfile(data.id)) {
            const e = new Error('Sign in with this account’s username and password.');
            e.status = 401;
            throw e;
          }
          state = getState(data.id);
        } else if (data.mode === 'demo') {
          if (auth.protectedProfile('demo-bhavanisingh')) {
            const e = new Error('Sign in as bhavanisingh with the sample password.');
            e.status = 401;
            throw e;
          }
          state = getState('demo-bhavanisingh') || createProfile({
            mode: 'demo'
          });
          save(state);
        } else {
          if (db.prepare('SELECT id FROM profiles WHERE handle=?').get(data.handle)) throw new Error('That username already has a local workspace. Choose it below or use another username.');
          state = createProfile(data);
          save(state);
        }
        if (!state) throw new Error('Workspace not found.');
        res.setHeader('Set-Cookie', sessions.create(state.profile.id));
        return json(res, 200, snapshot(state));
      }
      const id = identity(req);
      if (id && req.method === 'POST') limit('account-actions:' + id, 180, 60000);
      if (req.method === 'POST' && url.pathname === '/api/session/end') {
        res.setHeader('Set-Cookie', sessions.end(req.headers.cookie || ''));
        return json(res, 200, {
          sessionRequired: true,
          version: 0
        });
      }
      if (req.method === 'GET' && url.pathname === '/api/session/identity') {
        const state = id && getState(id);
        if (!state) return json(res, 200, { sessionRequired: true });
        const { id: profileId, role, collegeId, college, enrollmentStatus } = state.profile;
        return json(res, 200, { profile: { id: profileId, role, collegeId, college, enrollmentStatus } });
      }
      if (req.method === 'GET' && url.pathname === '/api/state') {
        const state = id && getState(id);
        if (!state) return json(res, 200, {
          sessionRequired: true,
          version: 0
        });
        if (!isStaff(state.profile) && ensureDailyPlan(state)) save(state);
        return json(res, 200, snapshot(state));
      }
      if (url.pathname.startsWith('/api/') && !id) return json(res, 401, {
        error: 'Sign in to your workspace first.'
      });
      if (config.production && getState(id)?.profile.enrollmentStatus === 'pending' && !url.pathname.startsWith('/api/account/')) return json(res, 403, {
        error: 'Your college administrator must approve enrollment before you can access campus records.'
      });
      if (req.method === 'GET' && url.pathname === '/api/admin/members') return json(res, 200, accounts.members(getState(id), Object.fromEntries(url.searchParams)));
      if (req.method === 'POST' && url.pathname === '/api/admin/opportunities') return json(res, 200, opportunities.importRows(getState(id), await body(req, 2 * 1024 * 1024)));
      if (req.method === 'POST' && url.pathname === '/api/admin/roster') return json(res, 200, accounts.importRoster(getState(id), await body(req, 1024 * 1024)));
      if (req.method === 'POST' && url.pathname === '/api/admin/opportunities/refresh') {
        requirePermission(getState(id).profile, 'institution.manage');
        jobService.enqueue({
          key: 'opportunity-refresh:' + Math.floor(Date.now() / 3600000),
          kind: 'opportunities-refresh',
          payload: {}
        });
        return json(res, 200, {
          queued: true
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/admin/invite') return json(res, 200, accounts.invite(getState(id), await body(req)));
      if (req.method === 'POST' && url.pathname === '/api/admin/account') {
        const payload = await body(req);
        const result = accounts.manage(getState(id), payload);
        broadcastChange(payload.id);
        return json(res, 200, result);
      }
      if (req.method === 'GET' && url.pathname === '/api/admin/operations') {
        const actor = getState(id);
        requirePermission(actor.profile, 'institution.manage');
        return json(res, 200, {
          jobs: jobService.status(actor.profile.collegeId),
          metrics: telemetry.snapshot(),
          services: {
            ai: config.aiConfigured,
            mail: config.mailConfigured
          },
          migrations: db.prepare('SELECT * FROM schema_migrations').all(),
          audit: db.prepare('SELECT id,action,target_id,created_at FROM audit_log WHERE college_id=? ORDER BY id DESC LIMIT 100').all(actor.profile.collegeId)
        });
      }
      if (req.method === 'GET' && /^\/api\/certificates\/[a-z-]+\.svg$/.test(url.pathname)) {
        const courseId = url.pathname.split('/').at(-1).slice(0, -4);
        const certificate = courseCertificates(getState(id)).find(c => c.courseId === courseId);
        if (!certificate) return json(res, 404, {
          error: 'Complete every course lesson before downloading its certificate.'
        });
        res.writeHead(200, {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Content-Disposition': (url.searchParams.has('download') ? 'attachment' : 'inline') + '; filename="StudentOS-' + courseId + '.svg"',
          'Cache-Control': 'private, no-store'
        });
        res.end(certificateSvg(certificate));
        return;
      }
      if (req.method === 'GET' && url.pathname.startsWith('/api/lessons/')) {
        const [,,, course, index] = url.pathname.split('/');
        const lesson = publicLesson(course, Number(index));
        return json(res, lesson ? 200 : 404, lesson || {
          error: 'Lesson not found.'
        });
      }
      if (req.method === 'GET' && url.pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        res.write(': connected\n\n');
        subscribers.set(res, id);
        req.on('close', () => subscribers.delete(res));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/challenges') return json(res, 200, {
        challenges: challenges.list(getState(id))
      });
      if (req.method === 'GET' && url.pathname === '/api/community/posts') return json(res, 200, community.page(getState(id), Object.fromEntries(url.searchParams)));
      if (req.method === 'GET' && url.pathname === '/api/help') return json(res, 200, {
        tickets: support.list(getState(id))
      });
      if (req.method === 'POST' && url.pathname === '/api/help') return json(res, 200, support.action(getState(id), await body(req)));
      if (req.method === 'GET' && url.pathname === '/api/account/export') {
        const s = getState(id),
          c = community.read(campusKey(s.profile));
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="studentos-my-records.json"',
          'Cache-Control': 'no-store'
        });
        res.end(JSON.stringify({
          exportedAt: new Date().toISOString(),
          workspace: s,
          communityPosts: c.posts.filter(p => p.author === id),
          messages: c.messages.filter(m => m.author === id || m.to === id)
        }, null, 2));
        return;
      }
      if (req.method === 'GET' && url.pathname === '/api/judge/status') return json(res, 200, judge.status());
      if (req.method === 'POST' && url.pathname === '/api/judge/draft') return json(res, 200, judge.draft(id, await body(req, 40000)));
      if (req.method === 'POST' && url.pathname === '/api/judge/run') {
        limit('judge:' + id, 12, 60000);
        return json(res, 200, await judge.run(id, await body(req, 40000)));
      }
      if (req.method === 'GET' && url.pathname === '/api/challenges/leaderboard') return json(res, 200, {
        rows: challenges.leaderboard(getState(id), url.searchParams.get('id'))
      });
      if (req.method === 'POST' && url.pathname.startsWith('/api/challenges/')) {
        const result = challenges.action(getState(id), url.pathname.split('/').at(-1), await body(req, 512 * 1024));
        json(res, 200, result);
        await jobService.tick().catch(e => console.error(e.message));
        return;
      }
      if (req.method === 'POST' && url.pathname === '/api/files/upload') return json(res, 200, files.upload(getState(id), await body(req, 8 * 1024 * 1024)));
      if (req.method === 'GET' && url.pathname === '/api/files') return json(res, 200, {
        files: files.list(getState(id))
      });
      if (req.method === 'POST' && url.pathname === '/api/files/trash') {
        const payload = await body(req);
        return json(res, 200, files.trash(getState(id), payload.id, payload.restore === true));
      }
      if (req.method === 'GET' && url.pathname.startsWith('/api/files/')) {
        const download = files.get(getState(id), url.pathname.split('/').at(-1));
        res.writeHead(200, {
          'Content-Type': download.file.mime,
          'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(download.file.name),
          'Cache-Control': 'no-store'
        });
        res.end(download.bytes || readFileSync(download.path));
        return;
      }
      if (req.method === 'POST' && url.pathname.startsWith('/api/diagnostic/')) {
        const state = getState(id);
        if (state.profile.role !== 'student') return json(res, 403, {
          error: 'Open a student account for a baseline check.'
        });
        const result = diagnosticAction(state, url.pathname.split('/').at(-1), await body(req));
        if (result.result) {
          const done = state.tasks.filter(t => t.date === new Date().toLocaleDateString('en-CA', {
            timeZone: 'Asia/Kolkata'
          }) && t.status === 'completed');
          if (!done.length) {
            state.tasks = state.tasks.filter(t => t.date !== new Date().toLocaleDateString('en-CA', {
              timeZone: 'Asia/Kolkata'
            }));
            ensureDailyPlan(state);
          }
        }
        save(state);
        broadcastChange(id);
        return json(res, 200, result);
      }
      if (req.method === 'POST' && url.pathname.startsWith('/api/interview/')) return json(res, 200, await interviewService.action(id, url.pathname.split('/').at(-1), await body(req)));
      if (req.method === 'GET' && url.pathname === '/api/account/sessions') return json(res, 200, {
        sessions: sessions.list(id)
      });
      if (req.method === 'POST' && url.pathname === '/api/account/logout-all') {
        sessions.revokeAll(id);
        res.setHeader('Set-Cookie', sessions.end(''));
        return json(res, 200, {
          sessionRequired: true,
          version: 0
        });
      }
      if (url.pathname.startsWith('/api/staff')) {
        const actor = getState(id);
        if (!isStaff(actor?.profile)) return json(res, 403, {
          error: 'A teacher or placement session is required.'
        });
        if (req.method === 'GET' && url.pathname === '/api/staff') return json(res, 200, campus.staffData(actor));
        if (req.method === 'GET' && url.pathname === '/api/staff/report') return json(res, 200, collegeReport(actor, Object.fromEntries(url.searchParams), {
          students: campus.allStudents,
          campus: campus.getCampus
        }));
        if (req.method === 'GET' && url.pathname === '/api/staff/student') return json(res, 200, campus.studentDetail(actor, url.searchParams.get('id')));
        if (req.method === 'POST' && url.pathname === '/api/staff/preview') return json(res, 200, {
          students: campus.resolveAudience(actor, (await body(req)).audience)
        });
        if (req.method === 'POST' && url.pathname === '/api/staff/action') {
          const {
            type,
            payload
          } = await body(req, 512 * 1024);
          if (type === 'item.save') {
            payload.fileIds = files.validate(actor, payload.fileIds || []);
            payload.files = payload.fileIds.map(fileId => files.get(actor, fileId).file);
          }
          return json(res, 200, campus.mutate(actor, type, payload));
        }
        return json(res, 404, {
          error: 'Staff endpoint not found.'
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/action') {
        const {
          type,
          payload
        } = await body(req);
        const state = getState(id);
        if (['assignment.submit', 'assignment.draft'].includes(type)) {
          payload.fileIds = files.validate(state, payload.fileIds || [], payload.id);
          payload.files = payload.fileIds.map(fileId => files.get(state, fileId).file);
        }
        if (type.startsWith('community.')) {
          community.action(state, type, payload);
          state.version++;
          save(state);
          return json(res, 200, {
            state: snapshot(state),
            result: {}
          });
        }
        if (isStaff(state.profile)) return json(res, 403, {
          error: 'Use the staff workspace to manage college records.'
        });
        const handled = campus.studentAction(state, type, payload);
        const result = handled ? (state.version++, {}) : applyAction(state, type, payload);
        save(state);
        json(res, 200, {
          state: snapshot(state),
          result
        });
        broadcastChange(id);
        return;
      }
      if (req.method === 'POST' && url.pathname.startsWith('/api/labs/')) {
        const state = getState(id);
        if (isStaff(state.profile)) return json(res, 403, {
          error: 'Open a student account to practise an assessment.'
        });
        const data = await body(req);
        assessmentSession(state, data.id, data.sessionId);
        if (typeof data.code !== 'string' || data.code.length > 12000) throw new Error('Keep the solution under 12,000 characters.');
        let result;
        if (url.pathname === '/api/labs/sql') result = await runSqlLab(data.id, data.code);else if (url.pathname === '/api/labs/project') {
          const lab = projectLabs.find(l => l.id === data.id);
          if (!lab || !Array.isArray(data.results) || data.results.length !== lab.tests.length) throw new Error('Run every project check first.');
          const checks = lab.tests.map((t, i) => ({
            name: t.name,
            passed: JSON.stringify(canonical(data.results[i].actual)) === JSON.stringify(canonical(t.expected)) && data.results[i].unchanged === true
          }));
          result = {
            checks,
            score: Math.round(checks.filter(c => c.passed).length / checks.length * 100),
            verification: 'Browser-checked practice'
          };
        } else return json(res, 404, {
          error: 'Lab endpoint not found.'
        });
        if (data.submit) {
          if (typeof data.explanation !== 'string' || data.explanation.trim().length < 40) throw new Error('Explain your approach in at least 40 characters.');
          result.explanation = data.explanation.trim().slice(0, 2000);
          const current = getState(id);
          recordAssessment(current, data.id, data.sessionId, result, data.code);
          save(current);
          broadcastChange(id);
          return json(res, 200, {
            ...result,
            saved: true
          });
        }
        return json(res, 200, result);
      }
      if (req.method === 'POST' && url.pathname === '/api/quid') return json(res, 200, await quidHistory.action(id, await body(req)));
      if (req.method === 'POST' && url.pathname === '/api/resume/assist') {
        const s = getState(id);
        if (isStaff(s.profile)) return json(res, 403, {
          error: 'Resume editing belongs to a student workspace.'
        });
        return json(res, 200, await resumeAssist(await body(req), s));
      }
      if (url.pathname.startsWith('/api/')) return json(res, 404, {
        error: 'Endpoint not found.'
      });
      const dist = resolve(root, 'dist');
      if (existsSync(dist)) {
        let file = resolve(dist, '.' + decodeURIComponent(url.pathname));
        if (file !== dist && !file.startsWith(dist + sep)) return json(res, 403, {
          error: 'Invalid path.'
        });
        if (!existsSync(file) || !extname(file)) file = resolve(dist, 'index.html');
        const types = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.svg': 'image/svg+xml',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.ico': 'image/x-icon',
          '.png': 'image/png'
        };
        if (file.endsWith('practice-runner.html')) {
          res.removeHeader('X-Frame-Options');
          res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'; img-src 'none'; style-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'");
        }
        res.writeHead(200, {
          'Content-Type': types[extname(file)] || 'application/octet-stream'
        });
        res.end(readFileSync(file));
        return;
      }
      json(res, 404, {
        error: 'Open http://127.0.0.1:5180.'
      });
    } catch (error) {
      json(res, error.status || 400, {
        error: error.message || 'The update could not be saved.'
      });
    }
  };
  const server = createServer(handleRequest);
  const heartbeat = options.listen ? setInterval(() => {
    campus.publishDue();
    if (process.env.OPPORTUNITY_FEED_URL) jobService.enqueue({
      key: 'opportunity-refresh:' + Math.floor(Date.now() / 3600000),
      kind: 'opportunities-refresh',
      payload: {}
    });
    sessions.cleanup();
    jobService.tick().catch(error => console.error(JSON.stringify({
      event: 'jobs.error',
      message: error.message
    })));
    for (const stream of subscribers.keys()) stream.write(': heartbeat\n\n');
  }, 20000) : null;
  if (options.listen) server.listen(config.port, config.host, () => console.log('StudentOS API · local SQLite workspaces'));
  function close() {
    clearInterval(heartbeat);
    for (const stream of subscribers.keys()) stream.end();
    server.close(() => {
      db.close();
      process.exit(0);
    });
  }
  if (options.listen) {
    process.on('SIGINT', close);
    process.on('SIGTERM', close);
  }
  return {
    db,
    server,
    handleRequest,
    config,
    maintenance: async () => {
      campus.publishDue();
      sessions.cleanup();
      await jobService.tick();
    }
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) createApplication({
  listen: true
});
