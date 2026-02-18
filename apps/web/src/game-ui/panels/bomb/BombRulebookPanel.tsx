import { useMemo, useState } from "react";
import type { BombRulebookPayload, ManualHotspot } from "@incident/shared";

interface BombRulebookPanelProps {
  payload: BombRulebookPayload;
  currentPage: number;
  onChangePage: (index: number) => void;
}

export function BombRulebookPanel({ payload, currentPage, onChangePage }: BombRulebookPanelProps) {
  const safeIndex = Math.max(0, Math.min(currentPage, payload.spreads.length - 1));
  const spread = payload.spreads[safeIndex];
  const [activeHotspot, setActiveHotspot] = useState<ManualHotspot | undefined>(undefined);

  const pageLabel = useMemo(() => `${safeIndex + 1}/${payload.spreads.length}`, [safeIndex, payload.spreads.length]);

  if (!spread) {
    return null;
  }

  return (
    <section className="scene-panel bomb-rulebook-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Manual Flipbook</h3>
        <div className="chip-strip">
          <span className="chip">{pageLabel}</span>
          <span className="chip supporting">hotspots {spread.hotspots.length}</span>
        </div>
      </header>

      <div className="visual-stage rulebook-stage">
        <svg viewBox="0 0 760 360" className="geometry-layer" aria-label="Illustrated manual page">
          <rect x={14} y={14} width={732} height={332} rx={18} className="manual-page" />
          <text x={38} y={52} className="manual-title">{spread.title}</text>

          {spread.diagramAssets.map((asset) => (
            <polyline
              key={asset.id}
              points={asset.points.map((point) => `${point.x},${point.y}`).join(" ")}
              className={`manual-diagram ${asset.type}`}
            />
          ))}

          {spread.calloutPins.map((pin) => (
            <g key={pin.id} className="manual-pin">
              <circle cx={pin.x} cy={pin.y} r={10} />
              <line x1={pin.x} y1={pin.y} x2={pin.x - 30} y2={pin.y + 22} />
            </g>
          ))}
        </svg>

        <svg viewBox="0 0 760 360" className="interaction-layer" aria-hidden="true">
          {spread.hotspots.map((spot) => (
            <rect
              key={spot.id}
              x={spot.x}
              y={spot.y}
              width={spot.width}
              height={spot.height}
              rx={8}
              className="manual-hotspot"
              onPointerDown={() => setActiveHotspot(spot)}
            />
          ))}
        </svg>
      </div>

      <div className="rulebook-controls">
        <button className="icon-btn" onClick={() => onChangePage(Math.max(0, safeIndex - 1))} disabled={safeIndex === 0}>
          ◀
        </button>
        <button
          className="icon-btn"
          onClick={() => onChangePage(Math.min(payload.spreads.length - 1, safeIndex + 1))}
          disabled={safeIndex >= payload.spreads.length - 1}
        >
          ▶
        </button>
      </div>

      {activeHotspot && (
        <div className="hotspot-detail" role="status">
          <strong>{activeHotspot.label}</strong>
          <span>{activeHotspot.detail}</span>
        </div>
      )}
    </section>
  );
}
