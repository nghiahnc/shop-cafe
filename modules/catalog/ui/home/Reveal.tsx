'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Home.module.css';

export default function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!element || motion.matches || !('IntersectionObserver' in window)) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;
    element.dataset.reveal = 'pending';
    const show = () => { delete element.dataset.reveal; };
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { show(); observer.disconnect(); } }, { threshold: 0.08 });
    observer.observe(element);
    motion.addEventListener('change', show);
    return () => { observer.disconnect(); motion.removeEventListener('change', show); };
  }, []);
  return <div ref={ref} className={`${styles.reveal} ${className}`}>{children}</div>;
}
