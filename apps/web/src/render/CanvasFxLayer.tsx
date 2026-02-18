import { useEffect, useRef } from "react";

interface CanvasFxLayerProps {
  className?: string;
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number, now: number) => void;
}

export function CanvasFxLayer({ className, width, height, draw }: CanvasFxLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationFrame = 0;

    const tick = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        draw(ctx, width, height, now);
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [draw, height, width]);

  return <canvas ref={canvasRef} className={className} width={width} height={height} />;
}
