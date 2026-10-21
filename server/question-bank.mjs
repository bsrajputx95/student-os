import { randomUUID } from 'node:crypto';
import { boundedText, integer, enumValue } from '../shared/validation.js';
export function validateQuestionBank(payload, author, existing) {
  if (!Array.isArray(payload.questions) || payload.questions.length < 1 || payload.questions.length > 100) throw new Error('Add between 1 and 100 questions.');
  const questions = payload.questions.map((q, index) => {
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) throw new Error(`Question ${index + 1} needs 2–6 choices.`);
    const options = q.options.map(option => boundedText(option, 1, 1000, 'Answer choice'));
    if (new Set(options).size !== options.length) throw new Error(`Question ${index + 1} has duplicate choices.`);
    return {
      text: boundedText(q.text, 5, 3000, 'Question'),
      options,
      correct: integer(q.correct, 0, options.length - 1, 'Correct answer index'),
      explanation: boundedText(q.explanation, 10, 2500, 'Answer explanation')
    };
  });
  return {
    id: existing?.id || 'custom-' + randomUUID(),
    version: (existing?.version || 0) + 1,
    title: boundedText(payload.title, 3, 140, 'Quiz title'),
    topic: enumValue(payload.topic, ['DSA', 'Frontend', 'Backend', 'Databases', 'DevOps', 'Communication', 'Aptitude'], 'quiz topic'),
    label: 'College question bank',
    difficulty: enumValue(payload.difficulty || 'Foundation', ['Foundation', 'Intermediate', 'Advanced'], 'difficulty'),
    questions,
    author: author.name,
    authorId: author.id,
    updatedAt: new Date().toISOString()
  };
}
