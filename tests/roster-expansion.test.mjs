import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createAuth } from '../server/auth.mjs';
import { createCommunity } from '../server/community.mjs';
import { createCampusService } from '../server/campus.mjs';
import { seedHkbk, HKBK_ID } from '../server/hkbk-seed.mjs';
import { expandHkbkRoster } from '../server/roster-expansion.mjs';
import { staffKnowledge } from '../server/quid-context.mjs';
import { metrics } from '../server/model.mjs';
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE profiles(id TEXT PRIMARY KEY,handle TEXT UNIQUE,document TEXT)');
  const saveProfile = s => db.prepare('INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(s.profile.id, s.profile.handle, JSON.stringify(s));
  const readProfile = id => {
    const row = db.prepare('SELECT document FROM profiles WHERE id=?').get(id);
    return row ? JSON.parse(row.document) : null;
  };
  const auth = createAuth(db);
  const community = createCommunity({
    db,
    readProfile,
    saveProfile,
    broadcastCampus: () => {}
  });
  const campus = createCampusService({
    db,
    readProfile,
    saveProfile
  });
  const context = {
    db,
    auth,
    community,
    readProfile,
    saveProfile
  };
  seedHkbk(context);
  return {
    ...context,
    campus
  };
}
test('cohort upgrade adds 100 students per year without replacing existing profiles, credentials or posts', () => {
  const f = fixture();
  try {
    const featured = f.readProfile('demo-bhavanisingh');
    featured.resume.summary = 'Existing student portfolio edit';
    featured.bookmarks = [{
      resourceId: 'devops:11',
      courseId: 'devops',
      lesson: 11
    }];
    f.saveProfile(featured);
    const credential = f.db.prepare('SELECT password_hash FROM credentials WHERE profile_id=?').get(featured.profile.id).password_hash;
    const before = f.community.read(HKBK_ID);
    before.posts[0].text = 'Existing published post edit';
    f.community.save(before);
    assert.deepEqual(expandHkbkRoster(f), {
      added: 400
    });
    const all = f.db.prepare('SELECT document FROM profiles').all().map(r => JSON.parse(r.document));
    assert.equal(all.length, 900);
    for (const year of [1, 2, 3, 4]) assert.equal(all.filter(s => s.profile.role === 'student' && s.profile.year === year).length, 200);
    assert.equal(all.filter(s => s.profile.role !== 'student').length, 100);
    assert.equal(new Set(all.map(s => s.profile.handle)).size, 900);
    const students = all.filter(s => s.profile.role === 'student');
    assert.equal(new Set(students.map(s => s.profile.name)).size, 800);
    assert.ok(students.some(s => metrics(s).readiness < 30));
    assert.ok(students.some(s => metrics(s).readiness > 90));
    const added = students.filter(s => Number(s.profile.id.split('-').at(-1)) >= 101);
    assert.equal(new Set(added.map(s => s.profile.practiceRole)).size, 15);
    assert.ok(added.every(s => s.assignments.length && s.staffMessages.length && s.profile.academicRecordSource === 'fictional sample campus'));
    assert.ok(added.some(s => s.skills.DSA < 40 && s.skills.Databases > 80));
    const connected = added.find(s => s.campusDrives.length && s.profile.year === 4);
    assert.ok(connected);
    for (const drive of connected.campusDrives) assert.ok(f.campus.getCampus(HKBK_ID).drives.find(d => d.id === drive.id).applications.some(a => a.studentId === connected.profile.id && a.status === drive.status));
    assert.equal(f.readProfile(featured.profile.id).resume.summary, featured.resume.summary);
    assert.deepEqual(f.readProfile(featured.profile.id).bookmarks, featured.bookmarks);
    assert.equal(f.db.prepare('SELECT password_hash FROM credentials WHERE profile_id=?').get(featured.profile.id).password_hash, credential);
    assert.equal(f.community.read(HKBK_ID).posts.find(p => p.id === before.posts[0].id).text, 'Existing published post edit');
    assert.equal(f.community.read(HKBK_ID).posts.length, before.posts.length + 400);
    const newStudent = f.readProfile('hkbk-student-2-105');
    newStudent.resume.summary = 'New cohort account edit';
    f.saveProfile(newStudent);
    assert.deepEqual(expandHkbkRoster(f), {
      added: 0
    });
    assert.equal(f.readProfile(newStudent.profile.id).resume.summary, 'New cohort account edit');
    assert.equal(f.auth.login('hkbk.y2.105', '12345678'), newStudent.profile.id);
  } finally {
    f.db.close();
  }
});
test('Quid cohort reports and individual advice include the expanded roster with exact server-calculated scores', () => {
  const f = fixture();
  try {
    expandHkbkRoster(f);
    const actor = f.readProfile('demo-teacher');
    const context = {
      students: college => f.campus.allStudents(college),
      readCampus: id => f.campus.getCampus(id)
    };
    const overview = staffKnowledge(actor, {
      message: 'Show all students in the college'
    }, context);
    assert.equal(overview.facts.students, 800);
    assert.deepEqual(overview.facts.years.map(y => y.count), [200, 200, 200, 200]);
    assert.equal(overview.report.rows.length, 800);
    assert.equal(overview.report.limited, false);
    const weak = staffKnowledge(actor, {
      message: 'Who are weak in DSA below 40 in second year?'
    }, context);
    assert.ok(weak.report.rows.length > 0);
    assert.ok(weak.report.rows.every(r => r.year === 2 && r.score < 40));
    const added = weak.report.rows.find(r => Number(r.id.split('-').at(-1)) >= 101);
    assert.ok(added);
    const detail = staffKnowledge(actor, {
      message: `How can I help @${added.handle} with DSA?`
    }, context);
    assert.equal(detail.kind, 'student');
    assert.equal(detail.studentId, added.id);
    assert.equal(detail.facts.preparation.skills.DSA, added.score);
    assert.ok(detail.supportPlan.gaps.some(g => g.skill === 'DSA'));
    assert.ok(detail.facts.mentorNotes.length);
    assert.ok(!JSON.stringify(detail).includes('12345678'));
    const missing = staffKnowledge(actor, {
      message: 'How can I help @hkbk.y4.999?',
      studentId: added.id
    }, context);
    assert.equal(missing.kind, 'selection');
    assert.equal(missing.matches.length, 0);
    const role = staffKnowledge(actor, {
      message: 'Show DevOps engineers who are weak in DSA'
    }, context);
    assert.ok(role.report.rows.length);
    for (const row of role.report.rows) assert.equal(f.readProfile(row.id).profile.track, 'DevOps');
    assert.throws(() => staffKnowledge(actor, {
      message: 'Review this student',
      studentId: 'foreign-college-student'
    }, context), /college scope/);
  } finally {
    f.db.close();
  }
});
test('a conflicting additional account aborts the upgrade before writing other profiles or a completion marker', () => {
  const f = fixture();
  try {
    const collision = f.readProfile('hkbk-student-1-1');
    collision.profile.id = 'someone-elses-account';
    collision.profile.handle = 'hkbk.y4.200';
    f.saveProfile(collision);
    assert.throws(() => expandHkbkRoster(f), /conflicting account/);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n, 501);
    assert.equal(f.readProfile('hkbk-student-1-101'), null);
    assert.equal(f.db.prepare('SELECT version FROM dataset_versions WHERE id=?').get('hkbk-additional-cohorts-v1'), undefined);
    assert.equal(f.readProfile(collision.profile.id).profile.name, collision.profile.name);
  } finally {
    f.db.close();
  }
});
