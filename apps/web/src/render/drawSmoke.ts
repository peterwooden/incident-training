export function drawSmoke(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intensity: number,
): void {
  const particles = Math.max(6, Math.floor(intensity / 8));

  ctx.save();
  for (let i = 0; i < particles; i += 1) {
    const drift = (time * 0.03 + i * 47) % (width + 140) - 70;
    const wave = Math.sin(time * 0.001 + i) * 28;
    const y = (i / particles) * height + wave;
    const size = 26 + (i % 5) * 10;

    const gradient = ctx.createRadialGradient(drift, y, 1, drift, y, size);
    gradient.addColorStop(0, `rgba(130,140,150,${0.16 + intensity / 900})`);
    gradient.addColorStop(1, "rgba(45,48,56,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(drift, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
