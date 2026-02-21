import type { FsmEditorPayload } from "@incident/shared";

interface GmFsmPanelProps {
  payload: FsmEditorPayload;
  locked: boolean;
  onTransition: (transitionId: string) => Promise<void>;
}

export function GmFsmPanel({ payload, locked, onTransition }: GmFsmPanelProps) {
  const nodesById = new Map(payload.nodes.map((node) => [node.id, node]));

  return (
    <section className="scene-widget gm-fsm-panel visual-heavy">
      <header className="widget-chip-row">
        <h3>FSM Editor</h3>
        <div className="chip-strip">
          <span className="chip">{payload.mode}</span>
          <span className="chip supporting">nodes {payload.nodes.length}</span>
          <span className="chip warning">edges {payload.transitions.length}</span>
        </div>
      </header>

      <div className="visual-stage fsm-stage">
        <svg viewBox="0 0 760 280" className="geometry-layer" aria-label="Finite state machine graph">
          <rect x={14} y={14} width={732} height={252} rx={16} className="fsm-surface" />

          {payload.transitions.map((transition) => {
            const from = nodesById.get(transition.fromNodeId);
            const to = nodesById.get(transition.toNodeId);
            if (!from || !to) {
              return null;
            }
            const x1 = 44 + from.x * 680;
            const y1 = 30 + from.y * 220;
            const x2 = 44 + to.x * 680;
            const y2 = 30 + to.y * 220;
            return <line key={transition.id} x1={x1} y1={y1} x2={x2} y2={y2} className="fsm-edge" />;
          })}

          {payload.nodes.map((node) => {
            const x = 44 + node.x * 680;
            const y = 30 + node.y * 220;
            return (
              <g key={node.id} className={`fsm-node ${node.active ? "active" : ""}`}>
                <circle cx={x} cy={y} r={node.active ? 18 : 13} className="fsm-node-dot" />
                <text x={x + 18} y={y + 4} className="fsm-node-label">{node.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="fsm-transition-grid">
        {payload.transitions.map((transition) => (
          <button
            key={transition.id}
            type="button"
            className="fsm-transition-chip"
            disabled={locked}
            onClick={() => void onTransition(transition.actionPayload)}
            title={`${transition.fromNodeId} -> ${transition.toNodeId}`}
          >
            {transition.label}
          </button>
        ))}
      </div>

      <div className="fsm-hints">
        {payload.hints.map((hint) => (
          <span key={hint} className="fsm-hint">{hint}</span>
        ))}
      </div>
    </section>
  );
}
