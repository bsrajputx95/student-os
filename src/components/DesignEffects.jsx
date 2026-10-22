import React, { useEffect, useRef } from 'react';
export function CountUp({
  value,
  suffix = ''
}) {
  return <span className="so-count">{value.toLocaleString()}{suffix}</span>;
}
export function PageMotion({
  route
}) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.querySelector('.main-content, .staff-content');
    const animation = root?.animate([{
      opacity: .92,
      transform: 'translateY(4px)'
    }, {
      opacity: 1,
      transform: 'translateY(0)'
    }], {
      duration: 180,
      easing: 'ease-out'
    });
    return () => animation?.cancel();
  }, [route]);
  return null;
}
export function PointerSurface({
  className = '',
  children,
  ...props
}) {
  const ref = useRef(null),
    frame = useRef(null);
  function move(e) {
    if (e.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = e.currentTarget.getBoundingClientRect(),
      x = (e.clientX - box.left) / box.width,
      y = (e.clientY - box.top) / box.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      ref.current?.style.setProperty('--pointer-x', x * 100 + '%');
      ref.current?.style.setProperty('--pointer-y', y * 100 + '%');
      ref.current?.style.setProperty('--tilt-x', y * 5 - 2.5 + 'deg');
      ref.current?.style.setProperty('--tilt-y', 2.5 - x * 5 + 'deg');
    });
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return <section ref={ref} className={className} onPointerMove={move} onPointerLeave={() => {
    ref.current?.style.setProperty('--tilt-x', '0deg');
    ref.current?.style.setProperty('--tilt-y', '0deg');
  }} {...props}>{children}</section>;
}
export function OrbitScene({
  scores = {},
  total,
  variant = 'student'
}) {
  const names = Object.keys(scores).slice(0, 2);
  return <div className={'so-orbit-scene so-orbit-' + variant} aria-hidden="true"><div className="so-orbit-grid" /><div className="so-orbit-glow" /><div className="so-orbit-system"><div className="so-orbit-ring ring-a" /><div className="so-orbit-ring ring-b" /><div className="so-orbit-ring ring-c" /><div className="so-orbit-core"><span>s<sup>✦</sup></span><div className="so-sphere-shine" /></div><span className="so-orbit-satellite satellite-a" /><span className="so-orbit-satellite satellite-b" /><span className="so-orbit-satellite satellite-c" /></div><div className="so-orbit-label orbit-label-a"><i /><span>{variant === 'college' ? 'Connected learners' : names[0] || 'Your preparation'}<strong>{variant === 'college' ? total?.toLocaleString() || '0' : (scores[names[0]] ?? 0) + '/100'}</strong></span></div><div className="so-orbit-label orbit-label-b"><span className="so-mini-bars"><i /><i /><i /><i /></span><span>{variant === 'college' ? 'Campus readiness' : names[1] || 'Build momentum'}<strong>{(variant === 'college' ? total === 0 ? 0 : scores.readiness || 0 : scores[names[1]] || 0) + '/100'}</strong></span></div><span className="so-orbit-star star-a">✦</span><span className="so-orbit-star star-b">+</span><span className="so-orbit-star star-c">✦</span></div>;
}
export function Sparkline({
  values = [],
  className = ''
}) {
  if (!values.length) return null;
  const max = Math.max(...values, 1),
    min = Math.min(...values, 0);
  const points = values.map((v, i) => `${i / Math.max(1, values.length - 1) * 120},${35 - (v - min) / Math.max(1, max - min) * 28}`).join(' ');
  return <svg className={'so-sparkline ' + className} viewBox="0 0 120 40" fill="none" aria-hidden="true"><polyline points={points} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
}
