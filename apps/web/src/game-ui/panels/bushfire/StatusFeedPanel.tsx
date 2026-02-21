import type { StatusFeedPayload } from "@incident/shared";

interface StatusFeedPanelProps {
  payload: StatusFeedPayload;
}

export function StatusFeedPanel({ payload }: StatusFeedPanelProps) {
  return (
    <section className="scene-widget status-feed-panel">
      <header className="widget-chip-row">
        <h3>Status Feed</h3>
        <div className="chip-strip">
          <span className="chip supporting">{payload.readOnly ? "read-only" : "live"}</span>
          <span className="chip">entries {payload.entries.length}</span>
        </div>
      </header>
      <div className="timeline-chip-lane">
        {payload.entries.slice().reverse().map((entry) => (
          <span key={entry.id} className={`timeline-chip ${entry.kind === "system" ? "inject" : "status"}`}>
            {new Date(entry.atEpochMs).toLocaleTimeString()} {entry.authorName}: {entry.message}
          </span>
        ))}
      </div>
      <div className="listener-feed">
        {payload.listenerReactions.slice(-4).map((reaction) => (
          <p key={reaction.id} className={`listener-entry sentiment-${reaction.sentiment}`}>
            {reaction.text}
          </p>
        ))}
      </div>
    </section>
  );
}
