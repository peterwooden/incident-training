import type { CSSProperties } from "react";

interface RimLightProps {
  color?: string;
  intensity?: number;
  className?: string;
}

export function RimLight({ color = "#89b8ff", intensity = 0.38, className }: RimLightProps) {
  const style = {
    "--rim-color": color,
    "--rim-intensity": Math.max(0.05, Math.min(1, intensity)),
  } as CSSProperties;

  return <div className={`rim-light ${className ?? ""}`} style={style} aria-hidden="true" />;
}
