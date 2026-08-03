'use client';

import {useEffect, useRef} from 'react';

// Scroll-reveal wrapper: children fade+rise in when they enter the viewport.
// Falls back to visible (no JS = no hidden content).
export default function Reveal({children, delay = 0, className = ''}: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    el.classList.add('reveal');
    el.style.transitionDelay = `${delay}ms`;
    // Already in view at mount (above the fold, anchor jump, IO edge cases):
    // reveal immediately rather than waiting on an observer callback.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      requestAnimationFrame(() => el.classList.add('reveal-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { el.classList.add('reveal-in'); io.disconnect(); }
      }),
      {threshold: 0.15},
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}
