import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import { migrateDatabase, indexProgress } from '../server/database.mjs';
import { createCampusService } from '../server/campus.mjs';
import { createProfile } from '../server/profiles.mjs';
import { createFiles } from '../server/files.mjs';
import { applyAction, dateKey } from '../server/model.mjs';
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE profiles(id TEXT PRIMARY KEY,handle TEXT UNIQUE,document TEXT);');
  migrateDatabase(db);
  const read = id => {
    const r = db.prepare('SELECT document FROM profiles WHERE id=?').get(id);
    return r ? JSON.parse(r.document) : null;
  };
  const save = s => {
    db.prepare('INSERT INTO profiles VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(s.profile.id, s.profile.handle, JSON.stringify(s));
    indexProgress(db, s);
  };
  const teacher = {
    version: 1,
    profile: {
      id: 'teacher',
      name: 'Teacher Example',
      handle: 'teacher',
      role: 'teacher',
      collegeId: 'test',
      college: 'Test College'
    },
    notifications: []
  };
  save(teacher);
  const student = createProfile({
    name: 'Learner Example',
    handle: 'learner'
  });
  student.profile.collegeId = 'test';
  student.profile.college = 'Test College';
  save(student);
  const outsider = {
    version: 1,
    profile: {
      id: 'outside',
      name: 'Outside Teacher',
      handle: 'outside',
      role: 'teacher',
      collegeId: 'other',
      college: 'Other College'
    }
  };
  save(outsider);
  const campus = createCampusService({
    db,
    readProfile: read,
    saveProfile: save
  });
  const dataDir = mkdtempSync(join(tmpdir(), 'studentos-files-')),
    files = createFiles({
      db,
      dataDir,
      readProfile: read,
      readCampus: campus.getCampus
    });
  function close() {
    db.close();
    const target = resolve(dataDir);
    assert.ok(target.startsWith(resolve(tmpdir()) + sep) && basename(target).startsWith('studentos-files-'));
    rmSync(target, {
      recursive: true
    });
  }
  return {
    db,
    read,
    save,
    teacher,
    student,
    outsider,
    campus,
    files,
    close
  };
}
test('teacher-authored quizzes are versioned and published assignments retain their original answer contract', () => {
  const f = fixture();
  try {
    const form = {
      title: 'Transactions and replay',
      topic: 'Databases',
      difficulty: 'Foundation',
      questions: [{
        text: 'Which operation makes duplicate delivery safe?',
        options: ['Idempotent processing', 'Random repeated credits'],
        correct: 0,
        explanation: 'An idempotent handler records the processed event and avoids a duplicate credit.'
      }]
    };
    const bank = f.campus.mutate(f.teacher, 'quiz.save', form).result;
    const work = f.campus.mutate(f.teacher, 'item.save', {
      kind: 'Quiz',
      title: 'Transaction check',
      description: 'Read the scenario and answer the question.',
      quizId: bank.id,
      audience: {
        scope: 'selected',
        ids: [f.student.profile.id]
      },
      publish: true,
      maxPoints: 100
    }).result;
    f.campus.mutate(f.teacher, 'quiz.save', {
      ...form,
      id: bank.id,
      questions: [{
        ...form.questions[0],
        correct: 1
      }]
    });
    const s = f.read(f.student.profile.id);
    assert.equal(s.assignments[0].quiz.version, 1);
    assert.equal(s.assignments[0].quiz.questions[0].correct, 0);
    const {
      session
    } = applyAction(s, 'quiz.start', {
      id: bank.id,
      assignmentId: work.id
    });
    applyAction(s, 'quiz.submit', {
      id: bank.id,
      assignmentId: work.id,
      sessionId: session.id,
      answers: [0]
    });
    assert.equal(s.assignments[0].grade, 100);
    applyAction(s, 'quiz.submit', {
      id: bank.id,
      answers: [1]
    });
    assert.equal(s.assignments[0].grade, 100);
    f.save(s);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM question_banks').get().n, 2);
    const support = {
      profile: {
        ...f.teacher.profile,
        role: 'support'
      }
    };
    assert.equal(f.campus.staffData(support).items[0].quiz, null);
  } finally {
    f.close();
  }
});
test('assignment versions retain prior content and review; final grades cannot be overwritten by a resubmission', () => {
  const f = fixture();
  try {
    const {
      id
    } = f.campus.mutate(f.teacher, 'item.save', {
      kind: 'Assignment',
      title: 'Explain the API',
      description: 'Explain one endpoint and its regression checks.',
      audience: {
        scope: 'selected',
        ids: [f.student.profile.id]
      },
      publish: true,
      maxPoints: 100
    }).result;
    let s = f.read(f.student.profile.id);
    applyAction(s, 'assignment.draft', {
      id,
      text: 'My saved draft describes the request and its validation.',
      url: ''
    });
    assert.ok(s.assignmentDrafts[id]);
    applyAction(s, 'assignment.submit', {
      id,
      text: 'Version one explains the successful endpoint response.',
      url: 'https://example.com/v1',
      requestId: 'first'
    });
    applyAction(s, 'assignment.submit', {
      id,
      text: 'Version one explains the successful endpoint response.',
      url: 'https://example.com/v1',
      requestId: 'first'
    });
    assert.equal(s.assignments[0].versions.length, 1);
    f.save(s);
    f.campus.mutate(f.teacher, 'submission.review', {
      itemId: id,
      studentId: s.profile.id,
      grade: 70,
      feedback: 'Add validation errors and a regression test.',
      requestRevision: true
    });
    s = f.read(s.profile.id);
    applyAction(s, 'assignment.submit', {
      id,
      text: 'Version two adds validation failures and a regression check.',
      url: '',
      requestId: 'second'
    });
    assert.equal(s.assignments[0].versions[0].url, 'https://example.com/v1');
    assert.equal(s.assignments[0].versions[0].review.grade, 70);
    assert.equal(s.assignments[0].submissionUrl, '');
    f.save(s);
    f.campus.mutate(f.teacher, 'submission.review', {
      itemId: id,
      studentId: s.profile.id,
      grade: 92,
      feedback: 'The revised checks are clear and reproducible.'
    });
    s = f.read(s.profile.id);
    assert.throws(() => applyAction(s, 'assignment.submit', {
      id,
      text: 'An attempt to replace an already reviewed version.'
    }), /final grade/);
    assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM submissions').get().n, 2);
  } finally {
    f.close();
  }
});
test('attachments remain private until submitted and reject cross-college access and invalid signatures', () => {
  const f = fixture();
  try {
    const {
      id
    } = f.campus.mutate(f.teacher, 'item.save', {
      kind: 'Assignment',
      title: 'Evidence upload',
      description: 'Submit an explanation and a text evidence file.',
      audience: {
        scope: 'selected',
        ids: [f.student.profile.id]
      },
      publish: true,
      maxPoints: 100
    }).result;
    const file = f.files.upload(f.read(f.student.profile.id), {
      assignmentId: id,
      name: '../../notes.txt',
      base64: Buffer.from('Original evidence for this assignment.').toString('base64')
    });
    assert.equal(file.name, 'notes.txt');
    assert.throws(() => f.files.get(f.teacher, file.id), /not shared/);
    assert.throws(() => f.files.get(f.outsider, file.id), /not shared/);
    const s = f.read(f.student.profile.id),
      fileIds = f.files.validate(s, [file.id], id);
    applyAction(s, 'assignment.submit', {
      id,
      text: 'My submission explains the file and the checks I performed.',
      files: [file],
      fileIds
    });
    f.save(s);
    assert.equal(f.files.get(f.teacher, file.id).file.id, file.id);
    assert.throws(() => f.files.trash(s, file.id), /academic record/);
    assert.throws(() => f.files.upload(s, {
      assignmentId: id,
      name: 'bad.pdf',
      base64: Buffer.from('<script>bad</script>').toString('base64')
    }), /not a PDF/);
  } finally {
    f.close();
  }
});
test('unused uploads can be trashed and recovered, while closed assignments require an extension', () => {
  const f = fixture();
  try {
    const {
      id
    } = f.campus.mutate(f.teacher, 'item.save', {
      kind: 'Assignment',
      title: 'Closed policy',
      description: 'A bounded submission window for an activity.',
      deadline: '2026-01-01',
      latePolicy: 'closed',
      audience: {
        scope: 'selected',
        ids: [f.student.profile.id]
      },
      publish: true,
      maxPoints: 100
    }).result;
    const s = f.read(f.student.profile.id),
      file = f.files.upload(s, {
        assignmentId: id,
        name: 'draft.txt',
        base64: Buffer.from('An unused draft.').toString('base64')
      });
    f.files.trash(s, file.id);
    assert.throws(() => f.files.get(s, file.id), /not found/);
    f.files.trash(s, file.id, true);
    assert.equal(f.files.get(s, file.id).file.id, file.id);
    assert.throws(() => applyAction(s, 'assignment.submit', {
      id,
      text: 'This work was submitted after the closing deadline.'
    }), /closed/);
    f.campus.mutate(f.teacher, 'item.extend', {
      id,
      deadline: dateKey(),
      studentIds: [s.profile.id]
    });
    const updated = f.read(s.profile.id);
    applyAction(updated, 'assignment.submit', {
      id,
      text: 'This submission now follows the reviewed extension date.'
    });
    assert.equal(updated.assignments[0].status, 'submitted');
  } finally {
    f.close();
  }
});
