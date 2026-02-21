import type { IncidentCommandPayload } from "@incident/shared";
import { LayeredScene, RimLight, ShadowCaster, SpecularOverlay, useAmbientMotionClock } from "../../visuals/core";

interface IncidentCommandPanelProps {
  payload: IncidentCommandPayload;
}

export function IncidentCommandPanel({ payload }: IncidentCommandPanelProps) {
  const containment = Math.max(0, Math.min(100, payload.containment));
  const { pulse } = useAmbientMotionClock({ loopMs: 2200, paused: false });

  return (
    <section className="scene-widget incident-command-panel visual-heavy">
      <header className="widget-chip-row">
        <h3>Incident Command</h3>
        <div className="chip-strip">
          <span className="chip good">contain {containment}%</span>
          <span className="chip warning">risks {payload.topRisks.length}</span>
        </div>
      </header>

      <LayeredScene className="visual-stage command-stage cinematic-depth" depthPx={4} perspectivePx={760}>
        <ShadowCaster blurPx={14} opacity={0.32} offsetY={6} />
        <RimLight color="#9ce4cd" intensity={0.2 + pulse * 0.1} />
        <SpecularOverlay intensity={0.14} angleDeg={-10} />

        <svg viewBox="0 0 340 190" className="geometry-layer" aria-label="Strategic risk radar">
          <circle cx={88} cy={92} r={62} className="radar-ring" />
          <circle cx={88} cy={92} r={42} className="radar-ring" />
          <circle cx={88} cy={92} r={22} className="radar-ring" />
          <path
            d={`M 88 92 L ${88 + Math.cos((containment / 100) * Math.PI * 1.7 - Math.PI) * 62} ${92 + Math.sin((containment / 100) * Math.PI * 1.7 - Math.PI) * 62}`}
            className="radar-sweep"
          />
          <text x={88} y={99} textAnchor="middle" className="risk-label-large">{containment}%</text>

          {payload.topRisks.slice(0, 2).map((risk, idx) => (
            <g key={`${risk}-${idx}`}>
              <rect x={170} y={32 + idx * 56} width={152} height={42} rx={8} className="risk-card" />
              <text x={178} y={56 + idx * 56} className="risk-card-text">{risk}</text>
            </g>
          ))}
        </svg>

        <div className="objective-lane" aria-label="Strategic objectives">
          {payload.strategicObjectives.slice(0, 4).map((objective, idx) => (
            <article key={`${objective}-${idx}`} className="objective-chip">
              <span>{idx + 1}</span>
              <span>{objective}</span>
            </article>
          ))}
        </div>
      </LayeredScene>
    </section>
  );
}
