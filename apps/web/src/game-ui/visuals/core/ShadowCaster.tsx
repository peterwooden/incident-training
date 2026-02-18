import type { CSSProperties } from "react";

interface ShadowCasterProps {
  blurPx?: number;
  opacity?: number;
  offsetY?: number;
  className?: string;
}

export function ShadowCaster({ blurPx = 18, opacity = 0.42, offsetY = 8, className }: ShadowCasterProps) {
  const style = {
    "--shadow-blur": `${blurPx}px`,
    "--shadow-opacity": opacity,
    "--shadow-offset-y": `${offsetY}px`,
  } as CSSProperties;

  return <div className={`shadow-caster ${className ?? ""}`} style={style} aria-hidden="true" />;
}
