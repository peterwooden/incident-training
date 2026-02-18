import type { BombDeviceConsolePayload } from "@incident/shared";

interface BombDeviceConsolePanelProps {
  payload: BombDeviceConsolePayload;
  locked: boolean;
  onCutWire: (wireId: string) => void;
  onPressSymbol: (symbol: string) => void;
  onStabilize: () => void;
}

export function BombDeviceConsolePanel({
  payload,
  locked,
  onCutWire,
  onPressSymbol,
  onStabilize,
}: BombDeviceConsolePanelProps) {
  return (
    <section className="scene-panel bomb-device-panel">
      <header>
        <h3>Device Console</h3>
        <p>Timer {payload.timerSec}s | Strikes {payload.strikes}/{payload.maxStrikes} | Status {payload.status}</p>
      </header>

      <svg viewBox="0 0 720 260" className="bomb-shell" role="img" aria-label="Bomb shell">
        <rect x="12" y="10" width="696" height="238" rx="22" className="bomb-shell-body" />
        {payload.wires.map((wire, idx) => (
          <g key={wire.id} className={wire.isCut ? "wire-g cut" : "wire-g"}>
            <line
              x1={70}
              y1={48 + idx * 40}
              x2={500}
              y2={48 + idx * 40}
              className={`bomb-wire ${wire.color}`}
            />
            <circle cx={58} cy={48 + idx * 40} r={8} className="wire-anchor" />
            <circle cx={512} cy={48 + idx * 40} r={8} className="wire-anchor" />
          </g>
        ))}
        <rect x="540" y="34" width="140" height="180" rx="10" className="bomb-display" />
        <text x="610" y="94" textAnchor="middle" className="display-text">{payload.status.toUpperCase()}</text>
        <text x="610" y="128" textAnchor="middle" className="display-text">{payload.timerSec}s</text>
      </svg>

      <div className="wire-controls">
        {payload.wires.map((wire) => (
          <button
            key={wire.id}
            disabled={locked || wire.isCut || payload.status !== "armed"}
            onClick={() => onCutWire(wire.id)}
            className={`wire-btn wire-${wire.color} ${wire.isCut ? "disabled" : ""}`}
          >
            {wire.id} {wire.color} {wire.isCut ? "cut" : "active"}
          </button>
        ))}
      </div>

      <div className="glyph-grid">
        {payload.symbolModule.availableSymbols.map((symbol) => (
          <button
            key={symbol}
            disabled={locked || payload.status !== "armed"}
            className="glyph-btn"
            onClick={() => onPressSymbol(symbol)}
          >
            {symbol}
          </button>
        ))}
      </div>

      <p className="sequence-readout">Sequence: {payload.symbolModule.enteredSequence.join(" -> ") || "none"}</p>
      <button disabled={locked || payload.status !== "armed"} onClick={onStabilize} className="secondary">
        Stabilize
      </button>
    </section>
  );
}
