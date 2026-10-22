import { createProfile } from './profiles.mjs';
import { dateKey, ensureDailyPlan } from './model.mjs';
import { passwordHash } from './auth.mjs';
import { catalog } from '../shared/catalog.js';
import { practiceRoles } from '../shared/practice-roles.js';
import { HKBK_ID, HKBK_NAME } from './hkbk-seed.mjs';
const dataset = 'hkbk-additional-cohorts-v1';
const first = ['Aarav', 'Aditi', 'Aditya', 'Aisha', 'Akash', 'Ananya', 'Arjun', 'Avni', 'Ayush', 'Diya', 'Farhan', 'Fatima', 'Harsh', 'Ishaan', 'Isha', 'Kabir', 'Kavya', 'Kiran', 'Meera', 'Mohammed', 'Nandini', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya', 'Rahul', 'Rhea', 'Rohan', 'Saanvi', 'Sahil', 'Sana', 'Shreya', 'Siddharth', 'Sneha', 'Tanvi', 'Varun', 'Vihaan', 'Yash', 'Zoya'];
const last = ['Rao', 'Sharma', 'Khan', 'Patel', 'Reddy', 'Nair', 'Singh', 'Gupta', 'Shetty', 'Joshi', 'Ahmed', 'Verma', 'Menon', 'Das', 'Kulkarni', 'Shah', 'Iyer', 'Gowda', 'Sethi', 'Thomas'];
const departments = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical Engineering', 'Artificial Intelligence'];
const at = offset => dateKey(new Date(Date.now() + offset * 86400000));
const timeAt = offset => new Date(Date.now() + offset * 86400000).toISOString();
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const topics = [['DSA', 'Two pointers and boundary cases', 'dsa', 'I traced the empty input, repeated values and a single-item array before choosing the loop condition. The trace made an off-by-one error visible.'], ['Databases', 'SQL joins and missing records', 'sql', 'I compared INNER JOIN and LEFT JOIN with an unmatched customer. The missing row changed the report, so I added a test for customers with no orders.'], ['Backend', 'Payment retries without duplicate orders', 'python', 'A retry should return the original result when the idempotency key is unchanged. I added a duplicate-request test and checked the response after a timeout.'], ['Frontend', 'Accessible form validation', 'react', 'The error is now connected to its input and the first invalid field receives focus. I checked the form with a keyboard and a narrow viewport.'], ['DevOps', 'Release health checks and rollback', 'devops', 'I checked readiness separately from liveness and wrote down the rollback trigger. A release is easier to review when recovery is part of the plan.'], ['Communication', 'Explaining a project decision', 'system-design', 'I practised a two-minute walkthrough: user problem, my contribution, a tradeoff and test evidence. The next review will focus on the decision I would change.']];
export function expandHkbkRoster({
  db,
  auth,
  community,
  readProfile,
  saveProfile
}) {
  db.exec('CREATE TABLE IF NOT EXISTS dataset_versions(id TEXT PRIMARY KEY,version INTEGER)');
  if (db.prepare('SELECT version FROM dataset_versions WHERE id=?').get(dataset)) return {
    added: 0
  };
  const campusRow = db.prepare('SELECT document FROM campuses WHERE id=?').get(HKBK_ID);
  const existing = db.prepare("SELECT id FROM profiles WHERE json_extract(document,'$.profile.collegeId')=? AND json_extract(document,'$.profile.sampleData')=1").all(HKBK_ID);
  if (!campusRow || existing.length < 500) return {
    added: 0
  };
  const existingStudents = existing.map(r => readProfile(r.id)).filter(s => s.profile.role === 'student');
  if ([1, 2, 3, 4].some(year => existingStudents.filter(s => s.profile.year === year).length < 100)) return {
    added: 0
  };
  // Fail closed on a conflicting identity; a dataset upgrade must never replace a user's work.
  for (let year = 1; year <= 4; year++) for (let n = 101; n <= 200; n++) {
    if (db.prepare('SELECT id FROM profiles WHERE id=? OR handle=?').get(`hkbk-student-${year}-${n}`, `hkbk.y${year}.${n}`)) throw new Error('The additional campus cohort contains a conflicting account.');
  }
  const campus = JSON.parse(campusRow.document),
    c = community.read(HKBK_ID);
  const staff = existing.map(r => readProfile(r.id)).filter(s => s.profile.role === 'teacher');
  if (!staff.length) return {
    added: 0
  };
  const hash = passwordHash('12345678');
  const additions = [];
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let year = 1; year <= 4; year++) for (let n = 101; n <= 200; n++) {
      const index = 400 + (year - 1) * 100 + n - 101;
      const name = first[index % 40] + ' ' + last[(Math.floor(index / 40) + index * 7) % 20];
      const handle = `hkbk.y${year}.${n}`,
        id = `hkbk-student-${year}-${n}`;
      const role = practiceRoles[(n + year * 3) % practiceRoles.length];
      const tier = (n * 7 + year) % 10;
      const base = [14, 23, 34, 43, 52, 61, 70, 79, 87, 94][tier];
      const age = [55, 410, 760, 1115][year - 1] + n % 40;
      const s = createProfile({
        name,
        handle,
        college: HKBK_NAME
      });
      s.profile = {
        ...s.profile,
        id,
        name,
        handle,
        collegeId: HKBK_ID,
        college: HKBK_NAME,
        role: 'student',
        isDemo: true,
        sampleData: true,
        syntheticRoster: true,
        onboardingDone: true,
        year,
        track: role.track,
        practiceRole: role.id,
        department: departments[n % departments.length],
        section: ['A', 'B', 'C', 'D'][n % 4],
        studentId: `HKBK-${2027 - year}-${['CS', 'IT', 'EC', 'ME', 'AI'][n % 5]}-${n}`,
        cgpa: Number((5.1 + base / 22).toFixed(2)),
        graduationYear: 2031 - year,
        backlogs: tier < 2 ? 1 + n % 3 : 0,
        academicRecordSource: 'fictional sample campus',
        joinedAt: at(-age),
        dailyMinutes: [45, 60, 75, 90][year - 1],
        weeklyDays: 5,
        bio: `${role.name} preparation · Year ${year}. ${tier < 3 ? 'Working on foundations with my study circle.' : tier > 7 ? 'Building projects and reviewing with peers.' : 'Learning through practical work and regular review.'}`,
        targetCompanies: role.companies.slice(n % 2, n % 2 + 3).map(id => catalog.companies.find(c => c.id === id)?.name).filter(Boolean)
      };
      s.skills = Object.fromEntries(Object.keys(s.skills).map((skill, j) => [skill, clamp(base + (role.skills.includes(skill) ? 7 : -10) + (n * 11 + j * 17) % 27 - 13, 5, 98)]));
      // Cross-skilled students and distinct gaps make cohort queries useful, not a single overall ranking.
      if (n % 5 === 0) s.skills.DSA = 24 + n % 18;
      if (n % 7 === 0) s.skills.Databases = 82 + n % 15;
      s.journey = {
        day: age,
        totalDays: 1460,
        fullDegree: true,
        xp: Math.round(age * base * 1.35),
        restDays: [],
        startedAt: at(-age + 1),
        advancedDates: []
      };
      s.activity = Array.from({
        length: age
      }, (_, i) => ({
        date: at(-age + i + 1),
        count: tier < 2 ? i % 11 === 0 ? 1 : 0 : (i + n) % (tier > 6 ? 9 : 4) === 0 ? 0 : 1 + (i * 3 + n) % 7
      }));
      if (n % 13 === 0) s.activity.slice(-10).forEach(a => a.count = 0);
      s.practiceCompleted = catalog.problems.filter(p => p.external).slice(0, Math.round(age * base / 185)).map(p => p.id);
      s.solved = [];
      s.historicalSolved = 0;
      s.courseProgress = Object.fromEntries(catalog.courses.map(course => [course.id, Math.min(course.lessons, Math.floor(course.lessons * clamp((base + (role.courses.includes(course.id) ? 12 : -18)) / 100, 0, 1)))]));
      s.courseBaseProgress = {
        ...s.courseProgress
      };
      s.lessonCompletions = {};
      s.skillHistory = Array.from({
        length: Math.ceil(age / 28)
      }, (_, i, values) => ({
        date: at(-age + 1 + i * 28),
        skills: Object.fromEntries(Object.entries(s.skills).map(([skill, score]) => [skill, Math.round(score * (.2 + .8 * (i + 1) / Math.ceil(age / 28)))]))
      }));
      s.skillHistory.push({
        date: at(0),
        skills: {
          ...s.skills
        }
      });
      s.demoHistoryVersion = 1;
      const projectCount = Math.min(catalog.projects.length, Math.floor((year - 1) * base / 65));
      s.resumeProjects = catalog.projects.slice(0, projectCount).map(p => p.id);
      s.projectProgress = Object.fromEntries(catalog.projects.map(p => [p.id, p.steps.slice(0, s.resumeProjects.includes(p.id) ? p.steps.length : Math.floor(p.steps.length * base / 170)).map((_, i) => i)]));
      s.quizAttempts = Array.from({
        length: 6 + year * 6 + n % 12
      }, (_, i) => ({
        id: `${id}-quiz-${i}`,
        quizId: catalog.quizzes[(i + n) % catalog.quizzes.length].id,
        date: at(-Math.min(age, 120) + i * 2),
        score: clamp(base + i * 13 % 23 - 9, 10, 100)
      }));
      s.resume = {
        ...s.resume,
        headline: `Year ${year} · ${role.name}`,
        summary: `Developing ${role.skills.join(', ')} through guided coursework and ${projectCount} project walkthroughs.`,
        email: handle + '@example.test',
        education: `B.E. · ${s.profile.department} · ${HKBK_NAME} · ${2027 - year}–${2031 - year}`,
        location: 'Bengaluru, India'
      };
      const jobs = catalog.jobs.filter(j => j.years.includes(year));
      s.applications = year === 1 ? [] : jobs.slice(n % 4, n % 4 + year + n % 3).map((job, i) => ({
        id: `${id}-app-${i}`,
        jobId: job.id,
        company: job.company,
        title: job.title,
        status: base > 80 ? ['Interview', 'Selected', 'Shortlisted', 'Applied'][i % 4] : base > 50 ? ['Applied', 'Shortlisted', 'Not selected'][i % 3] : ['Applied', 'Not selected'][i % 2],
        date: at(-40 + i * 3),
        sample: true
      }));
      s.savedJobs = jobs.slice(0, 3).map(j => j.id);
      s.staffMessages = [];
      s.campusUpdates = [];
      s.campusDrives = [];
      if (year >= 3) for (const [i, drive] of campus.drives.entries()) {
        if (!drive.sample || drive.date < s.profile.joinedAt || (n + i) % 6 !== 0) continue;
        const completed = drive.status === 'Completed';
        const status = completed ? year === 4 && base > 85 ? 'Offered' : base > 60 ? 'Interview' : 'Not selected' : ['Invited', 'Applied', 'Assessment', 'Interview'][n % 4];
        drive.applications.push({
          studentId: id,
          name,
          status,
          updatedAt: timeAt(-1),
          sample: true
        });
        s.campusDrives.push({
          ...drive,
          applications: undefined,
          status
        });
        if (status !== 'Invited') s.applications.push({
          id: `${drive.id}-${id}`,
          driveId: drive.id,
          jobId: drive.jobId,
          company: drive.company,
          title: drive.title,
          status: {
            Applied: 'Applied',
            Assessment: 'Shortlisted',
            Interview: 'Interview',
            Offered: 'Selected',
            'Not selected': 'Not selected'
          }[status],
          date: completed ? drive.date : at(-1),
          sample: true
        });
      }
      s.assignments = [];
      for (const item of campus.items.filter(i => i.sample && ['Assignment', 'Quiz', 'Project'].includes(i.kind) && i.audience?.scope === 'filter' && Number(i.audience.filters?.year) === year)) {
        item.targetIds.push(id);
        const pending = item.status === 'published' && (tier < 3 || n % 5 === 0);
        const submitted = !pending && item.status === 'published' && n % 4 === 0;
        s.assignments.push({
          ...item,
          targetIds: undefined,
          audience: undefined,
          sourceId: item.id,
          teacher: item.author,
          status: pending ? 'pending' : submitted ? 'submitted' : 'graded',
          grade: pending || submitted ? null : clamp(base + n % 11 - 5, 10, 100),
          submission: pending ? '' : 'I documented my assumptions, checked a normal input and a boundary case, and explained the result.',
          submittedAt: pending ? null : item.createdAt,
          submissionCount: pending ? 0 : 1,
          feedback: pending || submitted ? '' : tier < 4 ? 'Trace a smaller example, then test the boundary condition again.' : 'Clear reasoning. Add one failure case and explain the tradeoff.',
          reviewedBy: item.author
        });
      }
      const mentor = staff[n % staff.length].profile;
      const gap = Object.entries(s.skills).sort((a, b) => a[1] - b[1])[0];
      const note = {
        id: `cohort-v1-note-${id}`,
        studentId: id,
        text: `Review ${gap[0]} (${gap[1]}/100 preparation history). Agree on one worked example, one independent check and a follow-up next week.`,
        author: mentor.name,
        createdAt: timeAt(-3),
        followUp: at(4 + n % 5),
        resolved: false
      };
      campus.notes.push(note);
      s.staffMessages.push({
        id: `cohort-v1-guidance-${id}`,
        sourceId: note.id,
        kind: 'Feedback',
        sender: mentor.name,
        title: 'Your next preparation review',
        text: note.text,
        createdAt: note.createdAt,
        followUp: note.followUp,
        read: n % 3 !== 0,
        replies: []
      });
      s.posts = [];
      s.messages = [];
      s.following = [];
      s.likes = [];
      s.comments = {};
      s.registrations = [];
      s.notifications = [{
        id: `cohort-v1-welcome-${id}`,
        title: 'Your college workspace is connected',
        text: 'Your preparation plan, coursework and mentor guidance are ready.',
        route: '/overview',
        read: n % 3 === 0
      }];
      s.tasks = [];
      ensureDailyPlan(s);
      saveProfile(s);
      auth.setPassword(id, null, hash);
      additions.push(s);
      const topic = topics[n % topics.length];
      c.posts.push({
        id: `cohort-v1-post-${id}`,
        author: id,
        tag: ['Learning', 'Project', 'Question', 'Milestone'][n % 4],
        text: `${topic[1]}\n\n${topic[3]}\n\nNext checkpoint: ${role.name.toLowerCase()} practice — ${n % 2 ? 'compare two approaches and explain the tradeoff.' : 'bring the smallest reproducible example to our review.'}`,
        time: timeAt(-1 - (n * 13 + year) % 110),
        resource: {
          type: 'course',
          id: topic[2]
        },
        likes: [mentor.id],
        comments: n % 3 === 0 ? [{
          id: `cohort-v1-reply-${id}`,
          author: mentor.id,
          text: 'Keep the test input with your notes. We can use the same example to check the next revision.',
          time: timeAt(-.5 - (n * 13 + year) % 110)
        }] : [],
        sample: true
      });
      const peer = existingStudents[(n * 7 + year) % existingStudents.length].profile.id;
      c.follows.push({
        from: id,
        to: peer
      }, {
        from: id,
        to: mentor.id
      });
    }
    // Extend existing event membership without publishing individual teacher work to new recipients.
    for (const event of c.events.filter(e => e.sample && e.date >= at(-90))) {
      const attendees = additions.filter(s => s.profile.joinedAt <= event.date && (s.profile.year < 4 || Number(s.profile.id.split('-').at(-1)) % 3 === 0) && Number(s.profile.id.split('-').at(-1)) % 7 === event.id.length % 7);
      event.attendees.push(...attendees.map(s => s.profile.id));
      for (const s of attendees) {
        s.registrations.push(event.id);
        saveProfile(s);
      }
    }
    c.posts.sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
    c.version++;
    community.save(c);
    campus.version++;
    campus.audit.push({
      id: dataset,
      action: 'dataset.expand',
      actor: 'StudentOS campus data',
      title: 'Added four additional student cohorts',
      recipients: additions.length,
      time: timeAt(0),
      sample: true
    });
    db.prepare('UPDATE campuses SET document=? WHERE id=?').run(JSON.stringify(campus), HKBK_ID);
    db.prepare('INSERT INTO dataset_versions VALUES(?,1)').run(dataset);
    db.exec('COMMIT');
    return {
      added: additions.length
    };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
