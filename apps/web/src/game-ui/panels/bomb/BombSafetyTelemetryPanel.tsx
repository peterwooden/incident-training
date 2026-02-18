import type { BombSafetyTelemetryPayload } from "@incident/shared";

interface BombSafetyTelemetryPanelProps {
  payload: BombSafetyTelemetryPayload;
  locked: boolean;
  onStabilize: () => void;
}

export function BombSafetyTelemetryPanel({ payload, locked, onStabilize }: BombSafetyTelemetryPanelProps) {
  const risk = Math.max(0, Math.min(100, payload.currentRisk));

  return (
    <section className="scene-panel bomb-safety-panel">
      <header>
        <h3>Safety Telemetry</h3>
        <p>Stabilize window: {payload.stabilizeWindowSec}s</p>
      </header>

      <div className="risk-meter">
        <svg viewBox="0 0 220 120" aria-label="Risk meter">
          <path d="M 20 100 A 90 90 0 0 1 200 100" className="risk-track" />
          <path
            d="M 20 100 A 90 90 0 0 1 200 100"
            className="risk-fill"
            style={{ strokeDasharray: `${Math.round((risk / 100) * 282)} 282` }}
          />
          <text x="110" y="88" textAnchor="middle" className="risk-label">{risk}%</text>
        </svg>
      </div>

      <ul>
        {payload.alarms.map((alarm, idx) => (
          <li key={`${alarm}-${idx}`}>{alarm}</li>
        ))}
      </ul>

      <button disabled={locked} onClick={onStabilize}>Trigger Stabilization Pulse</button>
    </section>
  );
}
