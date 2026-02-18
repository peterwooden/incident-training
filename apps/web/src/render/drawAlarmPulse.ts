import type { FxProfile } from "@incident/shared";

interface DrawAlarmPulseOptions {
  fxProfile?: FxProfile;
  jitter?: number;
  glowBoost?: number;
}

export function drawAlarmPulse(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  risk: number,
  options?: DrawAlarmPulseOptions,
): void {
  const normalized = Math.max(0, Math.min(1, risk / 100));
  if (normalized <= 0.02) {
    return;
  }

  const fxProfile = options?.fxProfile ?? "cinematic";
  const baseRadius = Math.min(width, height) * 0.16;
  const pulse = (Math.sin(time * 0.008) + 1) / 2;
  const jitter = (options?.jitter ?? 0) * (fxProfile === "reduced" ? 4 : 16);
  const radius = baseRadius + pulse * (fxProfile === "reduced" ? 10 : 20) + jitter;

  ctx.save();
  ctx.strokeStyle = `rgba(255,90,60,${0.08 + normalized * 0.22})`;
  ctx.lineWidth = 2 + normalized * (fxProfile === "reduced" ? 1.2 : 3.1);
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (fxProfile === "cinematic") {
    const glow = Math.max(0.08, Math.min(0.7, options?.glowBoost ?? 0.4));
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, radius * 1.4);
    gradient.addColorStop(0, `rgba(255,110,74,${glow * 0.16})`);
    gradient.addColorStop(1, "rgba(255,60,40,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
