import type { CSSProperties } from "react";

interface SpecularOverlayProps {
  intensity?: number;
  angleDeg?: number;
  className?: string;
}

export function SpecularOverlay({ intensity = 0.45, angleDeg = -18, className }: SpecularOverlayProps) {
  const style = {
    "--spec-intensity": Math.max(0.05, Math.min(1, intensity)),
    "--spec-angle": `${angleDeg}deg`,
  } as CSSProperties;

  return <div className={`specular-overlay ${className ?? ""}`} style={style} aria-hidden="true" />;
}
