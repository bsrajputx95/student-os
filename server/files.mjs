import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { can } from '../shared/permissions.js';
const types = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.zip': 'application/zip',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
export function createFiles({
  db,
  dataDir,
  inline = false,
  readProfile,
  readCampus
}) {
  const directory = resolve(dataDir, 'uploads');
  mkdirSync(directory, {
    recursive: true
  });
  if (inline) db.exec('CREATE TABLE IF NOT EXISTS file_contents(storage_key TEXT PRIMARY KEY,bytes BLOB NOT NULL)');
  function publicFile(file) {
    return {
      id: file.id,
      name: file.name,
      mime: file.mime,
      size: file.size,
      createdAt: file.created_at,
      deleted: !!file.deleted_at,
      url: '/api/files/' + file.id
    };
  }
  function reference(file, actor) {
    const owner = readProfile(file.owner_id),
      sameCollege = actor.profile.collegeId === file.college_id;
    if (!sameCollege) return false;
    if (file.context_kind === 'assignment') {
      const assignment = owner?.assignments?.find(a => a.id === file.context_id);
      return can(actor.profile, 'academic.read') && !!assignment && [...(assignment.fileIds || []), ...(assignment.versions || []).flatMap(v => v.fileIds || [])].includes(file.id);
    }
    if (file.context_kind === 'resource') {
      const items = readCampus(file.college_id).items || [];
      return items.some(item => item.status === 'published' && (item.fileIds || []).includes(file.id) && (can(actor.profile, 'academic.read') || item.targetIds.includes(actor.profile.id)));
    }
    return false;
  }
  function upload(actor, p) {
    const name = basename(String(p.name || '').replaceAll('\\', '/')).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 160),
      extension = extname(name).toLowerCase(),
      mime = types[extension];
    if (!mime) throw new Error('Choose PDF, text, Markdown, CSV, PNG, JPEG, ZIP, or DOCX.');
    if (typeof p.base64 !== 'string' || p.base64.length > 7 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(p.base64)) throw new Error('Invalid upload data. Keep files under 5 MB.');
    const bytes = Buffer.from(p.base64, 'base64');
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('Keep files between 1 byte and 5 MB.');
    if (inline && bytes.length > 3 * 1024 * 1024) throw new Error('Keep hosted presentation attachments under 3 MB.');
    if (inline && db.prepare('SELECT COALESCE(SUM(length(bytes)),0) AS bytes FROM file_contents').get().bytes + bytes.length > 10 * 1024 * 1024) throw new Error('This presentation campus has reached its 10 MB attachment allowance.');
    if (extension === '.pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('This file is not a PDF.');
    if (extension === '.png' && bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('This file is not a PNG.');
    if (['.jpg', '.jpeg'].includes(extension) && bytes.subarray(0, 3).toString('hex') !== 'ffd8ff') throw new Error('This file is not a JPEG.');
    if (['.zip', '.docx'].includes(extension) && !['504b0304', '504b0506'].includes(bytes.subarray(0, 4).toString('hex'))) throw new Error('This file is not a ZIP-based document.');
    if (['.txt', '.md', '.csv'].includes(extension) && bytes.includes(0)) throw new Error('This text file contains binary data.');
    const context = p.assignmentId ? 'assignment' : 'resource';
    if (context === 'assignment') {
      if (actor.profile.role !== 'student' || !actor.assignments?.some(a => a.id === p.assignmentId)) throw new Error('Choose an assignment in your own workspace.');
    } else if (!can(actor.profile, 'content.publish')) throw new Error('Student uploads must belong to an assigned activity.');
    const total = db.prepare('SELECT COALESCE(SUM(size),0) AS bytes FROM files WHERE owner_id=?').get(actor.profile.id).bytes;
    if (total + bytes.length > 100 * 1024 * 1024) throw new Error('Your upload allowance is 100 MB. Remove unused drafts or contact your college.');
    const file = {
      id: randomUUID(),
      owner_id: actor.profile.id,
      college_id: actor.profile.collegeId,
      name,
      mime,
      size: bytes.length,
      storage_key: randomUUID() + '.bin',
      created_at: new Date().toISOString(),
      context_kind: context,
      context_id: p.assignmentId || null
    };
    if (inline) db.prepare('INSERT INTO file_contents VALUES(?,?)').run(file.storage_key, bytes);else writeFileSync(resolve(directory, file.storage_key), bytes, {
      flag: 'wx'
    });
    db.prepare('INSERT INTO files(id,owner_id,college_id,name,mime,size,storage_key,created_at,context_kind,context_id) VALUES(?,?,?,?,?,?,?,?,?,?)').run(file.id, file.owner_id, file.college_id, file.name, file.mime, file.size, file.storage_key, file.created_at, file.context_kind, file.context_id);
    return publicFile(file);
  }
  function get(actor, id) {
    const file = db.prepare('SELECT * FROM files WHERE id=? AND deleted_at IS NULL').get(id);
    if (!file || file.owner_id !== actor.profile.id && !reference(file, actor)) throw new Error('File not found or not shared with this account.');
    if (!/^[a-f0-9-]+\.bin$/.test(file.storage_key)) throw new Error('Invalid stored file reference.');
    if (inline) {
      const stored = db.prepare('SELECT bytes FROM file_contents WHERE storage_key=?').get(file.storage_key);
      if (!stored) throw new Error('The file is unavailable. Ask your college to restore its backup.');
      return {
        file: publicFile(file),
        bytes: Buffer.from(stored.bytes)
      };
    }
    const path = resolve(directory, file.storage_key);
    if (!existsSync(path)) throw new Error('The file is unavailable. Ask your college to restore its backup.');
    return {
      file: publicFile(file),
      path
    };
  }
  function validate(actor, ids, assignmentId) {
    if (!Array.isArray(ids) || ids.length > 8 || ids.some(id => typeof id !== 'string')) throw new Error('Attach no more than eight files.');
    for (const id of ids) {
      const file = db.prepare('SELECT * FROM files WHERE id=? AND deleted_at IS NULL').get(id);
      if (!file || file.owner_id !== actor.profile.id || file.college_id !== actor.profile.collegeId || assignmentId && file.context_id !== assignmentId) throw new Error('An attachment does not belong to this activity.');
    }
    return [...new Set(ids)];
  }
  function list(actor) {
    return db.prepare('SELECT * FROM files WHERE owner_id=? ORDER BY created_at DESC LIMIT 100').all(actor.profile.id).map(publicFile);
  }
  function trash(actor, id, restore = false) {
    const file = db.prepare('SELECT * FROM files WHERE id=? AND owner_id=?').get(id, actor.profile.id);
    if (!file) throw new Error('File not found.');
    if (!restore && reference(file, {
      profile: {
        ...actor.profile,
        role: 'admin'
      }
    })) throw new Error('Submitted or published files remain with their academic record.');
    db.prepare('UPDATE files SET deleted_at=? WHERE id=?').run(restore ? null : new Date().toISOString(), id);
    return {
      updated: true
    };
  }
  return {
    upload,
    get,
    validate,
    list,
    trash
  };
}
