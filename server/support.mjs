import { randomUUID } from 'node:crypto';
import { can } from '../shared/permissions.js';
import { boundedText, enumValue, object } from '../shared/validation.js';
export function createSupport({
  db
}) {
  db.exec('CREATE TABLE IF NOT EXISTS support_tickets(id TEXT PRIMARY KEY,college_id TEXT NOT NULL,author_id TEXT NOT NULL,status TEXT NOT NULL,document TEXT NOT NULL,created_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS tickets_college_status ON support_tickets(college_id,status,created_at);');
  const staff = p => can(p, 'community.moderate');
  function list(actor) {
    const moderator = staff(actor.profile);
    return db.prepare('SELECT document FROM support_tickets WHERE college_id=?' + (moderator ? '' : ' AND author_id=?') + ' ORDER BY created_at DESC LIMIT 100').all(...(moderator ? [actor.profile.collegeId] : [actor.profile.collegeId, actor.profile.id])).map(r => JSON.parse(r.document));
  }
  function action(actor, p) {
    object(p, 'Support request');
    if (p.operation === 'create') {
      const t = {
        id: randomUUID(),
        authorId: actor.profile.id,
        author: actor.profile.name,
        category: enumValue(p.category, ['App problem', 'Academic support', 'Privacy / data request'], 'support category'),
        subject: boundedText(p.subject, 4, 180, 'Subject'),
        text: boundedText(p.text, 20, 5000, 'Description'),
        status: 'open',
        createdAt: new Date().toISOString(),
        responses: []
      };
      db.prepare('INSERT INTO support_tickets VALUES(?,?,?,?,?,?)').run(t.id, actor.profile.collegeId, t.authorId, t.status, JSON.stringify(t), t.createdAt);
      return t;
    }
    const row = db.prepare('SELECT document FROM support_tickets WHERE id=? AND college_id=?').get(String(p.id || ''), actor.profile.collegeId);
    const t = row && JSON.parse(row.document);
    if (t && !staff(actor.profile) && t.authorId !== actor.profile.id) throw new Error('Support request not found.');
    if (!t) throw new Error('Support request not found.');
    if (p.operation === 'reply') {
      t.responses.push({
        id: randomUUID(),
        author: actor.profile.name,
        text: boundedText(p.text, 5, 3000, 'Response'),
        time: new Date().toISOString()
      });
    } else if (p.operation === 'status' && staff(actor.profile)) t.status = enumValue(p.status, ['open', 'in progress', 'resolved'], 'request status');else throw new Error('This support operation is not allowed.');
    db.prepare('UPDATE support_tickets SET status=?,document=? WHERE id=?').run(t.status, JSON.stringify(t), t.id);
    return t;
  }
  return {
    list,
    action
  };
}
