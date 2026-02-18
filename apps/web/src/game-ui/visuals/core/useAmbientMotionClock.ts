import { useEffect, useState } from "react";

interface AmbientClockOptions {
  loopMs?: number;
  paused?: boolean;
}

export function useAmbientMotionClock(options?: AmbientClockOptions) {
  const loopMs = options?.loopMs ?? 2000;
  const paused = options?.paused ?? false;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (paused) {
      return;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const next = (elapsed % loopMs) / loopMs;
      setPhase(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loopMs, paused]);

  return {
    phase,
    pulse: 0.5 + Math.sin(phase * Math.PI * 2) * 0.5,
    wave: Math.sin(phase * Math.PI * 2),
  };
}
