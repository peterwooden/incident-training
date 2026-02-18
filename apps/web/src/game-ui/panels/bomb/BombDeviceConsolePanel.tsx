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
    () => Math.min(100, Math.round((payload.strikes / payload.maxStrikes) * 68 + (560 - payload.timerSec) / 11 + (190 - payload.stageTimerSec) / 8)),
    [payload.maxStrikes, payload.stageTimerSec, payload.strikes, payload.timerSec],
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
  const enteredSequence = payload.stageId === "memory"
    ? payload.memoryModule.enteredSequence
    : payload.symbolModule.enteredSequence;

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
          <span className="chip warning">S{payload.stageIndex + 1} {payload.stageTimerSec}s</span>
          <span className="chip">{payload.timerSec}s</span>
          <span className="chip">{payload.strikes}/{payload.maxStrikes}</span>
          <span className={`chip ${payload.status === "armed" ? "good" : "danger"}`}>{payload.status}</span>
        </div>
      </header>

      <p className="panel-annotation">
        {payload.stageObjective}
      </p>

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
                    glowBoost: 0.16 + pulse * 0.16,
                  })
                }
              />

          <DepthParallaxGroup offsetX={offsetX} offsetY={offsetY} depth={0.65}>
              <svg
                viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
                className="geometry-layer"
                preserveAspectRatio="none"
                role="img"
                aria-label="Bomb device"
                style={{ transform: `translate3d(0,0,0) rotate(${payload.shakeIntensity * (fxProfile === "reduced" ? 0.2 : 1.3)}deg)` }}
              >
              <defs>
                <linearGradient id="deviceShell" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={payload.deviceSkin.shellGradient[0]} />
                  <stop offset="100%" stopColor={payload.deviceSkin.shellGradient[1]} />
                </linearGradient>
                <linearGradient id="frontPlate" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1d2f46" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#121f34" stopOpacity="0.78" />
                  <stop offset="100%" stopColor="#0b1525" stopOpacity="0.86" />
                </linearGradient>
                <linearGradient id="bayGlass" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9dc8ff44" />
                  <stop offset="100%" stopColor="#0a152600" />
                </linearGradient>
                <linearGradient id="hazardStripe" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2c323f" />
                  <stop offset="20%" stopColor="#c7853e" />
                  <stop offset="40%" stopColor="#2c323f" />
                  <stop offset="60%" stopColor="#c7853e" />
                  <stop offset="80%" stopColor="#2c323f" />
                  <stop offset="100%" stopColor="#c7853e" />
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

              <rect x={12} y={12} width={696} height={256} rx={26} fill="url(#deviceShell)" opacity={0.2} className="bomb-shell-body" />
              <rect x={20} y={20} width={680} height={240} rx={22} className="bomb-front-plate" fill="url(#frontPlate)" opacity={0.52} />
              <rect x={28} y={28} width={664} height={116} rx={16} className="bomb-upper-bay" />
              <rect x={28} y={150} width={664} height={96} rx={16} className="bomb-lower-bay" />
              <rect x={28} y={246} width={664} height={14} rx={7} className="bomb-hazard-lip" fill="url(#hazardStripe)" />
              <rect x={28} y={28} width={664} height={56} rx={16} fill="url(#bayGlass)" />

              <g className="bomb-chassis-screws" aria-hidden="true">
                {[34, 686].flatMap((x) => [34, 252].map((y) => ({ x, y }))).map((screw, idx) => (
                  <g key={`screw_${idx}`}>
                    <circle cx={screw.x} cy={screw.y} r={8.5} className="bomb-screw-head" />
                    <line x1={screw.x - 4} y1={screw.y} x2={screw.x + 4} y2={screw.y} className="bomb-screw-notch" />
                  </g>
                ))}
              </g>

              <g className="bomb-lower-grid" aria-hidden="true">
                {Array.from({ length: 11 }).map((_, idx) => (
                  <line key={`lower_h_${idx}`} x1={44} y1={160 + idx * 8} x2={450} y2={160 + idx * 8} className="bomb-lower-grid-line" />
                ))}
                {Array.from({ length: 10 }).map((_, idx) => (
                  <line key={`lower_v_${idx}`} x1={52 + idx * 40} y1={154} x2={52 + idx * 40} y2={236} className="bomb-lower-grid-line" />
                ))}
              </g>

              <g className="bomb-floor-circuits" aria-hidden="true">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <line
                    key={`floor_trace_${idx}`}
                    x1={52 + idx * 64}
                    y1={238 + (idx % 3) * 7}
                    x2={88 + idx * 64}
                    y2={252 - (idx % 2) * 8}
                    className="bomb-floor-trace"
                  />
                ))}
                {Array.from({ length: 9 }).map((_, idx) => (
                  <rect
                    key={`floor_chip_${idx}`}
                    x={42 + idx * 74}
                    y={214 + (idx % 2) * 8}
                    width={18}
                    height={10}
                    rx={3}
                    className="bomb-floor-chip"
                  />
                ))}
              </g>

              <g className="bomb-diagnostic-bays" aria-hidden="true">
                <rect x={480} y={152} width={196} height={36} rx={10} className="bomb-diag-bay" />
                <rect x={480} y={194} width={196} height={42} rx={10} className="bomb-diag-bay" />
                {Array.from({ length: 5 }).map((_, idx) => (
                  <rect
                    key={`diag_bar_${idx}`}
                    x={494}
                    y={162 + idx * 5}
                    width={90 + ((idx + 1) % 3) * 22}
                    height={2.8}
                    rx={1.4}
                    className="bomb-diag-bar"
                  />
                ))}
                {Array.from({ length: 4 }).map((_, idx) => (
                  <circle
                    key={`diag_dot_${idx}`}
                    cx={628 + idx * 12}
                    cy={212}
                    r={3 + (idx === 0 ? pulse * 0.7 : 0)}
                    className={`bomb-diag-dot ${idx < 2 ? "active" : ""}`}
                  />
                ))}
              </g>

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

          <svg viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`} className="interaction-layer" preserveAspectRatio="none" aria-hidden="true">
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
        {enteredSequence.map((symbol, idx) => (
          <span key={`${symbol}-${idx}`} className="sequence-pip">{symbol}</span>
        ))}
      </div>
    </section>
  );
}
