import type { FxProfile, WindSample } from "@incident/shared";

interface DrawSmokeOptions {
  fxProfile?: FxProfile;
  windField?: WindSample[];
}

export function drawSmoke(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intensity: number,
  options?: DrawSmokeOptions,
): void {
  const fxProfile = options?.fxProfile ?? "cinematic";
  const particles = fxProfile === "reduced" ? Math.max(4, Math.floor(intensity / 14)) : Math.max(10, Math.floor(intensity / 5));

  const windBias = options?.windField?.length
    ? options.windField.reduce((acc, item) => acc + item.dx, 0) / options.windField.length
    : 0;

  ctx.save();
  for (let i = 0; i < particles; i += 1) {
    const drift = ((time * (0.028 + windBias * 0.01) + i * 47) % (width + 140)) - 70;
    const wave = Math.sin(time * 0.001 + i) * (fxProfile === "reduced" ? 14 : 30);
    const y = (i / particles) * height + wave;
    const size = (fxProfile === "reduced" ? 18 : 24) + (i % 5) * (fxProfile === "reduced" ? 5 : 11);

    const gradient = ctx.createRadialGradient(drift, y, 1, drift, y, size);
    gradient.addColorStop(0, `rgba(146,150,154,${0.18 + intensity / 800})`);
    gradient.addColorStop(1, "rgba(34,36,41,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(drift, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  if (fxProfile === "cinematic") {
    ctx.fillStyle = "rgba(42, 43, 48, 0.12)";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}
