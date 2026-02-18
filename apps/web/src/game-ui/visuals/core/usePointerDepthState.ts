import { useMemo, useState } from "react";
import type { PointerEvent } from "react";

interface PointerDepth {
  x: number;
  y: number;
}

export function usePointerDepthState(multiplier = 12, enabled = false) {
  const [pointer, setPointer] = useState<PointerDepth>({ x: 0, y: 0 });

  const bind = useMemo(
    () => ({
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (!enabled) {
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const normX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        setPointer({ x: normX, y: normY });
      },
      onPointerLeave: () => {
        if (!enabled) {
          return;
        }
        setPointer({ x: 0, y: 0 });
      },
    }),
    [enabled],
  );

  return {
    pointer,
    offsetX: pointer.x * multiplier,
    offsetY: pointer.y * multiplier,
    bind,
  };
}
