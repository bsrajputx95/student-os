import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import { createCampusService, createStaffProfile, rankJobs } from '../server/campus.mjs';
import { createProfile } from '../server/profiles.mjs';
import { applyAction } from '../server/model.mjs';
import { catalog, quizzes } from '../shared/catalog.js';
import { csvExport } from '../shared/staff.js';
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE profiles(id TEXT PRIMARY KEY,handle TEXT UNIQUE,document TEXT)');
  const saveProfile = s => db.prepare('INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(s.profile.id, s.profile.handle, JSON.stringify(s));
  const readProfile = id => {
    const row = db.prepare('SELECT document FROM profiles WHERE id=?').get(id);
    return row ? JSON.parse(row.document) : null;
  };
  const students = ['one', 'two', 'outside'].map((id, i) => {
    const s = createProfile({
      name: 'Student ' + id,
      handle: 'student-' + id,
      college: i === 2 ? 'Another College' : 'StudentOS Demo Campus'
    });
    s.profile.id = id;
    s.profile.year = i === 0 ? 3 : 4;
    saveProfile(s);
    return s;
  });
  const teacher = createStaffProfile('teacher'),
    placement = createStaffProfile('placement');
  const service = createCampusService({
    db,
    readProfile,
    saveProfile
  });
  return {
    db,
    saveProfile,
    readProfile,
    students,
    teacher,
    placement,
    ...service
  };
}
const assignment = {
  kind: 'Assignment',
  title: 'Build a small validated API',
  description: 'Implement endpoints with validation and explain your design decisions.',
  deadline: '2026-11-10',
  maxPoints: 100,
  audience: {
    scope: 'filter',
    filters: {
      year: '3'
    }
  },
  publish: true
};
test('staff access is scoped to the college and student sessions are rejected', () => {
  const f = fixture();
  assert.equal(f.staffData(f.teacher).students.length, 2);
  assert.throws(() => f.staffData(f.students[0]), /session is required/);
  assert.throws(() => f.studentDetail(f.teacher, 'outside'), /not found/);
  assert.throws(() => f.resolveAudience(f.teacher, {
    scope: 'selected',
    ids: ['outside']
  }), /outside/);
  f.db.close();
});
test('bulk assignments reach only the reviewed audience and publication is idempotent', () => {
  const f = fixture();
  const {
    result
  } = f.mutate(f.teacher, 'item.save', assignment);
  assert.equal(result.recipients, 1);
  assert.equal(f.readProfile('one').assignments.length, 1);
  assert.equal(f.readProfile('two').assignments.length, 0);
  f.mutate(f.teacher, 'item.publish', {
    id: result.id
  });
  assert.equal(f.readProfile('one').assignments.length, 1);
  assert.equal(f.readProfile('one').notifications.filter(n => n.id === 'staff-' + result.id).length, 1);
  const student = f.readProfile('one');
  applyAction(student, 'assignment.submit', {
    id: result.id,
    text: 'I implemented the API and validated the inputs.',
    url: 'https://example.com/my-project'
  });
  f.saveProfile(student);
  assert.equal(f.staffData(f.teacher).summary.toReview, 1);
  f.db.close();
});
test('drafts deliver nothing, invalid audiences roll back, and grade limits are enforced', () => {
  const f = fixture();
  f.mutate(f.teacher, 'item.save', {
    ...assignment,
    publish: false
  });
  assert.equal(f.readProfile('one').assignments.length, 0);
  const before = f.staffData(f.teacher).items.length;
  assert.throws(() => f.mutate(f.teacher, 'item.save', {
    ...assignment,
    audience: {
      scope: 'selected',
      ids: ['one', 'outside']
    }
  }), /outside/);
  assert.equal(f.staffData(f.teacher).items.length, before);
  assert.throws(() => f.mutate(f.teacher, 'item.save', {
    ...assignment,
    sourceUrl: 'javascript:alert(1)'
  }), /http/);
  assert.equal(f.staffData(f.teacher).items.length, before);
  const {
    result
  } = f.mutate(f.teacher, 'item.save', assignment);
  const s = f.readProfile('one');
  applyAction(s, 'assignment.submit', {
    id: result.id,
    text: 'Here is a useful project explanation.'
  });
  f.saveProfile(s);
  assert.throws(() => f.mutate(f.teacher, 'submission.review', {
    itemId: result.id,
    studentId: 'one',
    grade: 101,
    feedback: 'Too high'
  }), /0 to 100/);
  assert.equal(f.readProfile('one').assignments[0].status, 'submitted');
  f.db.close();
});
test('reviews, revision requests and resubmissions stay connected without duplicate XP', () => {
  const f = fixture(),
    {
      result
    } = f.mutate(f.teacher, 'item.save', assignment);
  let s = f.readProfile('one');
  applyAction(s, 'assignment.submit', {
    id: result.id,
    text: 'The first version explains my approach.'
  });
  f.saveProfile(s);
  const xp = s.journey.xp;
  f.mutate(f.teacher, 'submission.review', {
    itemId: result.id,
    studentId: 'one',
    grade: 70,
    feedback: 'Add input validation and two integration tests.',
    requestRevision: true
  });
  s = f.readProfile('one');
  assert.equal(s.assignments[0].status, 'revision requested');
  assert.equal(s.assignments[0].feedback, 'Add input validation and two integration tests.');
  applyAction(s, 'assignment.submit', {
    id: result.id,
    text: 'I added input validation and integration tests.'
  });
  assert.equal(s.journey.xp, xp);
  f.saveProfile(s);
  f.mutate(f.teacher, 'submission.review', {
    itemId: result.id,
    studentId: 'one',
    grade: 92,
    feedback: 'The revision is much clearer. Good test coverage.'
  });
  assert.equal(f.readProfile('one').assignments[0].grade, 92);
  assert.equal(f.staffData(f.teacher).items[0].reviewed, 1);
  f.db.close();
});
test('teacher quizzes are graded on the server and return to the college dashboard', () => {
  const f = fixture(),
    quiz = quizzes[0];
  const {
    result
  } = f.mutate(f.teacher, 'item.save', {
    ...assignment,
    kind: 'Quiz',
    quizId: quiz.id
  });
  const s = f.readProfile('one');
  assert.throws(() => applyAction(s, 'assignment.submit', {
    id: result.id,
    text: 'Fake quiz completion'
  }), /Complete the assigned quiz/);
  const {
    session
  } = applyAction(s, 'quiz.start', {
    id: quiz.id,
    assignmentId: result.id
  });
  applyAction(s, 'quiz.submit', {
    id: quiz.id,
    assignmentId: result.id,
    sessionId: session.id,
    answers: quiz.questions.map(q => q.correct)
  });
  f.saveProfile(s);
  assert.equal(f.readProfile('one').assignments[0].grade, 100);
  assert.equal(f.staffData(f.teacher).items[0].reviewed, 1);
  f.db.close();
});
test('guidance supports student acknowledgement and replies while mentor notes stay staff-only', () => {
  const f = fixture();
  const {
    result
  } = f.mutate(f.placement, 'item.save', {
    ...assignment,
    kind: 'Feedback',
    title: 'Practise explaining your project',
    description: 'Explain the problem, your technical choices, and one result.',
    audience: {
      scope: 'selected',
      ids: ['two']
    }
  });
  const s = f.readProfile('two');
  applyAction(s, 'staff-message.read', {
    id: result.id
  });
  applyAction(s, 'staff-message.reply', {
    id: result.id,
    text: 'I will prepare a two-minute walkthrough.'
  });
  f.saveProfile(s);
  f.mutate(f.teacher, 'note.add', {
    studentId: 'two',
    text: 'Check the walkthrough at the next mentoring session.'
  });
  assert.equal(f.readProfile('two').notes, undefined);
  assert.equal(f.studentDetail(f.teacher, 'two').notes.length, 1);
  const delivery = f.staffData(f.teacher).items[0].deliveries[0];
  assert.equal(delivery.read, true);
  assert.equal(delivery.replies.length, 1);
  f.db.close();
});
test('placement drives require placement staff and pipeline stages update student applications', () => {
  const f = fixture();
  const payload = {
    company: 'Example campus partner',
    title: 'College engineering drive',
    description: 'A local test recruitment workflow.',
    date: '2026-11-12',
    deadline: '2026-11-10',
    audience: {
      scope: 'selected',
      ids: ['two']
    }
  };
  assert.throws(() => f.mutate(f.teacher, 'drive.create', payload), /role|Placement staff/);
  const {
    result
  } = f.mutate(f.placement, 'drive.create', payload);
  assert.equal(f.readProfile('two').campusDrives[0].status, 'Invited');
  assert.throws(() => f.studentAction(f.readProfile('outside'), 'campus-drive.applied', {
    id: result.id
  }), /not found/);
  const s = f.readProfile('two');
  f.studentAction(s, 'campus-drive.applied', {
    id: result.id
  });
  f.saveProfile(s);
  assert.equal(f.staffData(f.placement).drives[0].applications[0].status, 'Applied');
  f.mutate(f.placement, 'drive.stage', {
    driveId: result.id,
    studentId: 'two',
    stage: 'Offered'
  });
  assert.equal(f.readProfile('two').applications[0].status, 'Selected');
  assert.equal(f.readProfile('two').campusDrives[0].status, 'Offered');
  f.db.close();
});
test('role matching explains skill gaps, and exports escape spreadsheet formulas', () => {
  const match = rankJobs({
    year: 4,
    skills: {
      DSA: 20,
      Backend: 80,
      Frontend: 80,
      Databases: 50,
      Communication: 50,
      DevOps: 10
    }
  }, [catalog.jobs[0]])[0];
  assert.ok(match.gaps.some(g => g.skill === 'DSA'));
  assert.ok(match.score < 80);
  assert.ok(csvExport([['=HYPERLINK("example")', 'Normal']]).includes("'=HYPERLINK"));
});
test('projects, college announcements, events and opportunities reach their connected student sections', () => {
  const f = fixture();
  for (const kind of ['Project', 'Announcement', 'Event', 'Opportunity']) f.mutate(f.placement, 'item.save', {
    ...assignment,
    kind,
    projectId: kind === 'Project' ? 'campus' : undefined,
    jobId: kind === 'Opportunity' ? catalog.jobs[0].id : undefined,
    sourceUrl: kind === 'Event' ? 'https://hacktoberfest.com/' : '',
    audience: {
      scope: 'everyone'
    }
  });
  const s = f.readProfile('one');
  assert.ok(s.assignments.some(a => a.kind === 'Project' && a.projectId === 'campus'));
  assert.ok(s.campusUpdates.some(u => u.kind === 'Announcement'));
  const event = s.campusUpdates.find(u => u.kind === 'Event');
  assert.equal(event.sourceUrl, 'https://hacktoberfest.com/');
  applyAction(s, 'campus-update.read', {
    id: event.id
  });
  f.saveProfile(s);
  assert.equal(f.staffData(f.placement).items.find(i => i.id === event.id).deliveries.find(d => d.studentId === 'one').read, true);
  assert.equal(s.recommendedJobs[0].jobId, catalog.jobs[0].id);
  assert.equal(f.readProfile('outside').campusUpdates, undefined);
  f.db.close();
});
test('HTTP roles enforce access and deliver staff-published work to an existing student session', async () => {
  const child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '5098',
      STUDENTOS_TEST_DB: 'memory'
    },
    stdio: 'pipe'
  });
  let output = '';
  child.stderr.on('data', d => output += d);
  try {
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch('http://127.0.0.1:5098/api/health')).ok) break;
      } catch {}
      await new Promise(r => setTimeout(r, 50));
    }
    const call = async (path, body, cookie) => {
      const res = await fetch('http://127.0.0.1:5098/api/' + path, {
        method: body ? 'POST' : 'GET',
        headers: {
          ...(body ? {
            'Content-Type': 'application/json'
          } : {}),
          ...(cookie ? {
            Cookie: cookie
          } : {})
        },
        ...(body ? {
          body: JSON.stringify(body)
        } : {})
      });
      return {
        status: res.status,
        data: await res.json(),
        cookie: res.headers.get('set-cookie')?.split(';')[0]
      };
    };
    const student = await call('session', {
      mode: 'demo'
    });
    assert.equal((await call('staff', null, student.cookie)).status, 403);
    const teacher = await call('session', {
      mode: 'staff',
      role: 'teacher'
    });
    assert.equal(teacher.status, 200, JSON.stringify(teacher.data));
    const roster = await call('staff', null, teacher.cookie);
    assert.equal(roster.data.students.length, 16);
    const result = await call('staff/action', {
      type: 'item.save',
      payload: {
        ...assignment,
        audience: {
          scope: 'selected',
          ids: ['demo-bhavanisingh']
        }
      }
    }, teacher.cookie);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    const state = await call('state', null, student.cookie);
    assert.ok(state.data.assignments.some(a => a.id === result.data.result.id));
    assert.equal((await call('action', {
      type: 'profile.update',
      payload: {
        role: 'teacher'
      }
    }, student.cookie)).data.state.profile.role, 'student');
    assert.equal((await call('staff/action', {
      type: 'drive.create',
      payload: {}
    }, teacher.cookie)).status, 403);
  } catch (e) {
    e.message += ' ' + output;
    throw e;
  } finally {
    child.kill('SIGTERM');
  }
});
