"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { cancelFrame, frame } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * App-wide smooth scroll. Lenis' RAF is driven by Framer Motion's frame loop
 * (autoRaf: false) so scroll-linked Motion animations stay in sync.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    function update(data: { timestamp: number }) {
      lenisRef.current?.lenis?.raf(data.timestamp);
    }
    frame.update(update, true);
    return () => cancelFrame(update);
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false, duration: 1.1, anchors: true }} ref={lenisRef}>
      {children}
    </ReactLenis>
  );
}
