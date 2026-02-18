import type { CSSProperties, ReactNode } from "react";

interface DepthParallaxGroupProps {
  className?: string;
  children: ReactNode;
  offsetX?: number;
  offsetY?: number;
  depth?: number;
}

export function DepthParallaxGroup({
  className,
  children,
  offsetX = 0,
  offsetY = 0,
  depth = 1,
}: DepthParallaxGroupProps) {
  const style = {
    transform: `translate3d(${offsetX * depth}px, ${offsetY * depth}px, 0)`,
  } as CSSProperties;

  return (
    <div className={`depth-parallax-group ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
