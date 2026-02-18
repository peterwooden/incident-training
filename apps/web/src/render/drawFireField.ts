import type { BushfireCell, FireFrontContour, WindSample, FxProfile } from "@incident/shared";

interface DrawFireFieldOptions {
  fxProfile?: FxProfile;
  windField?: WindSample[];
  fireContours?: FireFrontContour[];
  canopyPulse?: number;
}

export function drawFireField(
  ctx: CanvasRenderingContext2D,
  cells: BushfireCell[],
  width: number,
  height: number,
  time: number,
  options?: DrawFireFieldOptions,
): void {
  const cols = 3;
  const rows = 3;
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const fxProfile = options?.fxProfile ?? "cinematic";
  const contourBoost = fxProfile === "reduced" ? 0.45 : 1;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Canopy shimmer gives the map a living landscape feel even when inputs are idle.
  const canopy = options?.canopyPulse ?? 0.5;
  ctx.fillStyle = `rgba(128, 208, 118, ${fxProfile === "reduced" ? 0.03 : 0.06 + canopy * 0.05})`;
  ctx.fillRect(0, 0, width, height);

  for (const cell of cells) {
    const centerX = cell.x * cellWidth + cellWidth / 2;
    const centerY = cell.y * cellHeight + cellHeight / 2;
    const normalized = Math.max(0, Math.min(1, cell.fireLevel / 100));
    const pulse = 0.6 + Math.sin(time * 0.003 + cell.x + cell.y) * (fxProfile === "reduced" ? 0.06 : 0.18);
    const radius = Math.max(2, Math.min(cellWidth, cellHeight) * 0.36 * normalized * pulse + 4);

    if (normalized <= 0.02) {
      continue;
    }

    const gradient = ctx.createRadialGradient(centerX, centerY, 1, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(255,220,140,${0.45 * normalized})`);
    gradient.addColorStop(0.4, `rgba(255,124,72,${0.46 * normalized})`);
    gradient.addColorStop(0.8, `rgba(205,44,16,${0.24 * normalized})`);
    gradient.addColorStop(1, "rgba(255,70,30,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    if (fxProfile === "cinematic") {
      const embers = 2 + Math.floor(normalized * 5);
      for (let i = 0; i < embers; i += 1) {
        const jitter = i * 13 + centerX + centerY;
        const ex = centerX + Math.sin(time * 0.002 + jitter) * (radius + i * 2);
        const ey = centerY + Math.cos(time * 0.0028 + jitter) * (radius * 0.7 + i * 2);
        ctx.fillStyle = `rgba(255, ${150 + i * 10}, 90, ${0.25 + normalized * 0.25})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 1.2 + normalized * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (options?.fireContours?.length) {
    ctx.save();
    ctx.lineWidth = fxProfile === "reduced" ? 1.5 : 2.3;
    ctx.setLineDash([6, 8]);

    for (const contour of options.fireContours) {
      if (contour.points.length < 2) {
        continue;
      }

      ctx.strokeStyle = `rgba(255, 166, 104, ${Math.min(0.9, 0.16 + contour.intensity * 0.5) * contourBoost})`;
      ctx.lineDashOffset = -((time * 0.02 + contour.phase * 18) % 64);
      ctx.beginPath();
      ctx.moveTo(contour.points[0].x, contour.points[0].y);
      for (let i = 1; i < contour.points.length; i += 1) {
        ctx.lineTo(contour.points[i].x, contour.points[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  if (options?.windField?.length && fxProfile === "cinematic") {
    ctx.save();
    ctx.strokeStyle = "rgba(214, 244, 232, 0.18)";
    ctx.lineWidth = 1;
    for (const sample of options.windField) {
      const len = 8 + sample.strength * 9;
      ctx.beginPath();
      ctx.moveTo(sample.x, sample.y);
      ctx.lineTo(sample.x + sample.dx * len, sample.y + sample.dy * len);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}
