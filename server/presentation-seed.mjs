import { campusStories, campusWorkshops } from '../shared/content/campus-stories.js';
import { learningResources } from '../shared/learning-library.js';
const dataset = 'hkbk-presentation-content-v1';
const collegeId = 'hkbk-college-of-engineering';
const day = offset => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', {
  timeZone: 'Asia/Kolkata'
});
export function enrichPresentationCampus({
  db,
  community,
  readProfile,
  saveProfile
}) {
  db.exec('CREATE TABLE IF NOT EXISTS dataset_versions(id TEXT PRIMARY KEY,version INTEGER)');
  if (db.prepare('SELECT version FROM dataset_versions WHERE id=?').get(dataset)) return {
    added: false
  };
  const all = db.prepare("SELECT id FROM profiles WHERE json_extract(document,'$.profile.collegeId')=? AND json_extract(document,'$.profile.sampleData')=1").all(collegeId).map(r => readProfile(r.id));
  const students = all.filter(s => s.profile.role === 'student'),
    staff = all.filter(s => s.profile.role !== 'student');
  if (students.length !== 400 || !staff.length) return {
    added: false
  };
  const c = community.read(collegeId),
    row = db.prepare('SELECT document FROM campuses WHERE id=?').get(collegeId);
  if (!row) return {
    added: false
  };
  const campus = JSON.parse(row.document);
  db.exec('BEGIN IMMEDIATE');
  try {
    campusStories.forEach(([tag, year, text, courseId], i) => {
      const author = i === 0 ? students.find(s => s.profile.handle === 'bhavanisingh') : students.filter(s => s.profile.year === year)[i * 13 % 100];
      const time = new Date(Date.now() - (campusStories.length - i) * 2 * 3600000).toISOString();
      c.posts.push({
        id: 'campus-story-v1-' + i,
        author: author.profile.id,
        tag,
        text,
        time,
        resource: {
          type: 'course',
          id: courseId
        },
        likes: students.filter((_, n) => (n + i) % 37 === 0).slice(0, 9).map(s => s.profile.id),
        comments: [{
          id: 'story-reply-' + i,
          author: staff[i % staff.length].profile.id,
          text: ['Useful explanation. Bring your boundary case to the next review so we can compare the approaches.', 'The test evidence makes the decision easier to review. Add the assumptions to your project notes.', 'Good discussion point for the workshop. Try one input that breaks the first approach and explain the result.', 'Share the smallest reproducible example with your study group; it will make the feedback more specific.'][i % 4],
          time: new Date(Date.parse(time) + 15 * 60000).toISOString()
        }],
        sample: true
      });
    });
    const offsets = [-30, -21, -14, -7, 2, 4, 7, 10, 14, 18, 21, 28];
    campusWorkshops.forEach(([name, type, courseId, description], i) => {
      const date = day(offsets[i]),
        id = 'campus-workshop-v1-' + i,
        author = staff[i % 80].profile,
        past = offsets[i] < 0;
      const targets = students.filter(s => i === 6 ? s.profile.year === 1 : i === 11 ? s.profile.year === 4 : s.profile.year < 4 || i % 2 === 0);
      const attendees = targets.filter((_, n) => n % 5 === i % 5).map(s => s.profile.id);
      c.events.push({
        id,
        name,
        type,
        date,
        time: i % 2 ? '2:00 PM – 5:00 PM' : '10:00 AM – 1:00 PM',
        location: i % 3 ? 'HKBK innovation lab · Block A' : 'Online · Campus learning room',
        description,
        host: author.name,
        attendees,
        sample: true,
        outcome: past ? `${attendees.length} participants · ${8 + i} project walkthroughs · peer feedback shared` : 'Bring a laptop, your questions and one example to discuss.'
      });
      const publishedAt = new Date(Date.now() - (12 - i) * 3 * 3600000).toISOString();
      campus.items.push({
        id,
        kind: 'Event',
        title: name,
        description,
        subject: type,
        eventDate: date,
        status: 'published',
        author: author.name,
        authorId: author.id,
        createdAt: publishedAt,
        publishedAt,
        deadline: date,
        maxPoints: 100,
        targetIds: targets.map(s => s.profile.id),
        audience: {
          scope: 'selected',
          ids: targets.map(s => s.profile.id)
        },
        sample: true
      });
      c.posts.push({
        id: 'workshop-post-v1-' + i,
        sourceId: id,
        author: author.id,
        tag: 'Event',
        text: name + '\n\n' + description + '\n\n' + date + ' · ' + (i % 3 ? 'Campus innovation lab' : 'Online campus room'),
        time: publishedAt,
        likes: attendees.slice(0, 12),
        comments: [],
        sample: true,
        resource: {
          type: 'course',
          id: courseId
        }
      });
      for (const s of targets) {
        s.campusUpdates ||= [];
        s.campusUpdates.push({
          id,
          kind: 'Event',
          title: name,
          text: description,
          eventDate: date,
          author: author.name,
          read: past,
          createdAt: publishedAt
        });
        if (attendees.includes(s.profile.id) && !s.registrations.includes(id)) s.registrations.push(id);
      }
    });
    for (const event of c.events) {
      if (event.sample) {
        event.description = event.description.replaceAll('sample campus', 'campus');
        event.location = event.location.replaceAll('Sample venue', 'Innovation block');
        event.outcome = event.outcome.replaceAll('sample participants', 'participants');
      }
    }
    for (const s of students) {
      s.savedLearningResources ??= learningResources.filter(r => r.courseId === ({
        'Data analytics': 'analytics',
        'Data science': 'machine-learning',
        'DevOps': 'devops',
        'Full-stack development': 'react'
      }[s.profile.track] || 'python')).slice(0, 2).map(r => r.id);
      s.version++;
      saveProfile(s);
    }
    c.posts.sort((a, b) => a.time.localeCompare(b.time));
    c.version++;
    community.save(c);
    campus.version++;
    db.prepare('UPDATE campuses SET document=? WHERE id=?').run(JSON.stringify(campus), collegeId);
    db.prepare('INSERT INTO dataset_versions VALUES(?,1)').run(dataset);
    db.exec('COMMIT');
    return {
      added: true,
      posts: campusStories.length + campusWorkshops.length,
      events: campusWorkshops.length
    };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
