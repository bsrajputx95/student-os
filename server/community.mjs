import { randomUUID } from 'node:crypto';
import { campusKey } from '../shared/staff.js';
import { can, requirePermission } from '../shared/permissions.js';
export function createCommunity({
  db,
  readProfile,
  saveProfile,
  broadcastCampus
}) {
  db.exec('CREATE TABLE IF NOT EXISTS communities(id TEXT PRIMARY KEY,document TEXT NOT NULL)');
  const read = id => {
    const row = db.prepare('SELECT document FROM communities WHERE id=?').get(id);
    return row ? JSON.parse(row.document) : {
      id,
      version: 1,
      posts: [],
      follows: [],
      messages: [],
      events: []
    };
  };
  const save = c => {
    db.prepare('INSERT INTO communities VALUES(?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run(c.id, JSON.stringify(c));
    // Older embedders can use the community service before platform migrations.
    if (db.prepare("SELECT name FROM sqlite_master WHERE name='community_posts'").get()) {
      const post = db.prepare('INSERT INTO community_posts VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document WHERE document!=excluded.document');
      for (const p of c.posts) post.run(p.id, c.id, p.author, p.time, JSON.stringify(p));
      const message = db.prepare('INSERT INTO community_messages VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document WHERE document!=excluded.document');
      for (const m of c.messages) message.run(m.id, c.id, m.author, m.to, m.time, JSON.stringify(m));
    }
  };
  const legacyPeople = college => db.prepare("SELECT json_extract(document,'$.profile') AS profile FROM profiles").all().map(r => JSON.parse(r.profile)).filter(p => campusKey(p) === college).map(p => ({
    id: p.id,
    name: p.name,
    handle: p.handle,
    role: p.role || 'student',
    designation: p.designation,
    year: p.year,
    department: p.department,
    bio: p.bio || '',
    studentId: p.studentId,
    track: p.track,
    color: ['purple', 'mint', 'blue', 'peach'][p.name.length % 4],
    initials: p.name.replace(/^Dr\. /, '').split(' ').map(n => n[0]).slice(0, 2).join('')
  }));
  const directoryAvailable = !!db.prepare("SELECT name FROM sqlite_master WHERE name='public_members'").get();
  const people = college => directoryAvailable ? db.prepare('SELECT document FROM public_members WHERE college_id=?').all(college).map(r => JSON.parse(r.document)).filter(p => !p.suspended && p.enrollmentStatus !== 'pending') : legacyPeople(college);
  function snapshot(state, options = {}) {
    const id = campusKey(state.profile),
      row = db.prepare('SELECT id FROM communities WHERE id=?').get(id);
    if (!row) return {};
    const c = read(id),
      me = state.profile.id,
      roster = people(id),
      blocked = who => (c.blocks || []).some(b => b.from === me && b.to === who || b.to === me && b.from === who),
      visible = entry => !entry.hidden && !blocked(entry.author) && (!entry.targetIds || state.profile.role !== 'student' || entry.targetIds.includes(me));
    return {
      profile: {
        ...state.profile,
        followers: c.follows.filter(f => f.to === me).length,
        followingCount: c.follows.filter(f => f.from === me).length
      },
      communityEnabled: true,
      communityBlocks: (c.blocks || []).filter(b => b.from === me).map(b => b.to),
      communityMutes: (c.mutes || []).filter(b => b.from === me).map(b => b.to),
      communityUnread: Object.fromEntries(['global', ...roster.filter(p => p.id !== me).map(p => p.id)].map(thread => [thread, c.messages.filter(m => m.author !== me && visible(m) && (thread === 'global' ? m.to === 'global' : m.to === me && m.author === thread) && m.time > ((c.reads || {})[me + ':' + thread] || '')).length])),
      communityReports: can(state.profile, 'community.moderate') ? (c.reports || []).map(r => ({
        ...r,
        post: c.posts.find(p => p.id === r.postId)
      })) : [],
      communityVersion: c.version,
      communityPeople: roster.map(person => ({
        ...person,
        followers: c.follows.filter(f => f.to === person.id).length,
        followingCount: c.follows.filter(f => f.from === person.id).length,
        postCount: c.posts.filter(p => p.author === person.id && visible(p)).length
      })),
      communityPosts: c.posts.filter(visible).filter(p => !(c.mutes || []).some(b => b.from === me && b.to === p.author)).toSorted((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id)).slice(-(options.limit || c.posts.length || 1)).map(p => ({
        ...p,
        comments: p.comments.filter(visible)
      })),
      communityFollows: c.follows.filter(f => f.from === me || f.to === me),
      communityMessages: c.messages.filter(m => visible(m) && (m.to === 'global' || m.author === me || m.to === me)),
      collegeEvents: c.events.filter(visible),
      communityStats: {
        posts: c.posts.length,
        events: c.events.length,
        members: roster.length,
        years: 4
      }
    };
  }
  function shareItem(actor, item) {
    if (!['Announcement', 'Event'].includes(item.kind)) return;
    const id = campusKey(actor.profile),
      c = read(id);
    if (c.posts.some(p => p.sourceId === item.id)) return;
    c.posts.push({
      id: 'college-post-' + item.id,
      sourceId: item.id,
      author: actor.profile.id,
      text: item.title + '\n\n' + item.description,
      tag: item.kind === 'Event' ? 'Event' : 'Announcement',
      time: item.publishedAt,
      likes: [],
      comments: [],
      targetIds: item.targetIds,
      sample: !!item.sample
    });
    if (item.kind === 'Event' && !c.events.some(e => e.id === item.id)) c.events.push({
      id: item.id,
      name: item.title,
      type: 'Workshop',
      date: item.eventDate || item.deadline || new Date().toISOString().slice(0, 10),
      time: 'Check the college brief',
      location: 'College event · see details',
      description: item.description,
      host: actor.profile.name,
      attendees: [],
      sourceUrl: item.sourceUrl,
      targetIds: item.targetIds,
      sample: !!item.sample
    });
    c.version++;
    save(c);
    broadcastCampus(id);
  }
  function action(actor, type, p = {}) {
    if (!type.startsWith('community.')) return false;
    const id = campusKey(actor.profile),
      c = read(id),
      me = actor.profile.id,
      roster = people(id),
      person = who => roster.some(x => x.id === who);
    const blocked = who => (c.blocks || []).some(b => b.from === me && b.to === who || b.to === me && b.from === who);
    const text = (v, max = 2000) => {
      if (typeof v !== 'string' || !v.trim()) throw new Error('Write something first.');
      return v.trim().slice(0, max);
    };
    if (type === 'community.block' || type === 'community.mute') {
      if (!person(p.id) || p.id === me) throw new Error('Choose another college member.');
      const key = type.endsWith('block') ? 'blocks' : 'mutes';
      c[key] ||= [];
      const old = c[key].findIndex(b => b.from === me && b.to === p.id);
      if (old >= 0) c[key].splice(old, 1);else c[key].push({
        from: me,
        to: p.id
      });
    } else if (type === 'community.read') {
      if (p.thread !== 'global' && !person(p.thread)) throw new Error('Conversation not found.');
      c.reads ||= {};
      c.reads[me + ':' + p.thread] = new Date().toISOString();
    } else if (type === 'community.report') {
      const post = c.posts.find(x => x.id === p.id && !x.hidden && (!x.targetIds || actor.profile.role !== 'student' || x.targetIds.includes(me)));
      if (!post) throw new Error('Post not found.');
      c.reports ||= [];
      if (!c.reports.some(r => r.postId === p.id && r.author === me && r.status === 'open')) c.reports.push({
        id: randomUUID(),
        postId: p.id,
        author: me,
        reason: text(p.reason, 1000),
        status: 'open',
        time: new Date().toISOString()
      });
    } else if (type === 'community.moderate') {
      requirePermission(actor.profile, 'community.moderate');
      const report = c.reports?.find(r => r.id === p.id);
      if (!report || !['hide', 'dismiss', 'restore'].includes(p.decision)) throw new Error('Choose a report and a moderation decision.');
      const post = c.posts.find(x => x.id === report.postId);
      if (post && p.decision !== 'dismiss') post.hidden = p.decision === 'hide';
      report.status = p.decision;
      report.reviewedBy = me;
      report.reviewedAt = new Date().toISOString();
      report.note = text(p.note, 1000);
    } else if (type === 'community.post.delete') {
      const post = c.posts.find(x => x.id === p.id);
      if (!post || post.author !== me) throw new Error('Only your own post can be removed.');
      post.hidden = true;
    } else if (type === 'community.post') {
      const tag = ['Learning', 'Project', 'Question', 'Milestone', 'Announcement', 'Event'].includes(p.tag) ? p.tag : 'Learning';
      if (tag === 'Announcement' && actor.profile.role === 'student') throw new Error('College announcements are published by staff.');
      c.posts.push({
        id: randomUUID(),
        author: me,
        text: text(p.text),
        tag,
        time: new Date().toISOString(),
        likes: [],
        comments: [],
        sample: false
      });
    } else if (type === 'community.like') {
      const post = c.posts.find(x => x.id === p.id);
      if (!post || post.hidden || blocked(post.author) || post.targetIds && actor.profile.role === 'student' && !post.targetIds.includes(me)) throw new Error('Post not found.');
      post.likes = post.likes.includes(me) ? post.likes.filter(x => x !== me) : [...post.likes, me];
    } else if (type === 'community.comment') {
      const post = c.posts.find(x => x.id === p.id);
      if (!post || post.hidden || blocked(post.author) || post.targetIds && actor.profile.role === 'student' && !post.targetIds.includes(me)) throw new Error('Post not found.');
      post.comments.push({
        id: randomUUID(),
        author: me,
        text: text(p.text, 600),
        time: new Date().toISOString()
      });
    } else if (type === 'community.follow') {
      if (!person(p.id) || p.id === me || blocked(p.id)) throw new Error('Choose another available college member.');
      const index = c.follows.findIndex(f => f.from === me && f.to === p.id);
      if (index >= 0) c.follows.splice(index, 1);else c.follows.push({
        from: me,
        to: p.id
      });
    } else if (type === 'community.message') {
      if (p.to !== 'global' && (!person(p.to) || p.to === me || blocked(p.to))) throw new Error('This conversation is unavailable.');
      c.messages.push({
        id: randomUUID(),
        author: me,
        to: p.to,
        text: text(p.text),
        time: new Date().toISOString()
      });
    } else if (type === 'community.event.cancel') {
      requirePermission(actor.profile, 'content.publish');
      const event = c.events.find(e => e.id === p.id);
      if (!event) throw new Error('Event not found.');
      event.cancelled = true;
      event.cancellation = text(p.reason, 1000);
    } else if (type === 'community.event.attendance') {
      requirePermission(actor.profile, 'content.publish');
      const event = c.events.find(e => e.id === p.id);
      if (!event || !event.attendees.includes(p.studentId) || event.date > new Date().toISOString().slice(0, 10)) throw new Error('Select a registered participant after the event.');
      event.attendance ||= [];
      if (!event.attendance.includes(p.studentId)) event.attendance.push(p.studentId);
      if (readProfile && saveProfile) {
        const s = readProfile(p.studentId);
        s.eventEvidence ||= [];
        if (!s.eventEvidence.some(e => e.id === event.id)) s.eventEvidence.push({
          id: event.id,
          title: event.name,
          date: event.date,
          verifiedBy: me
        });
        s.version++;
        saveProfile(s);
      }
    } else if (type === 'community.event.team') {
      const event = c.events.find(e => e.id === p.id);
      if (!event || event.cancelled || event.date < new Date().toISOString().slice(0, 10) || !event.attendees.includes(me)) throw new Error('Register for an upcoming event first.');
      event.teams ||= [];
      const current = event.teams.find(t => t.members.includes(me));
      if (p.leave) {
        if (current) current.members = current.members.filter(id => id !== me);
      } else {
        if (current) throw new Error('Leave your current team before joining another.');
        let team = event.teams.find(t => t.id === p.teamId);
        if (p.teamId && !team) throw new Error('Team not found.');
        if (!team) {
          team = {
            id: randomUUID(),
            name: text(p.name, 100),
            members: [],
            owner: me
          };
          event.teams.push(team);
        }
        if (team.members.length >= 4) throw new Error('This team already has four members.');
        team.members.push(me);
      }
      event.teams = event.teams.filter(t => t.members.length);
    } else if (type === 'community.event.unregister') {
      const event = c.events.find(e => e.id === p.id);
      if (!event || event.date < new Date().toISOString().slice(0, 10)) throw new Error('Registration is closed.');
      event.attendees = event.attendees.filter(id => id !== me);
      for (const t of event.teams || []) t.members = t.members.filter(id => id !== me);
      actor.registrations = (actor.registrations || []).filter(id => id !== event.id);
      actor.tasks = (actor.tasks || []).filter(t => t.id !== 'campus-event-' + event.id || t.status === 'completed');
    } else if (type === 'community.event.register') {
      const event = c.events.find(e => e.id === p.id);
      if (!event || event.cancelled || event.targetIds && actor.profile.role === 'student' && !event.targetIds.includes(me) || event.date < new Date().toISOString().slice(0, 10)) throw new Error('Registration is closed. Explore an upcoming event.');
      event.attendees ||= [];
      if (!event.attendees.includes(me)) event.attendees.push(me);
      if (actor.profile.role === 'student') {
        actor.registrations ||= [];
        if (!actor.registrations.includes(event.id)) actor.registrations.push(event.id);
        if (actor.profile.year < 4 && !actor.tasks.some(t => t.id === 'campus-event-' + event.id)) actor.tasks.push({
          id: 'campus-event-' + event.id,
          title: event.name,
          detail: event.description,
          kind: 'campus-event',
          category: 'Communication',
          minutes: 30,
          xp: 40,
          status: 'pending',
          date: event.date
        });
      }
    } else throw new Error('Community action not supported.');
    c.version++;
    save(c);
    broadcastCampus(id);
    return true;
  }
  return {
    page: (state, p = {}) => {
      const posts = snapshot(state).communityPosts || [],
        roster = new Map(people(campusKey(state.profile)).map(person => [person.id, person])),
        limit = Math.min(100, Math.max(1, Number(p.limit) || 25));
      let visible = posts.filter(post => (!p.query || post.text.toLowerCase().includes(String(p.query).toLowerCase()) || roster.get(post.author)?.name.toLowerCase().includes(String(p.query).toLowerCase())) && (!p.tag || post.tag === p.tag) && (!p.year || roster.get(post.author)?.year === Number(p.year)));
      if (p.before) {
        let cursor;
        try {
          cursor = JSON.parse(Buffer.from(p.before, 'base64url').toString());
        } catch {
          throw new Error('Invalid page cursor.');
        }
        visible = visible.filter(post => post.time < cursor.time || post.time === cursor.time && post.id < cursor.id);
      }
      const result = visible.slice(-limit),
        oldest = result[0];
      return {
        posts: result,
        hasMore: visible.length > limit,
        cursor: oldest ? Buffer.from(JSON.stringify({
          time: oldest.time,
          id: oldest.id
        })).toString('base64url') : null
      };
    },
    read,
    save,
    people,
    snapshot,
    action,
    shareItem,
    notify: broadcastCampus
  };
}
