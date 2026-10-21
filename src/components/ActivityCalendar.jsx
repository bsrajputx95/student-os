import React, { useMemo, useState } from 'react';
import { useStore, today } from '../lib/store.jsx';
export default function ActivityCalendar({
  compact = false
}) {
  const {
    state
  } = useStore();
  const current = Number(today().slice(0, 4));
  const [year, setYear] = useState(current),
    [hover, setHover] = useState(null);
  const {
    weeks,
    total,
    active
  } = useMemo(() => {
    const start = new Date(Date.UTC(year, 0, 1)),
      end = new Date(Date.UTC(year, 11, 31)),
      first = new Date(start);
    first.setUTCDate(1 - start.getUTCDay());
    const counts = new Map(state.activity.map(d => [d.date, d.count]));
    let total = 0,
      active = 0;
    const weeks = [];
    for (let w = 0; w < 54; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(first.getTime() + (w * 7 + d) * 86400000),
          key = date.toISOString().slice(0, 10),
          valid = date >= start && date <= end,
          future = key > today(),
          count = valid && !future ? counts.get(key) || 0 : 0;
        if (count) {
          total += count;
          active++;
        }
        days.push({
          key,
          count,
          valid,
          future,
          month: date.getUTCMonth(),
          day: date.getUTCDate()
        });
      }
      if (days.every(d => !d.valid)) break;
      weeks.push(days);
    }
    return {
      weeks,
      total,
      active
    };
  }, [state.activity, year]);
  return <div className="contribution-calendar"><div className="contribution-top"><div><strong>{total.toLocaleString()} contributions in {year}</strong><small>{active} active days · practice, learning & building</small></div><select aria-label="Contribution year" value={year} onChange={e => setYear(Number(e.target.value))}>{Array.from({
          length: current - Math.min(current, ...state.activity.filter(d => d.count > 0).map(d => Number(d.date.slice(0, 4)))) + 1
        }, (_, i) => current - i).map(y => <option key={y}>{y}</option>)}</select></div><div className="contribution-scroll"><div className="contribution-matrix"><div className="contribution-labels"><span /><small>Mon</small><small>Wed</small><small>Fri</small></div>{weeks.map((days, w) => <div className="contribution-week" key={w}><span className="contribution-month">{w === 0 || days.some(d => d.valid && d.day === 1) ? new Date(Date.UTC(year, (days.find(d => d.valid && d.day === 1) || days.find(d => d.valid)).month, 1)).toLocaleString('en', {
              month: 'short'
            }) : ''}</span>{days.map(d => <button key={d.key} disabled={!d.valid || d.future} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(d)} onBlur={() => setHover(null)} className={`contribution-cell level-${d.count === 0 ? 0 : d.count <= 2 ? 1 : d.count <= 5 ? 2 : d.count <= 9 ? 3 : 4} ${!d.valid ? 'outside' : ''} ${d.future ? 'future' : ''}`} title={`${d.count} contributions on ${d.key}`} aria-label={`${d.count} contributions on ${d.key}`} />)}</div>)}</div></div><div className="contribution-bottom"><span aria-live="polite">{hover ? `${hover.count} contributions · ${new Date(hover.key + 'T12:00:00').toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}` : state.profile.isDemo ? 'Practice activity · learning, building and showing up' : 'Complete your first task to start your streak'}</span><span>Less {[0, 1, 2, 3, 4].map(n => <i className={`contribution-cell level-${n}`} key={n} />)} More</span></div></div>;
}
