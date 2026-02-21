import type { BombCoordinationBoardPayload } from "@incident/shared";
import { LayeredScene, RimLight, ShadowCaster, SpecularOverlay, useAmbientMotionClock } from "../../visuals/core";

interface BombCoordinationBoardPanelProps {
  payload: BombCoordinationBoardPayload;
}

export function BombCoordinationBoardPanel({ payload }: BombCoordinationBoardPanelProps) {
  const { pulse } = useAmbientMotionClock({ loopMs: 2400, paused: false });

  return (
    <section className="scene-widget coordination-board-panel visual-heavy">
      <header className="widget-chip-row">
        <h3>Coordination Board</h3>
        <div className="chip-strip">
          <span className="chip">{payload.stageId}</span>
          <span className="chip">loops {payload.recentMessages.length}</span>
          <span className="chip supporting">checkpoints {payload.checklist.length}</span>
        </div>
      </header>

      <p className="widget-annotation">{payload.currentDirective}</p>

      <LayeredScene className="visual-stage coordination-stage cinematic-depth" depthPx={4} perspectivePx={760}>
        <ShadowCaster blurPx={18} opacity={0.35} offsetY={7} />
        <RimLight color="#9ab9ee" intensity={0.2 + pulse * 0.08} />
        <SpecularOverlay intensity={0.18} angleDeg={-12} />

        <svg viewBox="0 0 740 164" className="geometry-layer coord-geometry" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Command confirmation lanes">
          <polyline points="34,84 186,84 338,84 490,84 706,84" className="coord-spine" />
          {payload.checklist.map((item, index) => {
            const x = 56 + index * 220;
            return (
              <g key={item.id} className={`coord-node ${item.completed ? "complete" : "pending"}`}>
                <circle cx={x} cy={84} r={20} className="coord-node-shell" />
                <circle cx={x} cy={84} r={9 + pulse * 0.8} className="coord-node-core" />
                <text x={x} y={88} textAnchor="middle" className="coord-node-index">{index + 1}</text>
                <rect x={x - 62} y={112} width={124} height={34} rx={10} className="coord-node-label-bg" />
                <text x={x} y={133} textAnchor="middle" className="coord-node-label">
                  {item.label.slice(0, 20)}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="confirmation-trail" aria-label="Recent confirmations">
          {payload.recentMessages.slice(-6).map((entry, idx) => (
            <div key={`${entry.message}-${idx}`} className="trail-chip">
              <span>{new Date(entry.atEpochMs).toLocaleTimeString()}</span>
              <span>{entry.message}</span>
            </div>
          ))}
        </div>
      </LayeredScene>

      <div className="stage-rail" aria-label="Stage progression">
        {payload.stageRail.map((stage) => (
          <span
            key={stage.stageId}
            className={`stage-pill ${stage.completed ? "complete" : ""} ${stage.active ? "active" : ""}`}
          >
            {stage.label}
          </span>
        ))}
      </div>
    </section>
  );
}
