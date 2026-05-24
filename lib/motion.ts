// lib/motion.ts
import { useEffect, useState } from "react";
export const MOTION = {
  dur: { fast: 0.15, base: 0.22, slow: 0.32 },
  spring: { type: "spring" as const, stiffness: 260, damping: 26 },
  stagger: 0.04,
};

export function nodeEnter(reduced: boolean) {
  if (reduced)
    return { initial: { scale: 1, opacity: 1 }, animate: { scale: 1, opacity: 1 }, transition: { duration: 0 } };
  return {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: MOTION.spring,
  };
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
