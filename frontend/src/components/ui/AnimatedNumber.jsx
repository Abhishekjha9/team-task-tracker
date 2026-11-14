import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/** Counts smoothly from the previous value to the new one (instant with reduced motion). */
export default function AnimatedNumber({ value, duration = 0.7, className = '' }) {
  const reduced = useReducedMotion();
  const numeric = typeof value === 'number' && Number.isFinite(value);
  const [display, setDisplay] = useState(numeric ? 0 : value);
  const from = useRef(0);

  useEffect(() => {
    if (!numeric) return undefined;
    if (reduced) {
      from.current = value;
      setDisplay(value);
      return undefined;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, numeric, reduced, duration]);

  return <span className={`tabular-nums ${className}`}>{numeric ? display : value}</span>;
}
