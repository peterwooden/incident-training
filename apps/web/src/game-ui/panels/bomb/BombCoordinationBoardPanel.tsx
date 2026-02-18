import type { BombCoordinationBoardPayload } from "@incident/shared";

interface BombCoordinationBoardPanelProps {
  payload: BombCoordinationBoardPayload;
}

export function BombCoordinationBoardPanel({ payload }: BombCoordinationBoardPanelProps) {
  return (
    <section className="scene-panel coordination-board-panel">
      <header>
        <h3>Coordination Board</h3>
        <p>Use strict call-and-confirm loops in Slack.</p>
      </header>
      <h4>Checklist</h4>
      <ul>
        {payload.checklist.map((item) => (
          <li key={item.id}>{item.completed ? "[done]" : "[todo]"} {item.label}</li>
        ))}
      </ul>
      <h4>Recent Confirmations</h4>
      <ul>
        {payload.recentMessages.slice(-6).map((entry, idx) => (
          <li key={`${entry.message}-${idx}`}>
            {new Date(entry.atEpochMs).toLocaleTimeString()} {entry.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
