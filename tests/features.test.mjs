import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { migrateDatabase, indexProgress } from '../server/database.mjs';
import { createProfile } from '../server/profiles.mjs';
import { createCommunity } from '../server/community.mjs';
import { createCampusService } from '../server/campus.mjs';
import { createJudge } from '../server/judge.mjs';
import { createOpportunities } from '../server/opportunities.mjs';
import { createQuidHistory } from '../server/quid-history.mjs';
import { createSupport } from '../server/support.mjs';
import { readJsonBody } from '../server/http-body.mjs';
import { copyBackupFiles } from '../server/backup-files.mjs';
import { applyAction, dateKey, ensureDailyPlan } from '../server/model.mjs';
import { queueRecall, scheduleRecall } from '../server/planning.mjs';
import { getLesson } from '../shared/curriculum.js';
import { parseCsv } from '../shared/csv.js';
import { calendarEvent } from '../shared/calendar.js';
import { opportunityStatus } from '../shared/freshness.js';
import { eligibility } from '../shared/eligibility.js';
import { collegeReport } from '../server/reports.mjs';
const clone = structuredClone;
test('request parsing preserves split Unicode characters and enforces byte limits before decoding', async () => {
  const bytes = Buffer.from(JSON.stringify({
    text: 'नमस्ते · ಕನ್ನಡ · 🚀'
  }));
  async function* split() {
    for (const byte of bytes) yield Buffer.from([byte]);
  }
  assert.deepEqual(await readJsonBody(split()), {
    text: 'नमस्ते · ಕನ್ನಡ · 🚀'
  });
  await assert.rejects(readJsonBody(split(), bytes.length - 1), error => error.status === 413);
});
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE profiles(id TEXT PRIMARY KEY,handle TEXT UNIQUE,document TEXT);');
  migrateDatabase(db);
  const read = id => {
      const r = db.prepare('SELECT document FROM profiles WHERE id=?').get(id);
      return r && JSON.parse(r.document);
    },
    save = s => {
      db.prepare('INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(s.profile.id, s.profile.handle, JSON.stringify(s));
      indexProgress(db, s);
    };
  const actors = {};
  for (const [key, role, college] of [['student', 'student', 'test'], ['peer', 'student', 'test'], ['teacher', 'teacher', 'test'], ['placement', 'placement', 'test'], ['admin', 'admin', 'test'], ['outside', 'student', 'outside']]) {
    const s = createProfile({
      name: key + ' Example',
      handle: 'feature-' + key,
      college: college + ' College'
    });
    Object.assign(s.profile, {
      role,
      collegeId: college,
      year: 4,
      cgpa: key === 'peer' ? 5 : 9,
      backlogs: 0
    });
    save(s);
    actors[key] = s;
  }
  const community = createCommunity({
      db,
      readProfile: read,
      saveProfile: save,
      broadcastCampus: () => {}
    }),
    campus = createCampusService({
      db,
      readProfile: read,
      saveProfile: save,
      onPublished: (actor, item) => community.shareItem(actor, item)
    });
  return {
    db,
    read,
    save,
    community,
    campus,
    ...actors,
    close: () => db.close()
  };
}
const work = f => ({
  kind: 'Assignment',
  title: 'Review a transaction contract',
  description: 'Explain the transaction invariant, one failure case and a regression check.',
  audience: {
    scope: 'selected',
    ids: [f.student.profile.id]
  },
  publish: true,
  maxPoints: 100
});
test('support conversations stay private across students and colleges, including older requests', () => {
  const f = fixture();
  try {
    const support = createSupport(f);
    const request = support.action(f.student, {
      operation: 'create',
      category: 'App problem',
      subject: 'Saved assignment draft',
      text: 'My saved assignment explanation needs a college support review.'
    });
    for (let i = 0; i < 105; i++) support.action(f.peer, {
      operation: 'create',
      category: 'App problem',
      subject: 'Peer request ' + i,
      text: 'A separate request belonging only to this other student.'
    });
    assert.equal(support.list(f.student).length, 1);
    assert.equal(support.list(f.teacher).length, 0);
    assert.equal(support.list(f.outside).length, 0);
    assert.throws(() => support.action(f.peer, {
      operation: 'reply',
      id: request.id,
      text: 'Must not be visible.'
    }), /not found/);
    assert.throws(() => support.action(f.outside, {
      operation: 'reply',
      id: request.id,
      text: 'Cross-college access.'
    }), /not found/);
    assert.throws(() => support.action(f.student, {
      operation: 'status',
      id: request.id,
      status: 'resolved'
    }), /not allowed/);
    support.action(f.admin, {
      operation: 'reply',
      id: request.id,
      text: 'The college has checked this saved draft.'
    });
    support.action(f.admin, {
      operation: 'status',
      id: request.id,
      status: 'resolved'
    });
    assert.equal(support.list(f.student)[0].status, 'resolved');
    assert.equal(support.list(f.student)[0].responses.length, 1);
  } finally {
    f.close();
  }
});
test('malformed action payloads cannot change lessons, milestones or published coursework', () => {
  const f = fixture();
  try {
    const before = clone(f.student);
    assert.throws(() => applyAction(f.student, 'course.complete', {
      id: 'sql',
      lesson: '0',
      answer: 0,
      reflection: 'A string is not a numeric lesson index.'
    }), /lesson number/);
    assert.throws(() => applyAction(f.student, 'project.step', {
      id: 'portfolio',
      step: false
    }), /project step/);
    assert.throws(() => applyAction(f.student, 'quiz.draft', {
      answers: '0,1,2'
    }), /list/);
    assert.throws(() => applyAction(f.student, 'profile.update', []), /object/);
    assert.deepEqual(f.student, before);
    assert.throws(() => f.campus.mutate(f.teacher, 'item.save', {
      ...work(f),
      publish: 'false'
    }), /true or false/);
    assert.equal(f.read(f.student.profile.id).assignments.length, before.assignments.length);
  } finally {
    f.close();
  }
});
test('staff summaries and student detail use the same demonstrated skill scores as readiness', () => {
  const f = fixture();
  try {
    f.student.skills = Object.fromEntries(Object.keys(f.student.skills).map(key => [key, 100]));
    f.save(f.student);
    const summary = f.campus.staffData(f.teacher).students.find(s => s.id === f.student.profile.id);
    const detail = f.campus.studentDetail(f.teacher, f.student.profile.id);
    assert.equal(summary.readiness, 0);
    assert.equal(summary.skills.DSA, 0);
    assert.deepEqual(detail.skills, summary.verifiedSkills);
    assert.equal(f.read(f.student.profile.id).skills.DSA, 100);
  } finally {
    f.close();
  }
});
test('reports and blocks protect post and DM visibility, and only college moderators can hide reports', () => {
  const f = fixture();
  try {
    f.community.action(f.student, 'community.post', {
      text: 'A project discussion for our college.',
      tag: 'Project'
    });
    const p = f.community.snapshot(f.peer).communityPosts[0];
    f.community.action(f.peer, 'community.report', {
      id: p.id,
      reason: 'Please review this example report.'
    });
    assert.throws(() => f.community.action(f.teacher, 'community.moderate', {
      id: 'invalid',
      decision: 'hide',
      note: 'No permission'
    }), /role/);
    const report = f.community.snapshot(f.admin).communityReports[0];
    f.community.action(f.admin, 'community.moderate', {
      id: report.id,
      decision: 'hide',
      note: 'Review completed in a fixture.'
    });
    assert.equal(f.community.snapshot(f.peer).communityPosts.length, 0);
    f.community.action(f.admin, 'community.moderate', {
      id: report.id,
      decision: 'restore',
      note: 'Restore the reviewed fixture.'
    });
    f.community.action(f.peer, 'community.block', {
      id: f.student.profile.id
    });
    assert.equal(f.community.snapshot(f.peer).communityPosts.length, 0);
    assert.throws(() => f.community.action(f.student, 'community.message', {
      to: f.peer.profile.id,
      text: 'This must be blocked.'
    }), /unavailable/);
    assert.equal(f.community.snapshot(f.outside).communityPosts?.length || 0, 0);
  } finally {
    f.close();
  }
});
test('private conversations expose unread counts only to the recipient and persist read state', () => {
  const f = fixture();
  try {
    f.community.action(f.student, 'community.message', {
      to: f.teacher.profile.id,
      text: 'An individual project question.'
    });
    assert.equal(f.community.snapshot(f.teacher).communityUnread[f.student.profile.id], 1);
    assert.equal(f.community.snapshot(f.peer).communityMessages.length, 0);
    f.community.action(f.teacher, 'community.read', {
      thread: f.student.profile.id
    });
    assert.equal(f.community.snapshot(f.teacher).communityUnread[f.student.profile.id], 0);
    assert.equal(f.community.snapshot(f.admin).communityMessages.length, 0);
  } finally {
    f.close();
  }
});
test('community cursors use a stable order and retain visibility filters across pages', () => {
  const f = fixture();
  try {
    for (let i = 0; i < 61; i++) f.community.action(f.student, 'community.post', {
      text: 'Original update ' + i,
      tag: 'Learning'
    });
    const first = f.community.page(f.peer, {
        limit: 20
      }),
      next = f.community.page(f.peer, {
        limit: 20,
        before: first.cursor
      });
    assert.equal(first.posts.length, 20);
    assert.equal(next.posts.length, 20);
    assert.equal(new Set([...first.posts, ...next.posts].map(p => p.id)).size, 40);
    assert.ok(next.hasMore);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM community_posts').get().n, 61);
  } finally {
    f.close();
  }
});
test('event teams require registration, remain bounded, and attendance is staff-confirmed', () => {
  const f = fixture();
  try {
    const c = f.community.read('test');
    c.events.push({
      id: 'event',
      name: 'A campus workshop',
      date: dateKey(),
      description: 'Trace a service request.',
      attendees: [],
      teams: []
    });
    f.community.save(c);
    assert.throws(() => f.community.action(f.student, 'community.event.team', {
      id: 'event',
      name: 'Builders'
    }), /Register/);
    for (const s of [f.student, f.peer]) f.community.action(s, 'community.event.register', {
      id: 'event'
    });
    f.community.action(f.student, 'community.event.team', {
      id: 'event',
      name: 'Builders'
    });
    const team = f.community.read('test').events[0].teams[0];
    f.community.action(f.peer, 'community.event.team', {
      id: 'event',
      teamId: team.id
    });
    assert.equal(f.community.read('test').events[0].teams[0].members.length, 2);
    f.community.action(f.teacher, 'community.event.attendance', {
      id: 'event',
      studentId: f.student.profile.id
    });
    assert.equal(f.read(f.student.profile.id).eventEvidence[0].id, 'event');
    f.community.action(f.teacher, 'community.event.cancel', {
      id: 'event',
      reason: 'Fixture event was cancelled.'
    });
    assert.throws(() => f.community.action(f.student, 'community.event.register', {
      id: 'event'
    }), /closed/);
    const ics = calendarEvent({
      id: 'event',
      name: 'Workshop\nInjected',
      date: dateKey(),
      description: 'Hello, campus',
      location: 'Lab; One'
    });
    assert.ok(ics.includes('SUMMARY:Workshop\\nInjected'));
    assert.ok(ics.includes('DTEND;VALUE=DATE:'));
  } finally {
    f.close();
  }
});
test('resume role versions preserve factual entries and restoring keeps a recovery version', () => {
  const f = fixture();
  try {
    const s = f.student;
    applyAction(s, 'resume.entry', {
      section: 'experience',
      title: 'Student project intern',
      organization: 'Fixture Lab',
      period: 'October 2026',
      description: 'Implemented input validation and documented regression checks.',
      url: 'https://example.com/evidence'
    });
    applyAction(s, 'resume.version', {
      name: 'Backend graduate',
      targetRole: 'Backend'
    });
    const id = s.resumeVersions[0].id;
    applyAction(s, 'resume.entry.delete', {
      section: 'experience',
      id: s.resume.experience[0].id
    });
    assert.equal(s.resume.experience.length, 0);
    applyAction(s, 'resume.restore', {
      id
    });
    assert.equal(s.resume.experience[0].organization, 'Fixture Lab');
    assert.equal(s.resumeVersions.length, 2);
    assert.throws(() => applyAction(s, 'project.evidence', {
      id: 'campus',
      repository: 'javascript:alert(1)',
      contribution: 'I implemented and tested the event registration endpoint.',
      tests: 'Boundary and duplicate-registration checks.'
    }), /HTTP/);
    applyAction(s, 'project.evidence', {
      id: 'campus',
      repository: 'https://example.com/repo',
      contribution: 'I implemented and tested the event registration endpoint.',
      tests: 'Boundary and duplicate-registration checks.'
    });
    assert.equal(s.projectEvidence.campus.status, 'pending');
  } finally {
    f.close();
  }
});
test('reviewed project evidence is scoped to the college and records a scored source', () => {
  const f = fixture();
  try {
    const s = f.student;
    applyAction(s, 'project.evidence', {
      id: 'campus',
      repository: 'https://example.com/repo',
      contribution: 'I implemented the request validation and tested duplicate registrations.',
      tests: 'A concurrent-request regression and invalid-input tests.'
    });
    f.save(s);
    f.campus.mutate(f.teacher, 'project.review', {
      studentId: s.profile.id,
      projectId: 'campus',
      score: 86,
      feedback: 'The invariant is documented with reproducible tests.'
    });
    const saved = f.read(s.profile.id);
    assert.equal(saved.projectEvidence.campus.review.score, 86);
    assert.equal(saved.progressEvents.at(-1).verification, 'mentor-reviewed');
    assert.throws(() => f.campus.mutate({
      ...f.teacher,
      profile: {
        ...f.teacher.profile,
        collegeId: 'outside'
      }
    }, 'project.review', {
      studentId: s.profile.id,
      projectId: 'campus',
      score: 99,
      feedback: 'Cross-college review should fail.'
    }), /not found/);
  } finally {
    f.close();
  }
});
test('trusted judge compares remote outputs on the server and rewards a solved problem once', async () => {
  const f = fixture();
  try {
    const mock = async (url, options) => {
      const input = JSON.parse(options.body);
      assert.equal(input.limits.network, false);
      assert.equal(input.tests[0].expected, undefined);
      return {
        ok: true,
        text: async () => JSON.stringify({
          results: input.tests.map(t => {
            const [numbers, target] = t.args;
            for (let i = 0; i < numbers.length; i++) for (let j = i + 1; j < numbers.length; j++) if (numbers[i] + numbers[j] === target) return {
              actual: [j, i]
            };
            return {
              actual: []
            };
          }),
          durationMs: 8,
          memoryKb: 1024
        })
      };
    };
    const judge = createJudge({
        db: f.db,
        read: f.read,
        save: f.save,
        fetcher: mock,
        env: {
          JUDGE_URL: 'https://runner.example/run',
          JUDGE_TOKEN: 'fixture-only'
        }
      }),
      p = {
        id: 'two-sum',
        language: 'python',
        code: 'def twoSum(nums, target):\n    return []'
      };
    const first = await judge.run(f.student.profile.id, p);
    assert.equal(first.score, 100);
    const xp = f.read(f.student.profile.id).journey.xp;
    await judge.run(f.student.profile.id, p);
    assert.equal(f.read(f.student.profile.id).journey.xp, xp);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM judge_runs').get().n, 2);
    const disconnected = createJudge({
      db: f.db,
      read: f.read,
      save: f.save,
      env: {}
    });
    await assert.rejects(() => disconnected.run(f.student.profile.id, p), /not connected/);
  } finally {
    f.close();
  }
});
test('opportunity imports validate the entire batch, deduplicate source URLs and expose freshness', () => {
  const f = fixture();
  try {
    const jobs = [],
      service = createOpportunities({
        db: f.db,
        jobs
      }),
      row = {
        company: 'Fixture Employer',
        title: 'Graduate engineer',
        description: 'Build and test an internal service.',
        eligibility: 'Final-year computer science students.',
        country: 'India',
        location: 'Bengaluru',
        sourceUrl: 'https://example.com/jobs/one',
        years: [4],
        skills: ['Backend'],
        requirements: ['Original project evidence']
      };
    service.importRows(f.admin, {
      rows: [row]
    });
    service.importRows(f.admin, {
      rows: [{
        ...row,
        title: 'Graduate backend engineer'
      }]
    });
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].title, 'Graduate backend engineer');
    assert.throws(() => service.importRows(f.admin, {
      rows: [row, {
        ...row,
        years: [7]
      }]
    }), /eligibility years/);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM opportunities').get().n, 1);
    assert.equal(opportunityStatus({
      ...jobs[0],
      availability: 'closed'
    }).open, false);
    assert.equal(opportunityStatus({
      ...jobs[0],
      verifiedAt: '2020-01-01'
    }).label, 'Needs a fresh source check');
  } finally {
    f.close();
  }
});
test('placement eligibility filters invitations and a closed drive rejects student registration', () => {
  const f = fixture();
  try {
    const r = f.campus.mutate(f.placement, 'drive.create', {
      company: 'Fixture Company',
      title: 'Backend campus drive',
      description: 'A scheduled graduate recruitment process.',
      eligibility: {
        minCgpa: 8,
        maxBacklogs: 0
      },
      audience: {
        scope: 'selected',
        ids: [f.student.profile.id, f.peer.profile.id]
      }
    }).result;
    let drive = f.campus.getCampus('test').drives[0];
    assert.equal(drive.applications.length, 1);
    assert.equal(drive.excluded[0].studentId, f.peer.profile.id);
    f.campus.mutate(f.placement, 'drive.stage', {
      driveId: r.id,
      studentIds: [f.student.profile.id],
      stage: 'Offered'
    });
    assert.equal(f.read(f.student.profile.id).applications[0].provenance, 'college placement team');
    f.campus.mutate(f.placement, 'drive.update', {
      id: r.id,
      status: 'Closed',
      rounds: [{
        name: 'Technical round',
        at: new Date().toISOString(),
        location: 'Lab 2',
        url: 'https://example.com/round'
      }]
    });
    assert.throws(() => f.campus.studentAction(f.read(f.student.profile.id), 'campus-drive.applied', {
      id: r.id
    }), /closed/);
    assert.equal(f.read(f.student.profile.id).campusDrives[0].rounds.length, 1);
    assert.ok(eligibility({
      year: 4,
      cgpa: null
    }, {
      minCgpa: 7
    }).reasons.length);
  } finally {
    f.close();
  }
});
test('rubric review totals match grades and retain immutable review versions', () => {
  const f = fixture();
  try {
    const id = f.campus.mutate(f.teacher, 'item.save', work(f)).result.id,
      s = f.read(f.student.profile.id);
    applyAction(s, 'assignment.submit', {
      id,
      text: 'The transaction preserves capacity under concurrent requests.'
    });
    f.save(s);
    assert.throws(() => f.campus.mutate(f.teacher, 'submission.review', {
      itemId: id,
      studentId: s.profile.id,
      grade: 100,
      feedback: 'A fixture review.',
      rubricScores: {
        correctness: 20,
        implementation: 20,
        explanation: 10,
        presentation: 10
      }
    }), /rubric total/);
    assert.equal(f.read(s.profile.id).assignments[0].grade, null);
    f.campus.mutate(f.teacher, 'submission.review', {
      itemId: id,
      studentId: s.profile.id,
      grade: 60,
      feedback: 'Add the missing race regression.',
      rubricScores: {
        correctness: 20,
        implementation: 20,
        explanation: 10,
        presentation: 10
      },
      requestRevision: true
    });
    assert.equal(f.read(s.profile.id).assignments[0].reviewHistory[0].grade, 60);
  } finally {
    f.close();
  }
});
test('an assigned lab submission must reference a saved matching attempt made after publication', () => {
  const f = fixture();
  try {
    const id = f.campus.mutate(f.teacher, 'item.save', {
        ...work(f),
        labId: 'duplicate-events'
      }).result.id,
      s = f.read(f.student.profile.id);
    assert.throws(() => applyAction(s, 'assignment.submit', {
      id,
      text: 'A query that groups duplicate deliveries correctly.'
    }), /saved an attempt|save an attempt/);
    s.assessmentAttempts = [{
      id: 'old',
      labId: 'duplicate-events',
      time: '2020-01-01',
      score: 100
    }];
    assert.throws(() => applyAction(s, 'assignment.submit', {
      id,
      text: 'An old run must not satisfy newly assigned work.',
      labAttemptId: 'old'
    }), /save an attempt/);
    s.assessmentAttempts.push({
      id: 'new',
      labId: 'duplicate-events',
      time: new Date(Date.now() + 1000).toISOString(),
      score: 100,
      verification: 'Server SQL checks'
    });
    applyAction(s, 'assignment.submit', {
      id,
      text: 'A fresh grouped query with a checked duplicate count.',
      labAttemptId: 'new'
    });
    assert.equal(s.assignments[0].versions[0].labAttempt.id, 'new');
  } finally {
    f.close();
  }
});
test('scheduled publication delivers once and period reports reconcile with recorded evidence', () => {
  const f = fixture();
  try {
    const id = f.campus.mutate(f.teacher, 'item.save', {
      ...work(f),
      scheduleAt: new Date(Date.now() + 60000).toISOString()
    }).result.id;
    assert.equal(f.read(f.student.profile.id).assignments.length, 0);
    const c = f.campus.getCampus('test');
    c.items[0].scheduleAt = new Date(Date.now() - 1000).toISOString();
    f.db.prepare('UPDATE campuses SET document=? WHERE id=?').run(JSON.stringify(c), 'test');
    f.campus.publishDue();
    f.campus.publishDue();
    assert.equal(f.read(f.student.profile.id).assignments.length, 1);
    const report = collegeReport(f.teacher, {
      from: dateKey(),
      to: dateKey()
    }, {
      students: f.campus.allStudents,
      campus: f.campus.getCampus
    });
    assert.equal(report.students, 2);
    assert.equal(report.cohorts.find(c => c.year === 4).students, 2);
  } finally {
    f.close();
  }
});
test('Quid stores grounded multi-turn history and does not overwrite concurrent student progress', async () => {
  const f = fixture();
  try {
    const service = createQuidHistory({
      read: f.read,
      save: f.save,
      reply: async input => {
        assert.equal(input.history.length, 0);
        assert.ok(input.grounding.lesson.reading);
        const concurrent = f.read(f.student.profile.id);
        concurrent.profile.bio = 'A concurrent saved profile change.';
        f.save(concurrent);
        return {
          text: 'Review the worked example and trace its inputs.',
          actions: [],
          mode: 'fixture'
        };
      }
    });
    const r = await service.action(f.student.profile.id, {
      message: 'Explain this topic.',
      topic: getLesson('sql', 0).title,
      page: '/learn'
    });
    assert.equal(r.messages.length, 2);
    assert.equal(f.read(f.student.profile.id).profile.bio, 'A concurrent saved profile change.');
    await service.action(f.student.profile.id, {
      clear: true
    });
    assert.equal(f.read(f.student.profile.id).quidMessages.length, 0);
  } finally {
    f.close();
  }
});
test('CSV imports handle quoted multiline fields and reject malformed records before use', () => {
  const rows = parseCsv('email,role,department\r\n"one@example.com",student,"Computer, Science"\r\ntwo@example.com,teacher,"Data\nEngineering"');
  assert.equal(rows[0].department, 'Computer, Science');
  assert.equal(rows[1].department, 'Data\nEngineering');
  assert.throws(() => parseCsv('email,role\na@example.com,student,extra'), /different number/);
  assert.throws(() => parseCsv('email,role\n"open,student'), /not closed/);
});
test('backup custody checks file hashes and rejects restored bytes that no longer match', () => {
  const f = fixture(),
    dir = mkdtempSync(join(tmpdir(), 'studentos-custody-'));
  try {
    const key = 'aabbccdd-1234.bin';
    writeFileSync(join(dir, key), 'original');
    f.db.prepare('INSERT INTO files(id,owner_id,college_id,name,mime,size,storage_key,created_at) VALUES(?,?,?,?,?,?,?,?)').run('file', f.student.profile.id, 'test', 'notes.txt', 'text/plain', 8, key, new Date().toISOString());
    const manifest = copyBackupFiles(f.db, dir, join(dir, 'backup'));
    writeFileSync(join(dir, 'backup', key), 'tampered');
    assert.throws(() => copyBackupFiles(f.db, join(dir, 'backup'), join(dir, 'restore'), manifest), /checksum/);
  } finally {
    f.close();
    const path = resolve(dir);
    assert.ok(path.startsWith(resolve(tmpdir()) + sep));
    rmSync(path, {
      recursive: true
    });
  }
});
test('spaced recall is scheduled without duplicate rewards and exam breaks leave earned work intact', () => {
  const f = fixture();
  try {
    const s = f.student,
      lesson = getLesson('sql', 0);
    scheduleRecall(s, {
      ...lesson,
      skill: 'Databases'
    }, '2026-01-01');
    assert.equal(s.recallSchedule[0].dueAt, '2026-01-04');
    queueRecall(s, '2026-01-05');
    queueRecall(s, '2026-01-05');
    assert.equal(s.tasks.filter(t => t.id.startsWith('recall-')).length, 1);
    const old = s.journey.xp;
    applyAction(s, 'rest.period', {
      start: dateKey(),
      end: dateKey(),
      reason: 'Exams'
    });
    assert.ok(s.journey.restDays.includes(dateKey()));
    assert.equal(s.journey.xp, old);
    assert.throws(() => applyAction(s, 'rest.period', {
      start: dateKey(),
      end: '2099-02-31'
    }), /break/);
  } finally {
    f.close();
  }
});
