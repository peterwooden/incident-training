import type { DebriefReplayPayload } from "@incident/shared";

interface DebriefReplayPanelProps {
  payload: DebriefReplayPayload;
  index: number;
  onIndexChange: (index: number) => void;
}

export function DebriefReplayPanel({ payload, index, onIndexChange }: DebriefReplayPanelProps) {
  const bounded = Math.max(0, Math.min(index, Math.max(0, payload.events.length - 1)));
  const event = payload.events[bounded];
  const maxPressure = Math.max(1, ...payload.events.map((entry) => entry.pressure));

  return (
    <section className="scene-widget debrief-panel visual-heavy">
      <header className="widget-chip-row">
        <h3>Debrief Replay</h3>
        <div className="chip-strip">
          <span className="chip">Exec {payload.metrics.executionAccuracy}%</span>
          <span className="chip">Timing {payload.metrics.timingDiscipline}%</span>
          <span className="chip">Comms {payload.metrics.communicationDiscipline}%</span>
          <span className="chip warning">Overall {payload.metrics.overall}%</span>
        </div>
      </header>

      <div className="visual-stage debrief-stage">
        <svg viewBox="0 0 720 132" className="geometry-layer" preserveAspectRatio="xMidYMid meet" aria-label="Debrief pressure timeline">
          <polyline points="18,108 700,108" className="debrief-axis" />
          {payload.events.map((entry, idx) => {
            const x = 24 + (idx / Math.max(1, payload.events.length - 1)) * 670;
            const y = 100 - (entry.pressure / maxPressure) * 70;
            const active = idx === bounded;
            return (
              <g key={entry.id} className={`debrief-node ${active ? "active" : ""}`}>
                <line x1={x} y1={108} x2={x} y2={y} className="debrief-stem" />
                <circle cx={x} cy={y} r={active ? 7 : 4} className="debrief-dot" />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="debrief-metric-bars" aria-label="Debrief metric bars">
        <div className="debrief-metric execution">
          <span style={{ width: `${payload.metrics.executionAccuracy}%` }} />
        </div>
        <div className="debrief-metric timing">
          <span style={{ width: `${payload.metrics.timingDiscipline}%` }} />
        </div>
        <div className="debrief-metric comms">
          <span style={{ width: `${payload.metrics.communicationDiscipline}%` }} />
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(0, payload.events.length - 1)}
        value={bounded}
        onChange={(eventInput) => onIndexChange(Number(eventInput.target.value))}
      />

      {event ? (
        <article className="debrief-event">
          <p className="debrief-event-time">{new Date(event.atEpochMs).toLocaleTimeString()}</p>
          <p className="debrief-event-type">{event.type}</p>
          <p>{event.message}</p>
          <p className="debrief-event-stats">Score {event.score} | Pressure {event.pressure}</p>
        </article>
      ) : (
        <p>No debrief events recorded yet.</p>
      )}
    </section>
  );
}
