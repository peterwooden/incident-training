import type { DebriefReplayPayload } from "@incident/shared";

interface DebriefReplayPanelProps {
  payload: DebriefReplayPayload;
  index: number;
  onIndexChange: (index: number) => void;
}

export function DebriefReplayPanel({ payload, index, onIndexChange }: DebriefReplayPanelProps) {
  const bounded = Math.max(0, Math.min(index, Math.max(0, payload.events.length - 1)));
  const event = payload.events[bounded];

  return (
    <section className="scene-panel debrief-panel">
      <header>
        <h3>Debrief Replay</h3>
        <p>Execution {payload.metrics.executionAccuracy}% | Timing {payload.metrics.timingDiscipline}% | Comms {payload.metrics.communicationDiscipline}% | Overall {payload.metrics.overall}%</p>
      </header>

      <input
        type="range"
        min={0}
        max={Math.max(0, payload.events.length - 1)}
        value={bounded}
        onChange={(eventInput) => onIndexChange(Number(eventInput.target.value))}
      />

      {event ? (
        <article className="debrief-event">
          <p>{new Date(event.atEpochMs).toLocaleTimeString()}</p>
          <p>{event.type}</p>
          <p>{event.message}</p>
          <p>Score {event.score} | Pressure {event.pressure}</p>
        </article>
      ) : (
        <p>No debrief events recorded yet.</p>
      )}
    </section>
  );
}
