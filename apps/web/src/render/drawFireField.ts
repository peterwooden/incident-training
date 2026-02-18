import type { BushfireCell } from "@incident/shared";

export function drawFireField(
  ctx: CanvasRenderingContext2D,
  cells: BushfireCell[],
  width: number,
  height: number,
  time: number,
): void {
  const cols = 3;
  const rows = 3;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  for (const cell of cells) {
    const centerX = cell.x * cellWidth + cellWidth / 2;
    const centerY = cell.y * cellHeight + cellHeight / 2;
    const normalized = Math.max(0, Math.min(1, cell.fireLevel / 100));
    const pulse = 0.6 + Math.sin(time * 0.003 + cell.x + cell.y) * 0.12;
    const radius = Math.max(2, Math.min(cellWidth, cellHeight) * 0.36 * normalized * pulse + 4);

    if (normalized <= 0.02) {
      continue;
    }

    const gradient = ctx.createRadialGradient(centerX, centerY, 1, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(255,210,120,${0.55 * normalized})`);
    gradient.addColorStop(0.5, `rgba(255,120,70,${0.45 * normalized})`);
    gradient.addColorStop(1, "rgba(255,70,30,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
