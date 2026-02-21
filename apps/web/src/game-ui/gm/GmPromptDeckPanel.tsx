import type { BushfirePhaseId, GmPromptDeckPayload } from "@incident/shared";

interface GmPromptDeckPanelProps {
  payload: GmPromptDeckPayload;
  locked: boolean;
  onRelease: (cardId: string) => Promise<void>;
}

const PHASE_ORDER: BushfirePhaseId[] = [
  "phase_1_monitor",
  "phase_2_escalation",
  "phase_3_crisis",
  "phase_4_catastrophe",
  "terminal_failed",
];

const PHASE_LABEL: Record<BushfirePhaseId, string> = {
  phase_1_monitor: "Phase 1 Monitor",
  phase_2_escalation: "Phase 2 Escalation",
  phase_3_crisis: "Phase 3 Crisis",
  phase_4_catastrophe: "Phase 4 Catastrophe",
  terminal_failed: "Terminal Failed",
};

export function GmPromptDeckPanel({ payload, locked, onRelease }: GmPromptDeckPanelProps) {
  const releasable = new Set(payload.releasableCardIds);
  const cardsByPhase = PHASE_ORDER.map((phaseId) => ({
    phaseId,
    cards: payload.cards.filter((card) => card.phaseId === phaseId),
  })).filter((group) => group.cards.length > 0);

  return (
    <section className="scene-widget gm-prompt-deck-panel visual-heavy">
      <header className="widget-chip-row">
        <h3>GM Prompt Deck</h3>
        <div className="chip-strip">
          <span className="chip">{PHASE_LABEL[payload.phaseId]}</span>
          <span className="chip supporting">cards {payload.cards.length}</span>
        </div>
      </header>

      <div className="visual-stage gm-prompt-stage">
        <div className="gm-prompt-columns">
          {cardsByPhase.map((group) => (
            <section key={group.phaseId} className="gm-prompt-column">
              <h4>{PHASE_LABEL[group.phaseId]}</h4>
              <div className="gm-prompt-cards">
                {group.cards.map((card) => {
                  const canRelease = !card.released && releasable.has(card.id) && !locked;
                  return (
                    <article key={card.id} className={`gm-prompt-card ${card.released ? "released" : ""}`}>
                      <div className="gm-prompt-card-head">
                        <strong>{card.title}</strong>
                        <span className="chip supporting">{card.targetRole}</span>
                      </div>
                      <p>{card.body}</p>
                      <div className="gm-prompt-card-foot">
                        <span className="chip">{card.acknowledgementCount} ack</span>
                        <button
                          type="button"
                          className="secondary mini"
                          disabled={!canRelease}
                          onClick={() => void onRelease(card.id)}
                        >
                          {card.released ? "Released" : "Release"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
