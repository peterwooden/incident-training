import type { RoleBriefingPayload } from "@incident/shared";
import { LayeredScene, RimLight, ShadowCaster, SpecularOverlay, useAmbientMotionClock } from "../../visuals/core";

interface RoleBriefingPanelProps {
  payload: RoleBriefingPayload;
  locked: boolean;
  onAcknowledge: (promptId: string) => void;
}

export function RoleBriefingPanel({ payload, locked, onAcknowledge }: RoleBriefingPanelProps) {
  const { pulse } = useAmbientMotionClock({ loopMs: 2200, paused: false });

  return (
    <section className="scene-panel role-briefing-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Role Briefing</h3>
        <div className="chip-strip">
          <span className="chip">{payload.roleLabel}</span>
          <span className="chip supporting">prompts {payload.prompts.length}</span>
        </div>
      </header>

      <LayeredScene className="visual-stage briefing-stage cinematic-depth" depthPx={4} perspectivePx={780}>
        <ShadowCaster blurPx={14} opacity={0.28} offsetY={5} />
        <RimLight color="#95f0c7" intensity={0.2 + pulse * 0.1} />
        <SpecularOverlay intensity={0.12} angleDeg={-16} />

        {payload.prompts.length === 0 ? (
          <div className="briefing-empty">
            <p>Awaiting GM cue cards for this role.</p>
          </div>
        ) : (
          <div className="briefing-card-list">
            {payload.prompts.map((prompt) => (
              <article key={prompt.id} className={`briefing-card severity-${prompt.severity}`}>
                <div className="briefing-card-head">
                  <h4>{prompt.title}</h4>
                  <span className="chip supporting">{prompt.severity}</span>
                </div>
                <p>{prompt.body}</p>
                <div className="briefing-card-foot">
                  <span className="briefing-time">
                    {prompt.releasedAtEpochMs ? new Date(prompt.releasedAtEpochMs).toLocaleTimeString() : "Unreleased"}
                  </span>
                  <button
                    type="button"
                    className="secondary mini"
                    disabled={locked || prompt.acknowledged}
                    onClick={() => onAcknowledge(prompt.id)}
                  >
                    {prompt.acknowledged ? "Acknowledged" : "Acknowledge"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </LayeredScene>
    </section>
  );
}
