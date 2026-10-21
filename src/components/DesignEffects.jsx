import React, { useEffect, useRef, useState } from 'react';
export function CountUp({
  value,
  suffix = ''
}) {
  const [shown, setShown] = useState(value),
    node = useRef(null);
  useEffect(() => {
    if (!Number.isFinite(value) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let frame, observer;
    const run = () => {
      const start = performance.now();
      const tick = now => {
        const t = Math.min(1, (now - start) / 950);
        setShown(Math.round(value * (1 - Math.pow(1 - t, 4))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    if (window.IntersectionObserver) {
      observer = new window.IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          run();
        }
      }, {
        threshold: .25
      });
      observer.observe(node.current);
    } else run();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [value]);
  return <span ref={node} className="so-count"><span aria-hidden="true">{shown.toLocaleString()}{suffix}</span><span className="sr-only">{value.toLocaleString()}{suffix}</span></span>;
}
export function PageMotion({
  route
}) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.IntersectionObserver) return;
    const root = document.querySelector('.main-content, .staff-content');
    if (!root) return;
    const seen = new Set();
    const observer = new window.IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('so-in-view');
        observer.unobserve(entry.target);
      }
    }), {
      threshold: .05,
      rootMargin: '0px 0px 50px 0px'
    });
    const scan = () => root.querySelectorAll('.so-section, .card, .page-head, .staff-page-head').forEach((el, i) => {
      if (seen.has(el) || el.parentElement.closest('.card, .so-section')) return;
      seen.add(el);
      el.classList.add('so-reveal');
      el.style.setProperty('--reveal-delay', i % 3 * 45 + 'ms');
      observer.observe(el);
    });
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(root, {
      childList: true,
      subtree: true
    });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      seen.forEach(el => el.classList.remove('so-reveal', 'so-in-view'));
    };
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
