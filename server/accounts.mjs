import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { boundedText, enumValue } from '../shared/validation.js';
import { requirePermission, staffRoles } from '../shared/permissions.js';
import { createProfile } from './profiles.mjs';
import { audit } from './database.mjs';
import { parseCsv } from '../shared/csv.js';
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function createAccounts({
  db,
  read,
  save,
  auth,
  sessions,
  config,
  enqueue,
  clock = Date.now
}) {
  function issue(kind, profileId, collegeId, document) {
    const token = randomBytes(32).toString('hex');
    db.prepare('INSERT INTO account_tokens VALUES(?,?,?,?,?,?,NULL)').run(tokenHash(token), kind, profileId, collegeId, JSON.stringify(document), clock() + (kind === 'recovery' ? 30 * 60000 : 7 * 86400000));
    return token;
  }
  function inspect(token, kind) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('This link is invalid or expired.');
    const row = db.prepare('SELECT * FROM account_tokens WHERE token_hash=? AND kind=? AND used_at IS NULL AND expires_at>?').get(tokenHash(token), kind, clock());
    if (!row) throw new Error('This link is invalid or expired.');
    return {
      ...row,
      data: JSON.parse(row.document)
    };
  }
  function consume(row) {
    const change = db.prepare('UPDATE account_tokens SET used_at=? WHERE token_hash=? AND used_at IS NULL').run(clock(), row.token_hash);
    if (!change.changes) throw new Error('This link has already been used.');
  }
  function invite(actor, p) {
    requirePermission(actor.profile, 'institution.manage');
    const role = enumValue(p.role, ['student', ...staffRoles], 'account role'),
      email = boundedText(p.email, 5, 200, 'Email').toLowerCase();
    if (!emailPattern.test(email)) throw new Error('Enter a valid college email address.');
    const token = issue('invite', null, actor.profile.collegeId, {
      role,
      email,
      college: actor.profile.college,
      department: String(p.department || 'Computer Science').slice(0, 100)
    });
    const url = config.origin + '/invite?token=' + token;
    if (config.mailConfigured) enqueue({
      key: 'invite:' + tokenHash(token),
      kind: 'mail',
      payload: {
        to: email,
        subject: 'Your StudentOS college invitation',
        text: `Your college invited you to StudentOS as ${role}. Open ${url}. This one-time invitation expires in seven days.`
      }
    });
    audit(db, actor.profile, 'account.invite', null, {
      role,
      email
    });
    return {
      url,
      email,
      role,
      mailQueued: config.mailConfigured
    };
  }
  function inviteInfo(token) {
    const row = inspect(token, 'invite');
    return {
      role: row.data.role,
      college: row.data.college,
      email: row.data.email
    };
  }
  function acceptInvite(p) {
    const row = inspect(p.token, 'invite');
    boundedText(p.password, 8, 128, 'Password');
    const handle = String(p.handle || '').toLowerCase().trim();
    if (db.prepare('SELECT id FROM profiles WHERE lower(handle)=?').get(handle)) throw new Error('That username is already taken.');
    const s = createProfile({
      name: p.name,
      handle,
      college: row.data.college
    });
    s.profile = {
      ...s.profile,
      role: row.data.role,
      collegeId: row.college_id,
      email: row.data.email,
      department: row.data.department,
      enrollmentStatus: 'approved',
      emailVerified: true
    };
    if (row.data.role !== 'student') {
      s.profile.onboardingDone = true;
      s.profile.designation = row.data.role === 'admin' ? 'College administrator' : row.data.role === 'support' ? 'Academic support' : row.data.role === 'placement' ? 'Placement coordinator' : 'Faculty mentor';
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      consume(row);
      save(s);
      auth.setPassword(s.profile.id, p.password);
      audit(db, s.profile, 'account.invite.accepted', s.profile.id, {
        role: s.profile.role
      });
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return s;
  }
  function recover(p) {
    if (!config.mailConfigured) {
      const error = new Error('Email recovery is not configured. Contact your college administrator.');
      error.status = 503;
      throw error;
    }
    const identifier = String(p.identifier || '').trim().toLowerCase();
    const row = db.prepare("SELECT id,document FROM profiles WHERE lower(handle)=? OR lower(json_extract(document,'$.profile.email'))=?").get(identifier, identifier);
    if (row) {
      const s = JSON.parse(row.document),
        email = s.profile.email;
      if (emailPattern.test(email || '') && !s.profile.suspended) {
        const token = issue('recovery', row.id, s.profile.collegeId || 'independent', {});
        enqueue({
          key: 'recovery:' + tokenHash(token),
          kind: 'mail',
          payload: {
            to: email,
            subject: 'Reset your StudentOS password',
            text: `Open ${config.origin}/reset-password?token=${token} to choose a new password. The one-time link expires in 30 minutes. If you did not request this, ignore it.`
          }
        });
      }
    }
    return {
      message: 'If an eligible account exists, a recovery link will arrive at its saved college email.'
    };
  }
  function reset(p) {
    const row = inspect(p.token, 'recovery');
    boundedText(p.password, 8, 128, 'Password');
    db.exec('BEGIN IMMEDIATE');
    try {
      consume(row);
      auth.replacePassword(row.profile_id, p.password);
      sessions.revokeAll(row.profile_id);
      db.prepare('UPDATE account_tokens SET used_at=? WHERE profile_id=? AND kind=? AND used_at IS NULL').run(clock(), row.profile_id, 'recovery');
      const s = read(row.profile_id);
      audit(db, s.profile, 'account.password.reset', row.profile_id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return {
      message: 'Password updated. Sign in with your new password.'
    };
  }
  function members(actor, {
    query = '',
    page = 1,
    limit = 25
  } = {}) {
    requirePermission(actor.profile, 'institution.manage');
    const params = [actor.profile.collegeId],
      where = "json_extract(document,'$.profile.collegeId')=?";
    const all = db.prepare('SELECT document FROM profiles WHERE ' + where).all(...params).map(r => JSON.parse(r.document).profile).filter(p => [p.name, p.handle, p.studentId].join(' ').toLowerCase().includes(query.toLowerCase()));
    const take = Math.max(1, Math.min(100, Number(limit) || 25)),
      current = Math.max(1, Number(page) || 1);
    return {
      total: all.length,
      page: current,
      members: all.slice((current - 1) * take, current * take).map(({
        id,
        name,
        handle,
        year,
        department,
        role,
        enrollmentStatus,
        suspended,
        email,
        studentId,
        cgpa,
        backlogs,
        graduationYear,
        section
      }) => ({
        id,
        name,
        handle,
        year,
        department,
        role,
        enrollmentStatus: enrollmentStatus || 'approved',
        suspended: !!suspended,
        email,
        studentId,
        cgpa,
        backlogs,
        graduationYear,
        section
      }))
    };
  }
  function manage(actor, p) {
    requirePermission(actor.profile, 'institution.manage');
    const target = read(p.id);
    if (!target || target.profile.collegeId !== actor.profile.collegeId) throw new Error('Account not found in your college.');
    if (target.profile.id === actor.profile.id && ['suspend', 'role'].includes(p.operation)) throw new Error('Use another administrator to change your own access.');
    if (target.profile.role === 'admin' && ['suspend', 'role'].includes(p.operation)) {
      const admins = db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE json_extract(document,'$.profile.collegeId')=? AND json_extract(document,'$.profile.role')='admin' AND COALESCE(json_extract(document,'$.profile.suspended'),0)=0").get(actor.profile.collegeId).count;
      if (admins <= 1) throw new Error('Keep at least one active college administrator.');
    }
    if (p.operation === 'suspend') target.profile.suspended = true;else if (p.operation === 'restore') target.profile.suspended = false;else if (p.operation === 'approve') {
      target.profile.enrollmentStatus = 'approved';
      target.profile.studentId = boundedText(p.studentId || target.profile.studentId, 2, 50, 'Student ID');
    } else if (p.operation === 'role') target.profile.role = enumValue(p.role, ['student', ...staffRoles], 'account role');else if (p.operation === 'year') {
      if (target.profile.role !== 'student' || ![1, 2, 3, 4].includes(p.year)) throw new Error('Choose a student year from 1 to 4.');
      target.profile.year = p.year;
    } else if (p.operation === 'academic') {
      if (target.profile.role !== 'student') throw new Error('Choose a student academic record.');
      const updates = {};
      for (const [key, min, max] of [['year', 1, 4], ['cgpa', 0, 10], ['backlogs', 0, 50], ['graduationYear', 2020, 2100]]) if (p[key] !== undefined && p[key] !== '') {
        if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max || key !== 'cgpa' && !Number.isInteger(p[key])) throw new Error('Invalid ' + key + ' value.');
        updates[key] = p[key];
      }
      for (const key of ['department', 'section', 'studentId']) if (p[key] !== undefined) updates[key] = boundedText(p[key], 1, key === 'studentId' ? 50 : 100, key);
      Object.assign(target.profile, updates);
      target.profile.academicRecordUpdatedAt = new Date().toISOString();
      target.profile.academicRecordUpdatedBy = actor.profile.id;
    } else throw new Error('Choose an account operation.');
    target.version++;
    save(target);
    if (['suspend', 'restore', 'role'].includes(p.operation)) sessions.revokeAll(target.profile.id);
    audit(db, actor.profile, 'account.' + p.operation, target.profile.id, {
      role: target.profile.role
    });
    return {
      updated: true
    };
  }
  return {
    importRoster: (actor, p) => {
      requirePermission(actor.profile, 'institution.manage');
      const rows = parseCsv(p.csv),
        seen = new Set();
      for (const r of rows) {
        if (!emailPattern.test(r.email) || !['student', ...staffRoles].includes(r.role)) throw new Error('Every row needs a valid email and role.');
        r.email = r.email.toLowerCase();
        if (seen.has(r.email)) throw new Error('Duplicate email: ' + r.email);
        seen.add(r.email);
        if (db.prepare("SELECT id FROM profiles WHERE lower(json_extract(document,'$.profile.email'))=?").get(r.email)) throw new Error('An account already uses ' + r.email);
      }
      if (p.preview === true) return {
        rows
      };
      db.exec('BEGIN IMMEDIATE');
      try {
        const invitations = rows.map(r => invite(actor, r));
        db.exec('COMMIT');
        return {
          invitations
        };
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    invite,
    inviteInfo,
    acceptInvite,
    recover,
    reset,
    members,
    manage
  };
}
