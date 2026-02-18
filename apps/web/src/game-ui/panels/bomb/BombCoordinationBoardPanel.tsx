import type { BombCoordinationBoardPayload } from "@incident/shared";
import { LayeredScene, RimLight, ShadowCaster, SpecularOverlay, useAmbientMotionClock } from "../../visuals/core";

interface BombCoordinationBoardPanelProps {
  payload: BombCoordinationBoardPayload;
}

export function BombCoordinationBoardPanel({ payload }: BombCoordinationBoardPanelProps) {
  const { pulse } = useAmbientMotionClock({ loopMs: 2400, paused: false });

  return (
    <section className="scene-panel coordination-board-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Coordination Board</h3>
        <div className="chip-strip">
          <span className="chip">loops {payload.recentMessages.length}</span>
          <span className="chip supporting">checkpoints {payload.checklist.length}</span>
        </div>
      </header>

      <LayeredScene className="visual-stage coordination-stage cinematic-depth" depthPx={4} perspectivePx={760}>
        <ShadowCaster blurPx={18} opacity={0.35} offsetY={7} />
        <RimLight color="#9ab9ee" intensity={0.2 + pulse * 0.08} />
        <SpecularOverlay intensity={0.18} angleDeg={-12} />

        <div className="coord-lanes" role="img" aria-label="Command confirmation lanes">
          {payload.checklist.map((item, index) => (
            <article key={item.id} className={`coord-card ${item.completed ? "complete" : "pending"}`}>
              <span className="coord-index">{index + 1}</span>
              <span className="coord-dot" />
              <p>{item.label}</p>
            </article>
          ))}
        </div>

        <div className="confirmation-trail" aria-label="Recent confirmations">
          {payload.recentMessages.slice(-6).map((entry, idx) => (
            <div key={`${entry.message}-${idx}`} className="trail-chip">
              <span>{new Date(entry.atEpochMs).toLocaleTimeString()}</span>
              <span>{entry.message}</span>
            </div>
          ))}
        </div>
      </LayeredScene>
    </section>
  );
}
