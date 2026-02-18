import { useEffect, useMemo, useRef, useState } from "react";
import type { BombDeviceConsolePayload, FxProfile, InteractionRegion } from "@incident/shared";
import { CanvasFxLayer } from "../../../render/CanvasFxLayer";
import { drawAlarmPulse } from "../../../render/drawAlarmPulse";
import {
  DepthParallaxGroup,
  LayeredScene,
  RimLight,
  ShadowCaster,
  SpecularOverlay,
  useAmbientMotionClock,
  usePointerDepthState,
} from "../../visuals/core";
import { BombCinematicBackdrop } from "../../visuals/bomb";

interface BombDeviceConsolePanelProps {
  payload: BombDeviceConsolePayload;
  locked: boolean;
  fxProfile: FxProfile;
  ambientLoopMs: number;
  hoverDepthPx: number;
  onCutWire: (wireId: string) => void;
  onPressSymbol: (symbol: string) => void;
  onStabilize: () => void;
}

const STAGE_WIDTH = 720;
const STAGE_HEIGHT = 280;

export function BombDeviceConsolePanel({
  payload,
  locked,
  fxProfile,
  ambientLoopMs,
  hoverDepthPx,
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

  const { pulse, wave } = useAmbientMotionClock({
    loopMs: Math.max(1200, ambientLoopMs),
    paused: fxProfile === "reduced",
  });
  const { offsetX, offsetY, bind } = usePointerDepthState(hoverDepthPx);

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

  const onRegionActivate = (region: InteractionRegion) => {
    if (!region.enabled || !isActionEnabled) {
      return;
    }

    if (region.kind === "wire") {
      onCutWire(region.targetId);
      return;
    }

    if (region.kind === "symbol") {
      setSelectedSymbol(region.targetId);
      onPressSymbol(region.targetId);
      return;
    }

    if (region.kind === "stabilizer") {
      onStabilize();
    }
  };

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

      <LayeredScene className="visual-stage bomb-stage cinematic-depth" depthPx={hoverDepthPx} perspectivePx={920}>
        <div className="bomb-stage-root" {...bind}>
          <ShadowCaster blurPx={26} opacity={0.55} offsetY={10} />
          <RimLight color="#8dbdff" intensity={0.46 + pulse * 0.16} />
          <SpecularOverlay intensity={payload.deviceSkin.reflectionStrength} angleDeg={-14} />

          <DepthParallaxGroup offsetX={offsetX} offsetY={offsetY} depth={0.42}>
            <BombCinematicBackdrop grimeAmount={payload.deviceSkin.grimeAmount} reflectionStrength={payload.deviceSkin.reflectionStrength} />
          </DepthParallaxGroup>

          <CanvasFxLayer
            className="fx-layer"
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            draw={(ctx, width, height, now) =>
              drawAlarmPulse(ctx, width, height, now, risk, {
                fxProfile,
                jitter: payload.shakeIntensity,
                glowBoost: 0.4 + pulse * 0.3,
              })
            }
          />

          <DepthParallaxGroup offsetX={offsetX} offsetY={offsetY} depth={0.65}>
            <svg
              viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
              className="geometry-layer"
              role="img"
              aria-label="Bomb device"
              style={{ transform: `translate3d(0,0,0) rotate(${payload.shakeIntensity * (fxProfile === "reduced" ? 0.2 : 1.3)}deg)` }}
            >
              <defs>
                <linearGradient id="deviceShell" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={payload.deviceSkin.shellGradient[0]} />
                  <stop offset="100%" stopColor={payload.deviceSkin.shellGradient[1]} />
                </linearGradient>
                <linearGradient id="busbarGlow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#c8d9ff" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#93baff" stopOpacity="0.6" />
                </linearGradient>
                <filter id="pcbGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect x={12} y={12} width={696} height={256} rx={26} fill="url(#deviceShell)" className="bomb-shell-body" />

              {payload.energyArcs.map((arc) => (
                <polyline
                  key={arc.id}
                  points={arc.points.map((point) => `${point.x},${point.y}`).join(" ")}
                  className={`energy-arc ${arc.active ? "active" : "idle"}`}
                  style={{
                    opacity: fxProfile === "reduced" ? 0.2 : arc.intensity,
                    strokeDashoffset: `${(wave * 100 + arc.speed * 40) % 120}`,
                  }}
                />
              ))}

              {payload.components.map((component) => (
                <g
                  key={component.id}
                  className={`bomb-component ${component.type} ${component.state}`}
                  transform={`translate(${component.x} ${component.y}) rotate(${component.rotationDeg} ${component.width / 2} ${component.height / 2})`}
                >
                  <rect width={component.width} height={component.height} rx={Math.min(8, component.height / 3)} />
                  {component.valueLabel && (
                    <text x={component.width / 2} y={component.height / 2 + 4} textAnchor="middle" className="component-label">
                      {component.valueLabel}
                    </text>
                  )}
                </g>
              ))}

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
                  r={8 + (fxProfile === "reduced" ? 0 : pulse * 1.2)}
                  className={`state-light ${light.color} ${light.active ? "active" : ""}`}
                />
              ))}

              <g className="symbol-ring" filter="url(#pcbGlow)">
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
          </DepthParallaxGroup>

          <svg viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`} className="interaction-layer" aria-hidden="true">
            {payload.interactionRegions.map((region) => {
              const isDisabled = !region.enabled || !isActionEnabled;
              const cursorStyle = isDisabled ? "not-allowed" : region.cursor;
              const className = `interaction-hit ${region.kind} ${isDisabled ? "disabled" : "enabled"}`;

              if (region.shape === "line" && region.line) {
                return (
                  <line
                    key={region.id}
                    x1={region.line.start.x}
                    y1={region.line.start.y}
                    x2={region.line.end.x}
                    y2={region.line.end.y}
                    className={className}
                    style={{ strokeWidth: region.line.thickness + 8, cursor: cursorStyle }}
                    tabIndex={isDisabled ? -1 : 0}
                    role="button"
                    onPointerDown={() => onRegionActivate(region)}
                    onKeyDown={(event) => {
                      if (!isDisabled && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        onRegionActivate(region);
                      }
                    }}
                  />
                );
              }

              if (region.shape === "circle" && region.circle) {
                return (
                  <circle
                    key={region.id}
                    cx={region.circle.center.x}
                    cy={region.circle.center.y}
                    r={region.circle.radius}
                    className={className}
                    style={{ cursor: cursorStyle }}
                    tabIndex={isDisabled ? -1 : 0}
                    role="button"
                    onPointerDown={() => {
                      if (region.kind === "stabilizer") {
                        startHold();
                      } else {
                        onRegionActivate(region);
                      }
                    }}
                    onPointerUp={() => {
                      if (region.kind === "stabilizer") {
                        endHold();
                      }
                    }}
                    onPointerLeave={() => {
                      if (region.kind === "stabilizer") {
                        endHold();
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!isDisabled && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        onRegionActivate(region);
                      }
                    }}
                  />
                );
              }

              if (region.shape === "rect" && region.rect) {
                return (
                  <rect
                    key={region.id}
                    x={region.rect.x}
                    y={region.rect.y}
                    width={region.rect.width}
                    height={region.rect.height}
                    rx={10}
                    className={className}
                    style={{ cursor: cursorStyle }}
                    tabIndex={isDisabled ? -1 : 0}
                    role="button"
                    onPointerDown={() => onRegionActivate(region)}
                  />
                );
              }

              return null;
            })}
          </svg>
        </div>
      </LayeredScene>

      <div className="sequence-pips" aria-label="Entered sequence">
        {payload.symbolModule.enteredSequence.map((symbol, idx) => (
          <span key={`${symbol}-${idx}`} className="sequence-pip">{symbol}</span>
        ))}
      </div>
    </section>
  );
}
