import { useEffect, useMemo, useRef, useState } from "react";
import type { BombDeviceConsolePayload } from "@incident/shared";
import { CanvasFxLayer } from "../../../render/CanvasFxLayer";
import { drawAlarmPulse } from "../../../render/drawAlarmPulse";

interface BombDeviceConsolePanelProps {
  payload: BombDeviceConsolePayload;
  locked: boolean;
  onCutWire: (wireId: string) => void;
  onPressSymbol: (symbol: string) => void;
  onStabilize: () => void;
}

const STAGE_WIDTH = 720;
const STAGE_HEIGHT = 280;

export function BombDeviceConsolePanel({
  payload,
  locked,
  onCutWire,
  onPressSymbol,
  onStabilize,
}: BombDeviceConsolePanelProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | undefined>(undefined);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdStartRef = useRef<number | null>(null);

  const risk = useMemo(
    () => Math.min(100, Math.round((payload.strikes / payload.maxStrikes) * 70 + (540 - payload.timerSec) / 10)),
    [payload.maxStrikes, payload.strikes, payload.timerSec],
  );

  useEffect(() => {
    if (!isHolding) {
      return;
    }

    let raf = 0;
    const tick = (now: number) => {
      if (!isHolding || holdStartRef.current == null) {
        return;
      }
      const progress = Math.min(1, (now - holdStartRef.current) / 900);
      setHoldProgress(progress);
      if (progress >= 1) {
        holdStartRef.current = null;
        setIsHolding(false);
        setHoldProgress(0);
        onStabilize();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isHolding, onStabilize]);

  const startHold = () => {
    if (locked || payload.status !== "armed") {
      return;
    }
    holdStartRef.current = performance.now();
    setIsHolding(true);
  };

  const endHold = () => {
    holdStartRef.current = null;
    setIsHolding(false);
    setHoldProgress(0);
  };

  const isActionEnabled = !locked && payload.status === "armed";

  return (
    <section className="scene-panel bomb-device-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Device Console</h3>
        <div className="chip-strip">
          <span className="chip warning">{payload.timerSec}s</span>
          <span className="chip">{payload.strikes}/{payload.maxStrikes}</span>
          <span className={`chip ${payload.status === "armed" ? "good" : "danger"}`}>{payload.status}</span>
        </div>
      </header>

      <div className="visual-stage bomb-stage" style={{ transform: `translate3d(0,0,0) rotate(${payload.shakeIntensity * 1.4}deg)` }}>
        <CanvasFxLayer
          className="fx-layer"
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          draw={(ctx, width, height, now) => drawAlarmPulse(ctx, width, height, now, risk)}
        />

        <svg viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`} className="geometry-layer" role="img" aria-label="Bomb device">
          <rect x={12} y={12} width={696} height={256} rx={26} className="bomb-shell-body" />

          {payload.moduleBounds.map((module) => (
            <rect
              key={module.id}
              x={module.x}
              y={module.y}
              width={module.width}
              height={module.height}
              rx={12}
              className="module-bound"
            />
          ))}

          {payload.cuttableSegments.map((segment) => {
            const wire = payload.wires.find((item) => item.id === segment.wireId);
            return (
              <g key={segment.id} className={wire?.isCut ? "wire-g cut" : "wire-g"}>
                <line
                  x1={segment.start.x}
                  y1={segment.start.y}
                  x2={segment.end.x}
                  y2={segment.end.y}
                  className={`bomb-wire ${wire?.color ?? "red"}`}
                />
              </g>
            );
          })}

          {payload.stateLights.map((light) => (
            <circle
              key={light.id}
              cx={light.x}
              cy={light.y}
              r={8}
              className={`state-light ${light.color} ${light.active ? "active" : ""}`}
            />
          ))}

          <g className="symbol-ring">
            {payload.symbolNodes.map((node) => (
              <g key={node.symbol} className={selectedSymbol === node.symbol ? "active" : ""}>
                <circle cx={node.x} cy={node.y} r={node.radius} className="symbol-node" />
                <text x={node.x} y={node.y + 5} textAnchor="middle" className="symbol-node-text">{node.symbol}</text>
              </g>
            ))}
          </g>

          <circle cx={615} cy={195} r={38} className="stabilize-core" />
          <circle
            cx={615}
            cy={195}
            r={38}
            className="stabilize-progress"
            style={{ strokeDasharray: `${Math.round(holdProgress * 239)} 239` }}
          />
        </svg>

        <svg viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`} className="interaction-layer" aria-hidden="true">
          {payload.cuttableSegments.map((segment) => {
            const wire = payload.wires.find((item) => item.id === segment.wireId);
            const disabled = !isActionEnabled || wire?.isCut;
            return (
              <line
                key={`${segment.id}-hit`}
                x1={segment.start.x}
                y1={segment.start.y}
                x2={segment.end.x}
                y2={segment.end.y}
                className={`hit-wire ${disabled ? "disabled" : ""}`}
                tabIndex={disabled ? -1 : 0}
                role="button"
                onPointerDown={() => {
                  if (!disabled) {
                    onCutWire(segment.wireId);
                  }
                }}
                onKeyDown={(event) => {
                  if (!disabled && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onCutWire(segment.wireId);
                  }
                }}
              />
            );
          })}

          {payload.symbolNodes.map((node) => {
            const disabled = !isActionEnabled;
            return (
              <circle
                key={`${node.symbol}-hit`}
                cx={node.x}
                cy={node.y}
                r={node.radius + 8}
                className={`hit-symbol ${disabled ? "disabled" : ""}`}
                tabIndex={disabled ? -1 : 0}
                role="button"
                onPointerDown={() => {
                  if (!disabled) {
                    setSelectedSymbol(node.symbol);
                    onPressSymbol(node.symbol);
                  }
                }}
                onKeyDown={(event) => {
                  if (!disabled && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setSelectedSymbol(node.symbol);
                    onPressSymbol(node.symbol);
                  }
                }}
              />
            );
          })}

          <circle
            cx={615}
            cy={195}
            r={44}
            className={`hit-stabilize ${isActionEnabled ? "" : "disabled"}`}
            tabIndex={isActionEnabled ? 0 : -1}
            role="button"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onKeyDown={(event) => {
              if (isActionEnabled && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onStabilize();
              }
            }}
          />
        </svg>
      </div>

      <div className="sequence-pips" aria-label="Entered sequence">
        {payload.symbolModule.enteredSequence.map((symbol, idx) => (
          <span key={`${symbol}-${idx}`} className="sequence-pip">{symbol}</span>
        ))}
      </div>
    </section>
  );
}
