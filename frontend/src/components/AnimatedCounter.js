"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `value` on mount / value change.
 * Uses requestAnimationFrame for smooth 60fps counting.
 */
export default function AnimatedCounter({
  value,
  duration = 1200,
  formatter,
  className = "",
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef({ start: null, from: 0 });

  useEffect(() => {
    const target = Number(value) || 0;
    const from = ref.current.from;

    let raf;
    const animate = (timestamp) => {
      if (!ref.current.start) ref.current.start = timestamp;
      const elapsed = timestamp - ref.current.start;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;

      setDisplay(current);

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        ref.current.from = target;
        ref.current.start = null;
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted = formatter ? formatter(display) : Math.round(display).toLocaleString("en-IN");

  return <span className={className}>{formatted}</span>;
}
