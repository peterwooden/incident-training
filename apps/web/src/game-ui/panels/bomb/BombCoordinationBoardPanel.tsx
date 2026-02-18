import type { BombCoordinationBoardPayload } from "@incident/shared";

interface BombCoordinationBoardPanelProps {
  payload: BombCoordinationBoardPayload;
}

export function BombCoordinationBoardPanel({ payload }: BombCoordinationBoardPanelProps) {
  return (
    <section className="scene-panel coordination-board-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Coordination Board</h3>
        <div className="chip-strip">
          <span className="chip">loops {payload.recentMessages.length}</span>
          <span className="chip supporting">checkpoints {payload.checklist.length}</span>
        </div>
      </header>

      <div className="visual-stage coordination-stage">
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
      </div>
    </section>
  );
}
