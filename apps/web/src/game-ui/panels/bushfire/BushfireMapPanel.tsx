import { useCallback } from "react";
import type { BushfireMapPayload } from "@incident/shared";
import { CanvasFxLayer } from "../../../render/CanvasFxLayer";
import { drawFireField } from "../../../render/drawFireField";
import { drawSmoke } from "../../../render/drawSmoke";

interface BushfireMapPanelProps {
  payload: BushfireMapPayload;
  locked: boolean;
  onDeployCrew: (cellId: string) => void;
  onDropWater: (cellId: string) => void;
  onCreateFirebreak: (cellId: string) => void;
  onSetRoadblock: (cellId: string) => void;
}

export function BushfireMapPanel({
  payload,
  locked,
  onDeployCrew,
  onDropWater,
  onCreateFirebreak,
  onSetRoadblock,
}: BushfireMapPanelProps) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, now: number) => {
      ctx.clearRect(0, 0, width, height);
      drawFireField(ctx, payload.cells, width, height, now);
      drawSmoke(ctx, width, height, now, 100 - payload.containment + payload.anxiety * 0.4);
    },
    [payload.anxiety, payload.cells, payload.containment],
  );

  return (
    <section className="scene-panel bushfire-map-panel">
      <header>
        <h3>Town Map</h3>
        <p>
          Wind {payload.windDirection}/{payload.windStrength} | Containment {payload.containment}% | Anxiety {payload.anxiety}%
        </p>
      </header>

      <div className="map-stage">
        <svg viewBox="0 0 720 360" className="town-map-svg" aria-label="Bushfire map">
          {payload.cells.map((cell) => {
            const width = 220;
            const height = 100;
            const x = 20 + cell.x * 230;
            const y = 20 + cell.y * 110;
            return (
              <g key={cell.id}>
                <rect x={x} y={y} width={width} height={height} rx={12} className="map-zone" />
                <text x={x + 12} y={y + 22} className="zone-name">{cell.zoneName}</text>
                <text x={x + 12} y={y + 44} className="zone-meta">Fire {cell.fireLevel}%</text>
                <text x={x + 12} y={y + 62} className="zone-meta">Fuel {cell.fuel}%</text>
                <text x={x + 12} y={y + 80} className="zone-meta">Pop {cell.population}</text>
              </g>
            );
          })}
        </svg>
        <CanvasFxLayer className="map-fx" width={720} height={360} draw={draw} />
      </div>

      <div className="map-zone-controls">
        {payload.cells.map((cell) => (
          <article key={cell.id} className="zone-card">
            <h4>{cell.zoneName}</h4>
            <p>Fire {cell.fireLevel}% | {cell.evacuated ? "Evacuated" : "Occupied"}</p>
            <div>
              <button disabled={locked} onClick={() => onDeployCrew(cell.id)}>Crew</button>
              <button disabled={locked} onClick={() => onDropWater(cell.id)}>Water</button>
              <button disabled={locked} onClick={() => onCreateFirebreak(cell.id)}>Firebreak</button>
              <button disabled={locked} onClick={() => onSetRoadblock(cell.id)}>Roadblock</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
