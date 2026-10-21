import { randomUUID } from 'node:crypto';
import { quidReply } from './quid.mjs';
import { curriculum } from '../shared/curriculum.js';
import { studentKnowledge } from './quid-context.mjs';
import { object } from '../shared/validation.js';
import { planAcademicQuery } from './quid-analysis.mjs';
export function createQuidHistory({
  read,
  save,
  staffContext,
  reply = quidReply,
  plan = planAcademicQuery
}) {
  const locks = new Set();
  async function action(id, p) {
    object(p, 'Quid request');
    if (p.clear !== undefined && typeof p.clear !== 'boolean') throw new Error('Clear must be true or false.');
    if (locks.has(id)) throw new Error('Quid is still preparing your previous answer.');
    locks.add(id);
    try {
      const state = read(id);
      if (p.clear) {
        state.quidMessages = [];
        state.version++;
        save(state);
        return {
          messages: []
        };
      }
      const message = String(p.message || '').trim().slice(0, 2000);
      if (!message) throw new Error('Ask Quid a question.');
      const staff = state.profile.role !== 'student';
      const queryPlan = staff ? await plan(message) : null;
      const lesson = Object.values(curriculum).flat().find(l => l.title === p.topic),
        grounding = {
          ...(staff ? staffContext?.(state, {
            message,
            studentId: p.studentId,
            plan: queryPlan
          }) || {} : studentKnowledge(state, message)),
          ...(lesson ? {
            lesson: {
              title: lesson.title,
              reading: lesson.reading,
              example: lesson.example,
              sourceUrl: lesson.sourceUrl
            }
          } : {})
        };
      const result = await reply({
        message,
        page: p.page,
        grounding,
        history: (state.quidMessages || []).filter(m => !staff || m.contextId === (grounding.studentId || 'college'))
      }, state);
      const fresh = read(id);
      fresh.quidMessages = [...(fresh.quidMessages || []), {
        id: randomUUID(),
        role: 'you',
        contextId: staff ? grounding.studentId || 'college' : 'self',
        text: message,
        time: new Date().toISOString()
      }, {
        id: randomUUID(),
        role: 'quid',
        contextId: staff ? grounding.studentId || 'college' : 'self',
        ...result,
        time: new Date().toISOString()
      }].slice(-80);
      fresh.version++;
      save(fresh);
      return {
        ...result,
        messages: fresh.quidMessages
      };
    } finally {
      locks.delete(id);
    }
  }
  return {
    action
  };
}
