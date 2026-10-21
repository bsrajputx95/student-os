import { createProfile } from './profiles.mjs';
import { dateKey, ensureDailyPlan } from './model.mjs';
import { catalog } from '../shared/catalog.js';
import { passwordHash } from './auth.mjs';
export const HKBK_ID = 'hkbk-college-of-engineering';
export const HKBK_NAME = 'HKBK College of Engineering';
const first = ['Aarav', 'Aditi', 'Aditya', 'Aisha', 'Akash', 'Ananya', 'Arjun', 'Avni', 'Ayush', 'Diya', 'Farhan', 'Fatima', 'Harsh', 'Ishaan', 'Isha', 'Kabir', 'Kavya', 'Kiran', 'Meera', 'Mohammed', 'Nandini', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya', 'Rahul', 'Rhea', 'Rohan', 'Saanvi', 'Sahil', 'Sana', 'Shreya', 'Siddharth', 'Sneha', 'Tanvi', 'Varun', 'Vihaan', 'Yash', 'Zoya'];
const last = ['Rao', 'Sharma', 'Khan', 'Patel', 'Reddy', 'Nair', 'Singh', 'Gupta', 'Shetty', 'Joshi', 'Ahmed', 'Verma', 'Menon', 'Das', 'Kulkarni', 'Shah', 'Iyer', 'Gowda', 'Sethi', 'Thomas'];
const departments = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical Engineering', 'Artificial Intelligence'];
const topics = ['Arrays & hashing', 'Two pointers', 'Stacks & queues', 'Binary search', 'Trees & graphs', 'Dynamic programming', 'React components', 'API design', 'SQL joins', 'Database indexing', 'Git & CI/CD', 'Containers', 'Statistics', 'Data visualisation', 'Testing & debugging', 'System design'];
const eventNames = ['Build for campus', 'Open-source Saturday', 'Data stories lab', 'Algorithm arena', 'Project showcase', 'Career conversations', 'Design to deployment', 'Women in engineering circle', 'Research reading group', 'Resume clinic', 'Cloud lab', 'First-year makers'];
const shift = n => dateKey(new Date(Date.now() + n * 86400000));
const stamp = d => new Date(Math.min(Date.parse(d + 'T10:00:00.000Z'), Date.now() - 1000)).toISOString();
const nameAt = n => first[n % first.length] + ' ' + last[(Math.floor(n / first.length) + n * 7) % last.length];
const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));
export function seedHkbk({
  db,
  auth,
  community,
  readProfile,
  saveProfile
}) {
  db.exec('CREATE TABLE IF NOT EXISTS dataset_versions(id TEXT PRIMARY KEY,version INTEGER)');
  function connectAnnouncements() {
    const row = db.prepare('SELECT document FROM campuses WHERE id=?').get(HKBK_ID);
    if (!row) return;
    const c = community.read(HKBK_ID);
    let changed = false;
    for (const item of JSON.parse(row.document).items.filter(i => i.kind === 'Announcement')) {
      if (c.posts.some(p => p.sourceId === item.id)) continue;
      c.posts.push({
        id: 'college-post-' + item.id,
        sourceId: item.id,
        author: item.authorId,
        text: item.title + '\n\n' + item.description,
        tag: 'Announcement',
        time: item.publishedAt,
        likes: [],
        comments: [],
        targetIds: item.targetIds,
        sample: true
      });
      changed = true;
    }
    if (changed) {
      c.version++;
      community.save(c);
    }
  }
  if (db.prepare('SELECT version FROM dataset_versions WHERE id=?').get(HKBK_ID)?.version >= 3) {
    if (db.prepare('SELECT version FROM dataset_versions WHERE id=?').get(HKBK_ID).version < 4) {
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const row of db.prepare("SELECT id FROM profiles WHERE json_extract(document,'$.profile.collegeId')=? AND json_extract(document,'$.profile.role')='student' AND json_extract(document,'$.profile.sampleData')=1").all(HKBK_ID)) {
          const s = readProfile(row.id);
          s.profile.graduationYear ??= 2031 - s.profile.year;
          s.profile.backlogs ??= s.profile.cgpa < 6.5 ? 2 : 0;
          s.profile.academicRecordSource ||= 'fictional sample campus';
          saveProfile(s);
        }
        db.prepare('UPDATE dataset_versions SET version=4 WHERE id=?').run(HKBK_ID);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
    connectAnnouncements();
    return;
  }
  const sampleHash = passwordHash('12345678');
  const students = [],
    staff = [];
  const external = catalog.problems.filter(p => p.external);
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let year = 1; year <= 4; year++) for (let n = 0; n < 100; n++) {
      const featured = year === 4 && n === 0,
        index = (year - 1) * 100 + n,
        name = featured ? 'Bhavani Singh' : nameAt(index),
        handle = featured ? 'bhavanisingh' : `hkbk.y${year}.${String(n + 1).padStart(3, '0')}`;
      const s = createProfile({
        name,
        handle: featured ? 'hkbk.featured' : handle,
        college: HKBK_NAME
      });
      const tier = n % 10,
        base = featured ? 98 : tier < 2 ? 18 + year * 3 + n % 9 : tier < 5 ? 38 + year * 5 + n % 11 : tier < 8 ? 58 + year * 4 + n % 9 : 75 + year * 4 + n % 6;
      const age = featured ? 1438 : [78, 443, 808, 1378][year - 1] + n % 35;
      const id = featured ? 'demo-bhavanisingh' : `hkbk-student-${year}-${n + 1}`;
      s.profile = {
        ...s.profile,
        id,
        handle,
        name,
        college: HKBK_NAME,
        collegeId: HKBK_ID,
        role: 'student',
        isDemo: true,
        syntheticRoster: true,
        sampleData: true,
        onboardingDone: true,
        year,
        track: featured ? 'Full-stack development' : catalog.tracks[n % catalog.tracks.length],
        department: featured ? 'Computer Science' : departments[n % 5],
        section: ['A', 'B', 'C'][n % 3],
        studentId: `HKBK-${2027 - year}-${['CS', 'IT', 'EC', 'ME', 'AI'][n % 5]}-${String(n + 1).padStart(3, '0')}`,
        cgpa: featured ? 9.82 : Number(clamp(5 + base / 22 + n % 3 / 10, 5, 9.9).toFixed(2)),
        graduationYear: 2031 - year,
        backlogs: featured || base >= 33 ? 0 : 2,
        academicRecordSource: 'fictional sample campus',
        bio: featured ? 'Final-year builder and peer mentor. Four years of consistent practice, useful projects, and learning in public.' : `${catalog.tracks[n % 5]} · Year ${year}. ${tier < 2 ? 'Rebuilding my foundations one session at a time.' : tier > 7 ? 'Building, sharing, and helping my peers.' : 'Practising consistently and learning by building.'}`,
        targetCompanies: catalog.companies.slice(n % 10, n % 10 + 3).map(c => c.name),
        joinedAt: shift(-age)
      };
      s.skills = Object.fromEntries(Object.keys(s.skills).map((k, j) => [k, featured ? [99, 99, 98, 98, 96, 99][j] : clamp(base + (n * 3 + j * 7) % 19 - 9, 8, 97)]));
      s.journey = {
        day: Math.min(1460, age),
        totalDays: 1460,
        fullDegree: true,
        xp: featured ? 248960 : Math.round(age * base * 1.6),
        restDays: [],
        startedAt: shift(-age + 1),
        advancedDates: []
      };
      s.activity = Array.from({
        length: age
      }, (_, i) => ({
        date: shift(-age + 1 + i),
        count: featured ? i < age - 218 && i % 9 === 0 ? 0 : 2 + i * 7 % 13 : tier < 2 ? i % 9 === 0 ? 1 + i % 3 : 0 : (i + n) % (tier > 7 ? 11 : 4) === 0 ? 0 : 1 + (i + n) % 8
      }));
      s.historicalSolved = 0;
      s.practiceCompleted = external.slice(0, featured ? 1468 : Math.min(1250, Math.round(age * base / 160))).map(p => p.id);
      s.solved = featured ? catalog.problems.filter(p => !p.external).map(p => p.id) : [];
      s.courseProgress = Object.fromEntries(catalog.courses.map((c, i) => [c.id, featured ? i === 5 ? 11 : c.lessons : Math.floor(c.lessons * clamp(base / 100 * (.5 + year * .12) + (n + i) % 7 / 20, 0, .98))]));
      s.courseBaseProgress = {
        ...s.courseProgress
      };
      s.lessonCompletions = {};
      const projectCount = featured ? catalog.projects.length : Math.min(catalog.projects.length, Math.floor((year - 1) * base / 65));
      s.resumeProjects = catalog.projects.slice(0, projectCount).map(p => p.id);
      s.projectProgress = Object.fromEntries(catalog.projects.map(p => [p.id, p.steps.slice(0, s.resumeProjects.includes(p.id) ? p.steps.length : Math.floor(p.steps.length * base / 170)).map((_, i) => i)]));
      s.quizAttempts = Array.from({
        length: featured ? 160 : 8 + year * 7 + n % 14
      }, (_, i) => ({
        id: `${id}-quiz-${i}`,
        quizId: catalog.quizzes[i % catalog.quizzes.length].id,
        date: shift(-Math.floor((featured ? age : age * .85) * (1 - i / (featured ? 160 : 8 + year * 7 + n % 14)))),
        score: featured ? 94 + i % 7 : clamp(base + i * 7 % 25 - 10, 10, 100)
      }));
      s.skillHistory = Array.from({
        length: Math.ceil(age / 28)
      }, (_, i) => ({
        date: shift(-age + 1 + i * 28),
        skills: Object.fromEntries(Object.entries(s.skills).map(([k, v]) => [k, Math.round(clamp(v * (.12 + .88 * (i + 1) / Math.ceil(age / 28))))]))
      }));
      s.skillHistory.push({
        date: shift(0),
        skills: {
          ...s.skills
        }
      });
      s.demoHistoryVersion = 1;
      s.resume = {
        headline: featured ? 'Final-year software engineer · Full-stack, algorithms & cloud' : `Year ${year} · ${s.profile.track}`,
        email: handle + '@example.test',
        location: 'Bengaluru, India',
        github: '',
        summary: featured ? 'Built and documented four complete projects, practised 1,474 coding problems, and mentored peer study groups. Strong in full-stack engineering, algorithms, databases, and explaining technical tradeoffs. Sample portfolio for exploring StudentOS.' : `Sample student portfolio focused on ${s.profile.track.toLowerCase()}. ${projectCount} completed projects with ongoing learning and practice.`,
        education: `B.E. · ${s.profile.department} · ${HKBK_NAME} · ${2027 - year}–${2031 - year} · Sample academic record`
      };
      s.applications = year < 2 ? [] : catalog.jobs.slice(n % 9, n % 9 + (featured ? 12 : year === 4 ? 5 + n % 5 : year === 3 ? 2 + n % 4 : 1)).map((j, i) => ({
        id: `${id}-app-${i}`,
        jobId: j.id,
        company: j.company,
        title: j.title,
        status: featured ? ['Selected', 'Interview', 'Shortlisted', 'Selected', 'Applied'][i % 5] : base > 80 ? ['Interview', 'Selected', 'Shortlisted', 'Applied'][i % 4] : base > 55 ? ['Applied', 'Shortlisted', 'Not selected'][i % 3] : ['Applied', 'Not selected'][i % 2],
        date: shift(-120 + i * 9),
        sample: true
      }));
      s.savedJobs = catalog.jobs.slice(n % 10, n % 10 + 5).map(j => j.id);
      s.recommendedJobs = catalog.jobs.slice(n % 7, n % 7 + 3).map((j, i) => ({
        id: `rec-${id}-${i}`,
        jobId: j.id,
        sender: 'Arjun Mehta · Placement team',
        message: 'Preparation suggestion based on your learning path. Check eligibility on the original source.',
        createdAt: stamp(shift(-10 + i))
      }));
      s.assignments = [];
      s.staffMessages = [];
      s.campusUpdates = [];
      s.campusDrives = [];
      s.posts = [];
      s.messages = [];
      s.following = [];
      s.likes = [];
      s.comments = {};
      s.registrations = [];
      s.tasks = [];
      s.notifications = [{
        id: 'hkbk-welcome',
        title: 'Your HKBK campus is connected',
        text: 'Students, faculty, placements, and four years of sample activity.',
        route: '/community',
        read: false
      }, {
        id: 'hkbk-plan',
        title: featured ? 'The last stretch of your four-year journey' : 'Your next preparation step is ready',
        text: featured ? 'Day 1,438 of 1,460. Revisit interview stories, system design, and your portfolio.' : 'Keep practice, projects, and rest in balance.',
        route: '/journey',
        read: false
      }];
      ensureDailyPlan(s);
      students.push(s);
      saveProfile(s);
      auth.setPassword(id, null, sampleHash);
    }
    for (let n = 0; n < 100; n++) {
      const placement = n >= 80 && n < 90,
        other = n >= 90,
        id = n === 0 ? 'demo-teacher' : n === 80 ? 'demo-placement' : `hkbk-staff-${n + 1}`,
        name = n === 0 ? 'Dr. Neha Iyer' : n === 80 ? 'Arjun Mehta' : (other ? '' : n % 3 === 0 ? 'Dr. ' : 'Prof. ') + nameAt(n + 413),
        handle = n === 0 ? 'neha.faculty' : n === 80 ? 'arjun.placements' : `hkbk.${placement ? 'placement' : other ? 'staff' : 'faculty'}.${String(n + 1).padStart(3, '0')}`;
      const p = {
        id,
        handle,
        name,
        college: HKBK_NAME,
        collegeId: HKBK_ID,
        role: placement ? 'placement' : n === 90 ? 'admin' : other ? 'support' : 'teacher',
        staffPermissionsVersion: 1,
        isDemo: true,
        sampleData: true,
        onboardingDone: true,
        department: placement ? 'Training & Placement' : other ? 'Academic Services' : departments[n % 5],
        designation: placement ? n === 80 ? 'Head of Training & Placement' : 'Placement officer' : other ? ['Academic coordinator', 'Student success mentor', 'Research coordinator', 'Library learning mentor', 'Industry liaison'][n % 5] : n % 10 === 0 ? 'Head of department' : n % 3 === 0 ? 'Associate professor' : 'Assistant professor',
        bio: placement ? 'Helping students connect preparation with career opportunities.' : other ? 'Supporting student learning, projects, and college activities.' : 'Teaching, mentoring, and learning alongside the campus community.',
        staffId: `HKBK-STAFF-${String(n + 1).padStart(3, '0')}`
      };
      const s = {
        version: 1,
        profile: p,
        notifications: []
      };
      staff.push(s);
      saveProfile(s);
      auth.setPassword(id, null, sampleHash);
    }
    const campus = {
      id: HKBK_ID,
      version: 1,
      rosterSeeded: true,
      sampleData: true,
      items: [],
      cohorts: [...Array.from({
        length: 4
      }, (_, i) => ({
        id: 'hkbk-y' + (i + 1),
        name: `Year ${i + 1} · ${i === 3 ? 'Placement batch' : 'Learning cohort'}`,
        filters: {
          year: String(i + 1)
        }
      })), {
        id: 'hkbk-strong',
        name: 'Placement preparation · 85%+',
        filters: {
          readiness: '85'
        }
      }, {
        id: 'hkbk-help',
        name: 'Mentor check-ins',
        filters: {
          support: true
        }
      }],
      notes: [],
      drives: [],
      audit: []
    };
    // Historical records are attached to enrolled students, with recent work kept actionable.
    for (let i = 0; i < 128; i++) {
      const year = i % 4 + 1,
        kind = ['Assignment', 'Quiz', 'Project', 'Assignment'][Math.floor(i / 4) % 4],
        recent = i >= 112,
        ago = recent ? 12 - i % 8 : Math.min(1320, (127 - i) * 11),
        created = shift(-ago),
        due = shift(-ago + 7),
        author = staff[i * 3 % 80].profile,
        topic = kind === 'Quiz' ? catalog.quizzes[i % catalog.quizzes.length].title : topics[i % topics.length],
        targets = students.filter(s => s.profile.year === year && s.profile.joinedAt <= created && (Number(s.profile.id.split('-').at(-1)) % 3 === i % 3 || s.profile.handle === 'bhavanisingh'));
      if (!targets.length) continue;
      const item = {
        id: `hkbk-work-${i}`,
        kind,
        title: `${topic} · ${kind === 'Quiz' ? 'knowledge check' : kind === 'Project' ? 'build lab' : 'practice & explanation'}`,
        description: `${kind === 'Project' ? 'Build a working small project demonstrating' : 'Practise and explain'} ${topic.toLowerCase()}. Include your approach, one test case, an edge case, and a short reflection on what you learned. ${kind === 'Quiz' ? 'Complete the assigned question-bank quiz.' : 'Submit your explanation and an optional repository link.'}`,
        subject: topic,
        maxPoints: 100,
        rubric: 'Correctness 40% · Implementation 30% · Explanation 20% · Presentation 10%',
        quizId: kind === 'Quiz' ? catalog.quizzes[i % catalog.quizzes.length].id : null,
        projectId: kind === 'Project' ? catalog.projects[i % catalog.projects.length].id : null,
        sourceUrl: '',
        deadline: due,
        author: author.name,
        authorId: author.id,
        createdAt: stamp(created),
        publishedAt: stamp(created),
        status: recent ? 'published' : 'archived',
        audience: {
          scope: 'filter',
          filters: {
            year: String(year)
          }
        },
        targetIds: targets.map(s => s.profile.id),
        sample: true
      };
      campus.items.push(item);
      for (const s of targets) {
        const base = Math.round(Object.values(s.skills).reduce((a, b) => a + b, 0) / 6),
          featured = s.profile.handle === 'bhavanisingh',
          pending = recent && !featured && (base < 40 || i % 4 === 0),
          review = recent && !featured && !pending && i % 3 === 0;
        s.assignments.push({
          ...item,
          teacher: author.name,
          sourceId: item.id,
          status: pending ? 'pending' : review ? 'submitted' : 'graded',
          grade: pending || review ? null : clamp(base + i % 9 - 4, 12, 100),
          submission: pending ? '' : `I completed ${topic.toLowerCase()}, checked the main behaviour and an edge case, and documented my approach. My next step is to improve test coverage and explain the tradeoffs more clearly.`,
          submittedAt: pending ? null : stamp(shift(-ago + 4)),
          submissionCount: pending ? 0 : 1,
          feedback: pending || review ? '' : base > 75 ? 'Clear approach and explanation. Extend the tests with one less obvious edge case.' : 'Revisit the core concept, trace a small example, and add a test before improving the implementation.',
          reviewedBy: author.name
        });
      }
      campus.audit.push({
        id: 'audit-' + i,
        action: recent ? 'item.save' : 'submission.review',
        actor: author.name,
        title: item.title,
        recipients: targets.length,
        time: item.createdAt
      });
    }
    for (const [i, s] of students.entries()) {
      const weak = Object.values(s.skills).reduce((a, b) => a + b, 0) / 6 < 45,
        mentor = staff[i % 80].profile;
      const message = {
        id: `hkbk-guidance-${i}`,
        sourceId: `hkbk-guidance-${i}`,
        kind: 'Feedback',
        sender: mentor.name,
        title: weak ? 'A small foundation reset for this week' : 'Turn your progress into clear interview evidence',
        text: weak ? 'Let us focus on two manageable goals: trace one array problem by hand and complete one short SQL exercise. Bring your questions to the mentor hour. Consistency matters more than speed.' : 'Choose one completed project. Explain the user problem, your contribution, one technical decision, and how you tested it. Practise the story aloud, then ask a peer for feedback.',
        read: i % 3 !== 0,
        replies: i % 4 === 0 ? [{
          id: 'reply-' + i,
          text: 'I have prepared my notes and will bring a short walkthrough to the next mentor session.',
          time: stamp(shift(-2))
        }] : [],
        createdAt: stamp(shift(-5)),
        followUp: shift(5)
      };
      s.staffMessages.push(message);
      campus.notes.push({
        id: 'note-' + i,
        studentId: s.profile.id,
        text: weak ? 'Offer a short mentor check-in and help prioritise foundational practice.' : 'Review the project explanation and the next role preparation milestone.',
        followUp: shift(i % 12),
        author: mentor.name,
        createdAt: stamp(shift(-7)),
        resolved: i % 3 === 0
      });
    }
    for (let i = 0; i < 24; i++) {
      const job = catalog.jobs[i % catalog.jobs.length],
        past = i < 20,
        date = shift(past ? -30 - i * 44 : 7 + (i - 20) * 8),
        targets = students.filter(s => s.profile.year >= (i % 3 === 0 ? 3 : 4)).filter((_, n) => n % 3 === i % 3),
        drive = {
          id: 'hkbk-drive-' + i,
          company: job.company,
          title: (past ? 'Archived preparation round' : 'Upcoming preparation round') + ' · ' + job.title,
          description: 'Sample campus preparation and application-tracking record. This does not represent a confirmed HKBK employer partnership or a real hiring event. Use the original employer listing to confirm availability and eligibility.',
          date,
          deadline: dateKey(new Date(new Date(date + 'T12:00:00Z').getTime() - 3 * 86400000)),
          sourceUrl: job.sourceUrl,
          jobId: job.id,
          status: past ? 'Completed' : 'Open',
          author: 'Arjun Mehta',
          createdAt: stamp(shift(past ? -45 - i * 44 : -2)),
          sample: true,
          applications: targets.map((s, n) => ({
            studentId: s.profile.id,
            name: s.profile.name,
            status: past ? s.skills.DSA > 80 ? ['Offered', 'Interview'][n % 2] : s.skills.DSA > 50 ? 'Assessment' : 'Not selected' : ['Invited', 'Applied', 'Assessment', 'Interview'][n % 4],
            updatedAt: stamp(shift(-1))
          }))
        };
      campus.drives.push(drive);
      for (const a of drive.applications) {
        const s = students.find(s => s.profile.id === a.studentId);
        s.campusDrives.push({
          ...drive,
          applications: undefined,
          status: a.status
        });
        if (a.status !== 'Invited') s.applications.push({
          id: `${drive.id}-${s.profile.id}`,
          driveId: drive.id,
          company: job.company,
          title: drive.title,
          status: {
            Applied: 'Applied',
            Assessment: 'Shortlisted',
            Interview: 'Interview',
            Offered: 'Selected',
            'Not selected': 'Not selected'
          }[a.status],
          date,
          sample: true
        });
      }
    }
    const c = {
      id: HKBK_ID,
      version: 1,
      sampleData: true,
      posts: [],
      follows: [],
      messages: [],
      events: []
    };
    for (let i = 0; i < 104; i++) {
      const date = shift(i < 96 ? -1430 + i * 14 : 7 + (i - 96) * 10),
        past = date < shift(0),
        host = staff[i % 80].profile,
        attendees = students.filter(s => s.profile.joinedAt <= date && (s.profile.name.length + i) % 4 === 0).map(s => s.profile.id);
      c.events.push({
        id: 'hkbk-event-' + i,
        name: `${eventNames[i % 12]} · ${new Date(date + 'T12:00:00Z').getFullYear()}`,
        type: ['Hackathon', 'Workshop', 'Meetup', 'Challenge'][i % 4],
        date,
        time: '10:00 AM – 1:00 PM',
        location: i % 3 === 0 ? 'Online · College learning room' : 'Campus innovation lab · Sample venue',
        description: `${past ? 'Archived' : 'Upcoming'} sample campus ${['hackathon', 'workshop', 'peer meetup', 'practice challenge'][i % 4]}. ${['Build a useful campus tool with a small team.', 'Bring one question and leave with a working example.', 'Share progress, get feedback, and meet peers.', 'Practise a pattern, explain it, and review your solution.'][i % 4]} Hosted by ${host.name}.`,
        host: host.name,
        attendees,
        sample: true,
        outcome: past ? `${attendees.length} sample participants · ${8 + i % 19} team submissions · peer feedback shared` : 'Bring a laptop, an idea, and your questions.'
      });
    }
    const templates = [s => `This week I practised ${topics[s % 16].toLowerCase()}. Tracing a small example before writing code helped me find the edge cases. Next: explain my approach without looking at the solution.`, s => `Project checkpoint: ${catalog.projects[s % catalog.projects.length].title}. I finished one working flow, added validation, and wrote down a decision I would change in the next version. Happy to exchange feedback.`, s => `Looking for a study partner for ${topics[s % 16].toLowerCase()}. Two short sessions this week: one concept, one exercise, then a review. Reply if that fits your pace.`, s => `A reminder from our mentor circle: a clear explanation is part of the solution. Show your assumptions, test a boundary case, and say what you would improve next.`, s => `Today's practice challenge: work through ${topics[s % 16].toLowerCase()} and share one mistake you learned from. Hints are welcome; give others room to think.`, s => `Portfolio review notes: lead with the problem, show a working demo, explain your own contribution, and keep the README useful. A small finished project tells a stronger story than an unfinished feature list.`];
    for (let i = 0; i < 1040; i++) {
      const date = shift(-1435 + Math.floor(i * 1435 / 1039)),
        pool = students.filter(s => s.profile.joinedAt <= date),
        author = i % 5 === 0 ? staff[i % 100].profile : (pool[i * 17 % Math.max(1, pool.length)] || students.at(-1)).profile,
        likes = students.filter(s => s.profile.joinedAt <= date && (Number(s.profile.id.split('-').at(-1)) || 0) % 23 === i % 23).slice(0, 32).map(s => s.profile.id);
      c.posts.push({
        id: 'hkbk-post-' + i,
        author: author.id,
        text: templates[i % templates.length](i) + '\n\n' + ['Session notes: ' + (20 + i % 55) + ' minutes, one worked example, and a short reflection.', 'Study circle ' + (1 + i % 12) + ': we are comparing approaches before choosing a solution.', 'My next checkpoint is a small testable improvement to the ' + topics[(i + 5) % 16].toLowerCase() + ' exercise.', 'Sharing from our ' + new Date(date + 'T12:00:00Z').toLocaleDateString('en-IN', {
          month: 'long',
          year: 'numeric'
        }) + ' learning log.', 'Preparation focus: ' + catalog.companies[i % catalog.companies.length].name + '-style general practice themes; these are not claimed interview questions.', 'A useful review question: how would this behave with an empty input or a slow network?', 'Peer feedback request: is the explanation clear enough to reproduce the result?', 'Keeping a record of what changed, what failed, and what to try in the next session.'][Math.floor(i / 6) % 8],
        tag: author.role !== 'student' && i % 5 === 0 ? 'Announcement' : ['Learning', 'Project', 'Question', 'Learning', 'Milestone', 'Project'][i % 6],
        time: stamp(date),
        likes,
        comments: i % 3 === 0 && pool.length ? [{
          id: 'comment-' + i,
          author: pool[(i + 3) % pool.length].profile.id,
          text: ['Thanks for sharing the approach. I will try tracing a smaller example first.', 'I can join the study session. Let us compare notes after attempting the exercise.', 'The README checklist is useful. I added a testing section to my project.'][Math.floor(i / 3) % 3],
          time: stamp(date)
        }] : [],
        sample: true
      });
    }
    const bhav = students.find(s => s.profile.handle === 'bhavanisingh');
    c.posts.push({
      id: 'hkbk-bhavani-milestone',
      author: bhav.profile.id,
      text: 'Day 1,438 of my four-year journey. 1,474 problems practised, four complete projects, and a lot of lessons from getting stuck. This week: system-design revision, interview stories, and helping our first-year study circle. The goal is to explain what I built as clearly as I can.',
      tag: 'Milestone',
      time: stamp(shift(0)),
      likes: students.filter((_, i) => i % 4 === 0).map(s => s.profile.id),
      comments: [{
        id: 'mentor-bhavani',
        author: staff[0].profile.id,
        text: 'Your consistency and peer mentoring stand out. For the final stretch, bring a short project walkthrough and one architecture tradeoff to our review.',
        time: stamp(shift(0))
      }],
      sample: true
    });
    for (const [i, s] of [...students, ...staff].entries()) {
      const roster = [...students, ...staff];
      for (let j = 0; j < 5 + i % 11; j++) {
        const to = roster[(i * 7 + j * 19 + 1) % roster.length].profile.id;
        if (to !== s.profile.id && !c.follows.some(f => f.from === s.profile.id && f.to === to)) c.follows.push({
          from: s.profile.id,
          to
        });
      }
      if (i < 300) c.follows.push({
        from: s.profile.id,
        to: bhav.profile.id
      });
    }
    c.follows = c.follows.filter(f => f.from !== f.to);
    for (let i = 0; i < 96; i++) c.messages.push({
      id: 'hkbk-chat-' + i,
      author: (i % 7 === 0 ? staff[i % 100] : students[i * 13 % 400]).profile.id,
      to: 'global',
      text: ['Anyone revising SQL joins today? I can share a small practice dataset.', 'Project review circle is open. Bring one working flow and one question.', 'Solved the graph traversal exercise. Drawing the queue first helped.', 'Mentor hour: focus on the next useful step, and bring your questions.', 'Looking for a teammate for the next campus build session.'][i % 5],
      time: stamp(shift(-28 + Math.floor(i / 4))),
      sample: true
    });
    c.messages.push({
      id: 'hkbk-bhavani-dm',
      author: staff[0].profile.id,
      to: bhav.profile.id,
      text: 'Your final-year portfolio is nearly ready. Let us review your system-design explanation and interview stories this week.',
      time: stamp(shift(-1)),
      sample: true
    });
    for (let year = 1; year <= 4; year++) {
      const targets = students.filter(s => s.profile.year === year),
        teacher = staff[year - 1].profile,
        id = 'hkbk-mentor-year-' + year;
      campus.items.push({
        id,
        kind: 'Feedback',
        title: year === 4 ? 'Final-year portfolio & interview review' : 'Your next useful preparation step',
        description: 'Review your current progress with your mentor. Choose one manageable learning goal, one practice exercise, and one project checkpoint. Reply with your next step.',
        subject: 'Mentoring',
        status: 'published',
        author: teacher.name,
        authorId: teacher.id,
        createdAt: stamp(shift(-5)),
        publishedAt: stamp(shift(-5)),
        deadline: shift(5),
        maxPoints: 100,
        targetIds: targets.map(s => s.profile.id),
        audience: {
          scope: 'filter',
          filters: {
            year: String(year)
          }
        },
        sample: true
      });
      for (const s of targets) {
        s.staffMessages[0].id = id;
        s.staffMessages[0].sourceId = id;
        s.staffMessages[0].sender = teacher.name;
      }
      const announcement = {
        id: 'hkbk-announcement-year-' + year,
        kind: 'Announcement',
        title: ['First-year learning circles are open', 'Year 2 project review week', 'Internship preparation: bring your portfolio', 'Final-year readiness reviews'][year - 1],
        description: ['Choose a study circle, meet your mentor, and start with programming and communication foundations.', 'Bring one working project flow, a useful README, and one question for peer feedback.', 'Review your resume, explain one technical contribution, and check eligibility before applying.', 'Book a mentor conversation to review your project stories, technical preparation, and next application steps.'][year - 1],
        subject: 'College updates',
        status: 'published',
        author: teacher.name,
        authorId: teacher.id,
        createdAt: stamp(shift(-3)),
        publishedAt: stamp(shift(-3)),
        deadline: null,
        maxPoints: 100,
        targetIds: targets.map(s => s.profile.id),
        audience: {
          scope: 'filter',
          filters: {
            year: String(year)
          }
        },
        sample: true
      };
      campus.items.push(announcement);
      for (const s of targets) s.campusUpdates.push({
        id: announcement.id,
        kind: 'Announcement',
        title: announcement.title,
        text: announcement.description,
        author: teacher.name,
        read: s.profile.handle === 'bhavanisingh' || s.skills.DSA > 60,
        createdAt: announcement.createdAt
      });
    }
    for (const e of c.events.slice(-8)) {
      const targets = students.filter(s => s.profile.year < 4 || s.registrations.includes(e.id));
      campus.items.push({
        id: e.id,
        kind: 'Event',
        title: e.name,
        description: e.description,
        subject: e.type,
        eventDate: e.date,
        status: 'published',
        author: e.host,
        createdAt: stamp(shift(-2)),
        publishedAt: stamp(shift(-2)),
        deadline: e.date,
        maxPoints: 100,
        targetIds: targets.map(s => s.profile.id),
        audience: {
          scope: 'filter',
          filters: {}
        },
        sample: true
      });
      for (const s of targets) s.campusUpdates.push({
        id: e.id,
        kind: 'Event',
        title: e.name,
        text: e.description,
        eventDate: e.date,
        author: e.host,
        read: s.skills.DSA > 60,
        createdAt: stamp(shift(-2))
      });
    }
    for (let i = 0; i < 8; i++) {
      const job = catalog.jobs[i],
        targets = students.filter(s => s.profile.year > 2 && s.profile.name.length % 8 === i),
        id = 'hkbk-recommendation-' + i;
      campus.items.push({
        id,
        kind: 'Opportunity',
        title: job.company + ' · preparation suggestion',
        description: 'Review the source listing and your skill gaps. Practise one relevant interview topic, then decide whether the role fits your year and interests.',
        subject: 'Placement preparation',
        jobId: job.id,
        status: 'published',
        author: 'Arjun Mehta',
        authorId: staff[80].profile.id,
        createdAt: stamp(shift(-4)),
        publishedAt: stamp(shift(-4)),
        maxPoints: 100,
        targetIds: targets.map(s => s.profile.id),
        audience: {
          scope: 'selected',
          ids: targets.map(s => s.profile.id)
        },
        sample: true
      });
      for (const s of targets) s.recommendedJobs.push({
        id,
        sourceId: id,
        jobId: job.id,
        sender: 'Arjun Mehta',
        message: 'Preparation suggestion from your placement team. Check the official source and strengthen the highlighted role skills.',
        createdAt: stamp(shift(-4))
      });
    }
    for (const s of students) {
      s.registrations = c.events.filter(e => e.attendees.includes(s.profile.id)).map(e => e.id);
      saveProfile(s);
    }
    campus.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    campus.audit.sort((a, b) => b.time.localeCompare(a.time));
    db.prepare('INSERT INTO campuses VALUES(?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(HKBK_ID, JSON.stringify(campus));
    community.save(c);
    db.prepare('INSERT OR REPLACE INTO dataset_versions VALUES(?,4)').run(HKBK_ID);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  connectAnnouncements();
  return {
    students: students.length,
    staff: staff.length
  };
}
