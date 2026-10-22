import React from 'react';
import { Icon } from './ui.jsx';
const formats = [{
  id: 'coding',
  icon: 'Code2',
  label: 'Code & algorithms',
  detail: 'Patterns, problem solving and edge cases',
  image: 'code',
  accent: '#c6b6ff'
}, {
  id: 'assessments',
  icon: 'Braces',
  label: 'Production labs',
  detail: 'Debug a service. Query a database.',
  image: 'infrastructure',
  accent: '#97d4ff'
}, {
  id: 'quizzes',
  icon: 'Brain',
  label: 'Knowledge checks',
  detail: 'Find the gaps. Understand the answer.',
  image: 'analytics',
  accent: '#95e8d1'
}, {
  id: 'interview',
  icon: 'AudioLines',
  label: 'Interview studio',
  detail: 'Explain your thinking with Quid',
  image: 'code',
  accent: '#ffcf9f'
}];
export default function PracticeFormats({
  onSelect
}) {
  return <section className="practice-format-grid" aria-label="Choose a practice format">{formats.map(item => <button key={item.id} className={'practice-format-tile format-' + item.id} onClick={() => onSelect(item.id)} style={{
      '--format-accent': item.accent
    }}>
    <img src={`/learning/${item.image}-640.webp`} alt="" width="640" height="400" loading="lazy" decoding="async" onError={e => {
        e.currentTarget.style.visibility = 'hidden';
      }} />
    <span className="format-icon"><Icon name={item.icon} size={23} /></span><span className="format-content"><strong>{item.label}</strong><small>{item.detail}</small></span><Icon name="ArrowUpRight" size={17} />
  </button>)}</section>;
}
