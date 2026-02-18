export function drawAlarmPulse(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  risk: number,
): void {
  const normalized = Math.max(0, Math.min(1, risk / 100));
  if (normalized <= 0.02) {
    return;
  }

  const baseRadius = Math.min(width, height) * 0.32;
  const pulse = (Math.sin(time * 0.008) + 1) / 2;
  const radius = baseRadius + pulse * 26;

  ctx.save();
  ctx.strokeStyle = `rgba(255,90,60,${0.15 + normalized * 0.35})`;
  ctx.lineWidth = 2 + normalized * 2;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
