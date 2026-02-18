import type { CSSProperties, ReactNode } from "react";

interface LayeredSceneProps {
  className?: string;
  children: ReactNode;
  depthPx?: number;
  perspectivePx?: number;
  animated?: boolean;
}

export function LayeredScene({
  className,
  children,
  depthPx = 10,
  perspectivePx = 840,
  animated = true,
}: LayeredSceneProps) {
  const style: CSSProperties = {
    "--scene-depth": `${depthPx}px`,
    "--scene-perspective": `${perspectivePx}px`,
  } as CSSProperties;

  return (
    <div className={`layered-scene ${animated ? "animated" : ""} ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
