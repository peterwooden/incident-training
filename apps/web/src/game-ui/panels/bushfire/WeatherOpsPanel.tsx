import type { WeatherOpsPayload } from "@incident/shared";
import { LayeredScene, RimLight, ShadowCaster, SpecularOverlay, useAmbientMotionClock } from "../../visuals/core";

interface WeatherOpsPanelProps {
  payload: WeatherOpsPayload;
  locked: boolean;
  onIssueForecast: (forecastType: string) => void;
}

const FORECAST_TYPES = [
  { id: "phase_update", label: "Phase Update" },
  { id: "wind_shift", label: "Wind Shift" },
  { id: "smoke_alert", label: "Smoke Alert" },
];

export function WeatherOpsPanel({ payload, locked, onIssueForecast }: WeatherOpsPanelProps) {
  const confidence = Math.max(0, Math.min(100, Math.round(payload.forecastConfidence)));
  const windKph = Math.round(payload.windKph);
  const { pulse } = useAmbientMotionClock({ loopMs: 2100, paused: false });
  const headingMap: Record<WeatherOpsPayload["windDirection"], number> = {
    N: 0,
    E: 90,
    S: 180,
    W: 270,
  };
  const heading = headingMap[payload.windDirection] ?? 90;

  return (
    <section className="scene-widget weather-ops-panel visual-heavy">
      <header className="widget-chip-row">
        <h3>Weather Ops</h3>
        <div className="chip-strip">
          <span className="chip warning">{payload.windDirection}/{payload.windStrength}</span>
          <span className="chip">wind {windKph} km/h</span>
        </div>
      </header>

      <LayeredScene className="visual-stage weather-stage cinematic-depth" depthPx={4} perspectivePx={760}>
        <ShadowCaster blurPx={14} opacity={0.28} offsetY={5} />
        <RimLight color="#8ecbff" intensity={0.22 + pulse * 0.12} />
        <SpecularOverlay intensity={0.12} angleDeg={-18} />

        <svg viewBox="0 0 340 180" className="geometry-layer" aria-label="Weather and forecast state">
          <circle cx={86} cy={90} r={58} className="weather-dial-ring" />
          <circle cx={86} cy={90} r={40} className="weather-dial-core" />
          <g transform={`rotate(${heading} 86 90)`}>
            <path d="M 86 44 L 76 68 L 86 62 L 96 68 Z" className="weather-arrow" />
            <line x1={86} y1={60} x2={86} y2={128} className="weather-arrow-tail" />
          </g>
          <text x={86} y={148} textAnchor="middle" className="weather-readout">
            {payload.windDirection} {windKph}
          </text>
          <text x={86} y={34} textAnchor="middle" className="weather-readout">
            {payload.severityEmoji}
          </text>

          <rect x={164} y={34} width={146} height={20} rx={8} className="weather-track" />
          <rect
            x={164}
            y={34}
            width={(confidence / 100) * 146}
            height={20}
            rx={8}
            className="weather-fill"
          />
          <text x={172} y={49} className="weather-label">Forecast confidence</text>
          <text x={304} y={49} className="weather-value" textAnchor="end">{confidence}%</text>
          <text x={164} y={66} className="weather-label">
            {payload.conditionIcon} | gust {payload.gustBand}
          </text>

          <text x={164} y={86} className="weather-note">{payload.nextShiftHint}</text>
          <text x={164} y={112} className="weather-note">{payload.recommendation}</text>
        </svg>

        <div className="weather-action-row" role="group" aria-label="Issue forecast update">
          {FORECAST_TYPES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="weather-action-chip"
              disabled={locked}
              onClick={() => onIssueForecast(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </LayeredScene>
    </section>
  );
}
