import type { PublicInfoPayload } from "@incident/shared";
import { LayeredScene, RimLight, ShadowCaster, SpecularOverlay, useAmbientMotionClock } from "../../visuals/core";

interface PublicInfoPanelProps {
  payload: PublicInfoPayload;
  advisoryDraft: string;
  onDraftChange: (value: string) => void;
  onPublish: () => void;
  locked: boolean;
}

const QUICK_TEMPLATES = [
  "Evacuate now",
  "Shelter advised",
  "Road closure",
  "Air support inbound",
];

export function PublicInfoPanel({
  payload,
  advisoryDraft,
  onDraftChange,
  onPublish,
  locked,
}: PublicInfoPanelProps) {
  const anxiety = Math.max(0, Math.min(100, payload.anxiety));
  const { pulse } = useAmbientMotionClock({ loopMs: 1900, paused: false });

  return (
    <section className="scene-panel public-info-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Public Info</h3>
        <div className="chip-strip">
          <span className="chip warning">anxiety {anxiety}%</span>
          <span className="chip supporting">updates {payload.advisories.length}</span>
        </div>
      </header>

      <LayeredScene className="visual-stage public-info-stage cinematic-depth" depthPx={4} perspectivePx={760}>
        <ShadowCaster blurPx={14} opacity={0.32} offsetY={6} />
        <RimLight color="#8ec9ff" intensity={0.2 + pulse * 0.12} />
        <SpecularOverlay intensity={0.16} angleDeg={-16} />

        <svg viewBox="0 0 340 180" className="geometry-layer" aria-label="Advisory broadcast">
          <circle cx={85} cy={90} r={58} className="broadcast-ring" />
          <circle
            cx={85}
            cy={90}
            r={58}
            className="broadcast-fill"
            style={{ strokeDasharray: `${Math.round((anxiety / 100) * 365)} 365` }}
          />
          <text x={85} y={96} className="broadcast-label" textAnchor="middle">{anxiety}%</text>
          <text x={190} y={50} className="cadence-label">cadence</text>
          <text x={190} y={72} className="cadence-hint">{payload.cadenceHint}</text>
          <rect x={176} y={92} width={130} height={54} rx={8} className="ticker-frame" />
          <text x={184} y={116} className="ticker-line">{payload.advisories.at(-1) ?? "No broadcast yet"}</text>
        </svg>

        <div className="composer-lens">
          <div className="template-row" aria-label="Quick advisory templates">
            {QUICK_TEMPLATES.map((template) => (
              <button
                key={template}
                type="button"
                className="template-chip"
                onClick={() => onDraftChange(template)}
              >
                {template}
              </button>
            ))}
          </div>

          <textarea
            aria-label="Advisory draft"
            value={advisoryDraft}
            onChange={(event) => onDraftChange(event.target.value)}
            rows={2}
          />

          <button
            type="button"
            className="beacon-button"
            disabled={locked}
            onClick={onPublish}
            aria-label="Publish advisory"
          >
            TX
          </button>
        </div>
      </LayeredScene>
    </section>
  );
}
