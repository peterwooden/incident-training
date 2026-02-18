import type { BombSafetyTelemetryPayload } from "@incident/shared";

interface BombSafetyTelemetryPanelProps {
  payload: BombSafetyTelemetryPayload;
  locked: boolean;
  onStabilize: () => void;
}

export function BombSafetyTelemetryPanel({ payload, locked, onStabilize }: BombSafetyTelemetryPanelProps) {
  const risk = Math.max(0, Math.min(100, payload.currentRisk));

  return (
    <section className="scene-panel bomb-safety-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Safety Telemetry</h3>
        <div className="chip-strip">
          <span className="chip warning">risk {risk}%</span>
          <span className="chip">window {payload.stabilizeWindowSec}s</span>
        </div>
      </header>

      <div className="visual-stage safety-stage">
        <svg viewBox="0 0 320 180" className="geometry-layer" aria-label="Safety control cluster">
          <circle cx={160} cy={90} r={70} className="safety-ring-track" />
          <circle cx={160} cy={90} r={70} className="safety-ring-fill" style={{ strokeDasharray: `${Math.round((risk / 100) * 440)} 440` }} />
          <rect x={130} y={66} width={60} height={48} rx={10} className="safety-lever-base" />
          <rect x={154} y={44} width={12} height={70} rx={6} className="safety-lever" />
          <text x={160} y={158} textAnchor="middle" className="risk-label-large">{risk}%</text>
        </svg>

        <svg viewBox="0 0 320 180" className="interaction-layer" aria-hidden="true">
          <circle
            cx={160}
            cy={90}
            r={84}
            className="hit-stabilize"
            onPointerDown={() => {
              if (!locked) {
                onStabilize();
              }
            }}
          />
        </svg>
      </div>

      <div className="alarm-dots" aria-label="Alarm hints">
        {payload.alarms.map((alarm, idx) => (
          <span key={`${alarm}-${idx}`} title={alarm} className="alarm-dot" />
        ))}
      </div>
    </section>
  );
}
