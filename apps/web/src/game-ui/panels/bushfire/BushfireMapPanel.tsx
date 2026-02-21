import { useCallback, useEffect, useMemo, useState } from "react";
import type { PointerEvent } from "react";
import type { FxProfile, Point2D, BushfireMapPayload, BushfireToolType } from "@incident/shared";
import { CanvasFxLayer } from "../../../render/CanvasFxLayer";
import { drawFireField } from "../../../render/drawFireField";
import { drawSmoke } from "../../../render/drawSmoke";
import { getVisualAsset } from "../../visuals/assets/manifest";
import {
  DepthParallaxGroup,
  LayeredScene,
  RimLight,
  ShadowCaster,
  SpecularOverlay,
  useAmbientMotionClock,
  usePointerDepthState,
} from "../../visuals/core";
import { BushfireTerrainLayer } from "../../visuals/bushfire";

interface BushfireMapPanelProps {
  payload: BushfireMapPayload;
  locked: boolean;
  fxProfile: FxProfile;
  ambientLoopMs: number;
  hoverDepthPx: number;
  canUseFireTools: boolean;
  canUsePoliceTools: boolean;
  onDeployCrew: (cellId: string) => void;
  onDropWater: (cellId: string) => void;
  onCreateFirebreak: (cellId: string) => void;
  onSetRoadblock: (cellId: string) => void;
}

const MAP_WIDTH = 720;
const MAP_HEIGHT = 420;

const TOOL_LABEL: Record<BushfireToolType, string> = {
  crew: "CR",
  water: "WT",
  firebreak: "FB",
  roadblock: "RB",
};

const TOOL_ICON_PATH: Record<BushfireToolType, string> = {
  crew: "M -8 0 L -1 -8 L 6 0 L 1 8 Z",
  water: "M 0 -9 C 5 -2 8 2 8 6 C 8 10 4 13 0 13 C -4 13 -8 10 -8 6 C -8 2 -5 -2 0 -9 Z",
  firebreak: "M -9 9 L 9 -9 M -10 -2 L -2 -10 M 2 10 L 10 2",
  roadblock: "M -10 -4 L 10 -4 L 7 5 L -7 5 Z M -12 -6 L -7 -6 M 7 7 L 12 7",
};

function centroid(points: Point2D[]): Point2D {
  const start = { x: 0, y: 0 };
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), start);
  return {
    x: sum.x / Math.max(1, points.length),
    y: sum.y / Math.max(1, points.length),
  };
}

function distance(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function BushfireMapPanel({
  payload,
  locked,
  fxProfile,
  ambientLoopMs,
  hoverDepthPx,
  canUseFireTools,
  canUsePoliceTools,
  onDeployCrew,
  onDropWater,
  onCreateFirebreak,
  onSetRoadblock,
}: BushfireMapPanelProps) {
  const [activeTool, setActiveTool] = useState<BushfireToolType | undefined>(undefined);
  const [dragPoint, setDragPoint] = useState<Point2D | undefined>(undefined);
  const [focusedZoneId, setFocusedZoneId] = useState<string | undefined>(undefined);
  const [dropFeedback, setDropFeedback] = useState<{ at: Point2D; valid: boolean } | undefined>(undefined);

  const { pulse } = useAmbientMotionClock({
    loopMs: Math.max(1200, ambientLoopMs),
    paused: fxProfile === "reduced",
  });
  const { offsetX, offsetY, bind } = usePointerDepthState(hoverDepthPx);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, now: number) => {
      ctx.clearRect(0, 0, width, height);
      drawFireField(ctx, payload.cells, width, height, now, {
        fxProfile,
        windField: payload.windField,
        fireContours: payload.fireFrontContours,
        canopyPulse: pulse,
      });
      drawSmoke(ctx, width, height, now, 100 - payload.containment + payload.anxiety * 0.4, {
        fxProfile,
        windField: payload.windField,
      });
    },
    [fxProfile, payload.anxiety, payload.cells, payload.containment, payload.fireFrontContours, payload.windField, pulse],
  );

  const actionForTool = useMemo(
    () => ({
      crew: onDeployCrew,
      water: onDropWater,
      firebreak: onCreateFirebreak,
      roadblock: onSetRoadblock,
    }),
    [onCreateFirebreak, onDeployCrew, onDropWater, onSetRoadblock],
  );

  const cellById = useMemo(() => {
    const map = new Map<string, BushfireMapPayload["cells"][number]>();
    for (const cell of payload.cells) {
      map.set(cell.id, cell);
    }
    return map;
  }, [payload.cells]);

  const focusedCell = useMemo(() => {
    if (focusedZoneId) {
      return cellById.get(focusedZoneId);
    }
    return payload.cells
      .slice()
      .sort((a, b) => b.fireLevel - a.fireLevel)[0];
  }, [cellById, focusedZoneId, payload.cells]);

  useEffect(() => {
    if (!dropFeedback) {
      return;
    }

    const timer = setTimeout(() => setDropFeedback(undefined), 450);
    return () => clearTimeout(timer);
  }, [dropFeedback]);

  const pointerToSvgPoint = (event: PointerEvent<SVGSVGElement>): Point2D => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * MAP_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT,
    };
  };

  const isToolEnabled = useCallback(
    (tool: BushfireToolType) => {
      if (locked) {
        return false;
      }
      if (tool === "roadblock") {
        return canUsePoliceTools;
      }
      return canUseFireTools;
    },
    [canUseFireTools, canUsePoliceTools, locked],
  );

  const commitAction = (tool: BushfireToolType, zoneId: string): void => {
    if (!isToolEnabled(tool)) {
      return;
    }
    actionForTool[tool](zoneId);
  };

  const commitDropAt = (drop: Point2D): void => {
    if (!activeTool || !isToolEnabled(activeTool)) {
      return;
    }

    const candidate = payload.dragTargets
      .filter((target) => target.accepts.includes(activeTool))
      .map((target) => ({ target, score: distance(drop, { x: target.x, y: target.y }) }))
      .sort((a, b) => a.score - b.score)[0];

    if (candidate && candidate.score <= candidate.target.radius) {
      commitAction(activeTool, candidate.target.zoneId);
      setFocusedZoneId(candidate.target.zoneId);
      setDropFeedback({ at: drop, valid: true });
    } else {
      setDropFeedback({ at: drop, valid: false });
    }

    setActiveTool(undefined);
    setDragPoint(undefined);
  };

  const windAngle = Math.atan2(payload.windVector.dy, payload.windVector.dx);

  return (
    <section className="scene-widget bushfire-map-panel visual-heavy">
      <header className="widget-chip-row">
        <h3>The Valley Firefront</h3>
        <div className="chip-strip">
          <span className="chip warning">contain {payload.containment}%</span>
          <span className="chip">anxiety {payload.anxiety}%</span>
          <span className="chip supporting">wind {payload.windDirection}/{payload.windStrength}</span>
        </div>
      </header>

      <LayeredScene className="map-stage visual-stage cinematic-depth" depthPx={hoverDepthPx} perspectivePx={960}>
        <div className="map-stage-root" {...bind}>
          <ShadowCaster blurPx={24} opacity={0.5} offsetY={12} />
          <RimLight color="#99d9a6" intensity={0.3 + pulse * 0.2} />
          <SpecularOverlay intensity={0.25} angleDeg={-20} />

          <DepthParallaxGroup offsetX={offsetX} offsetY={offsetY} depth={0.34}>
            <img src={getVisualAsset("map-terrain-base")} className="map-backdrop" alt="" aria-hidden="true" />
            <img src={getVisualAsset("map-water-mask")} className="map-water-mask" alt="" aria-hidden="true" />
          </DepthParallaxGroup>

          <DepthParallaxGroup offsetX={offsetX} offsetY={offsetY} depth={0.64}>
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              className="town-map-svg geometry-layer"
              aria-label="The Valley bushfire map"
              onPointerMove={(event) => {
                if (activeTool) {
                  setDragPoint(pointerToSvgPoint(event));
                }
              }}
              onPointerUp={(event) => {
                if (activeTool) {
                  commitDropAt(pointerToSvgPoint(event));
                }
              }}
              onPointerLeave={() => {
                if (activeTool) {
                  setDragPoint(undefined);
                }
              }}
            >
              <defs>
                <clipPath id="mapClip">
                  <rect x={12} y={12} width={696} height={396} rx={20} />
                </clipPath>
                <linearGradient id="zoneFill" x1="0" y1="0" x2="0.92" y2="1">
                  <stop offset="0%" stopColor="#4f7d58" stopOpacity="0.36" />
                  <stop offset="45%" stopColor="#2d4a40" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="#1c2d31" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="zoneRim" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f2f8d6" stopOpacity="0.44" />
                  <stop offset="100%" stopColor="#88b9ff" stopOpacity="0.14" />
                </linearGradient>
                <radialGradient id="zoneHeatCore" cx="50%" cy="45%">
                  <stop offset="0%" stopColor="#ffd6a4" stopOpacity="0.85" />
                  <stop offset="42%" stopColor="#ff8c59" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="#e84b2f" stopOpacity="0" />
                </radialGradient>
                <filter id="zoneBevel" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" floodColor="#0b111b" floodOpacity="0.72" />
                </filter>
              </defs>

              <rect x={10} y={10} width={700} height={400} rx={22} className="map-inner-frame" />
              <g clipPath="url(#mapClip)">
                {Array.from({ length: 11 }).map((_, idx) => (
                  <line key={`map_h_${idx}`} x1={12} y1={22 + idx * 36} x2={708} y2={22 + idx * 36} className="map-grid-line" />
                ))}
                {Array.from({ length: 14 }).map((_, idx) => (
                  <line key={`map_v_${idx}`} x1={18 + idx * 50} y1={12} x2={18 + idx * 50} y2={408} className="map-grid-line" />
                ))}

                <BushfireTerrainLayer payload={payload} />

                {payload.zonePolygons.map((zone) => {
                const cell = cellById.get(zone.zoneId);
                if (!cell) {
                  return null;
                }
                const center = centroid(zone.points);
                const severity = Math.max(0.15, Math.min(1, cell.fireLevel / 100));
                const selected = focusedZoneId === zone.zoneId;
                const fireCircumference = 2 * Math.PI * 20;
                const fireDash = `${Math.round((cell.fireLevel / 100) * fireCircumference)} ${fireCircumference}`;
                const populationPips = Math.max(1, Math.min(5, Math.round(cell.population / 95)));
                const zonePoints = zone.points.map((point) => `${point.x},${point.y}`).join(" ");

                  return (
                    <g key={zone.zoneId}>
                    <polygon
                      points={zone.points.map((point) => `${point.x + 1.5},${point.y + 2}`).join(" ")}
                      className="map-zone-shadow"
                    />
                    <polygon
                      points={zonePoints}
                      className={`map-zone ${selected ? "focused" : ""}`}
                      style={{ opacity: 0.42 + severity * 0.14, cursor: "pointer" }}
                      onPointerDown={() => setFocusedZoneId(zone.zoneId)}
                      filter="url(#zoneBevel)"
                    />
                    <polyline points={`${zonePoints} ${zone.points[0].x},${zone.points[0].y}`} className="map-zone-rim" />

                    {payload.fireFrontContours
                      .filter((contour) => contour.id.endsWith(zone.zoneId))
                      .map((contour) => (
                        <polyline
                          key={contour.id}
                          points={contour.points.map((point) => `${point.x},${point.y}`).join(" ")}
                          className="fire-front-contour"
                          style={{
                            opacity: contour.intensity,
                            strokeDashoffset: `${(contour.phase * 40 + pulse * 40) % 60}`,
                          }}
                        />
                      ))}

                    <circle cx={center.x} cy={center.y} r={15 + severity * 18} className="zone-heat" fill="url(#zoneHeatCore)" />
                    <circle cx={center.x} cy={center.y} r={20} className="zone-fire-track" />
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={20}
                      className="zone-fire-ring"
                      style={{
                        strokeDasharray: fireDash,
                        transform: "rotate(-90deg)",
                        transformOrigin: `${center.x}px ${center.y}px`,
                      }}
                    />
                    <g className="zone-pop-pips">
                      {Array.from({ length: populationPips }).map((_, idx) => (
                        <circle key={`${zone.zoneId}_pip_${idx}`} cx={center.x - 10 + idx * 5} cy={center.y + 28} r={1.8} />
                      ))}
                    </g>
                    <text x={center.x} y={center.y - 30} className="zone-name" textAnchor="middle">{cell.zoneName}</text>

                    {selected && (
                      <g className="zone-radial-actions" aria-label={`Focused zone ${cell.zoneName}`}>
                        {payload.toolDropZones
                          .filter((dropZone) => dropZone.zoneId === zone.zoneId)
                          .map((dropZone) => (
                            <g key={dropZone.id}>
                              <circle
                                cx={dropZone.x}
                                cy={dropZone.y}
                                r={dropZone.radius}
                                className={`radial-tool ${isToolEnabled(dropZone.tool) ? "" : "disabled"}`}
                                onPointerDown={() => commitAction(dropZone.tool, zone.zoneId)}
                                style={{ cursor: isToolEnabled(dropZone.tool) ? "pointer" : "not-allowed" }}
                              />
                              <text
                                x={dropZone.x}
                                y={dropZone.y + 4}
                                textAnchor="middle"
                                className="radial-tool-label"
                              >
                                {TOOL_LABEL[dropZone.tool]}
                              </text>
                            </g>
                          ))}
                      </g>
                    )}
                    </g>
                  );
                })}

                {payload.windField.map((sample, idx) => (
                  <line
                    key={`wind_${idx}`}
                    x1={sample.x}
                    y1={sample.y}
                    x2={sample.x + sample.dx * 24}
                    y2={sample.y + sample.dy * 24}
                    className="wind-sample"
                    style={{ opacity: 0.14 + sample.strength * 0.26 }}
                  />
                ))}

                <g className="wind-glyph" transform={`translate(628 34) rotate(${(windAngle * 180) / Math.PI})`}>
                  <path d="M -24 0 L 16 0 M 16 0 L 6 -8 M 16 0 L 6 8" />
                </g>

                {payload.assetSlots.map((slot) => (
                  <g key={slot.id} transform={`translate(${slot.x} ${slot.y})`}>
                    <rect
                      x={-28}
                      y={-18}
                      width={56}
                      height={36}
                      rx={11}
                      className={`asset-slot ${activeTool === slot.type ? "active" : ""} ${isToolEnabled(slot.type) ? "" : "disabled"}`}
                      role="button"
                      tabIndex={isToolEnabled(slot.type) ? 0 : -1}
                      onPointerDown={() => {
                        if (!isToolEnabled(slot.type)) {
                          return;
                        }
                        setActiveTool(slot.type);
                        setDragPoint({ x: slot.x, y: slot.y });
                      }}
                      onKeyDown={(event) => {
                        if (!isToolEnabled(slot.type) || !focusedZoneId) {
                          return;
                        }
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          commitAction(slot.type, focusedZoneId);
                        }
                      }}
                      style={{ cursor: isToolEnabled(slot.type) ? "grab" : "not-allowed" }}
                    />
                    <path d={TOOL_ICON_PATH[slot.type]} className="asset-slot-icon" />
                    <text x={12} y={4} className="asset-slot-label" textAnchor="middle">
                      {TOOL_LABEL[slot.type]}
                    </text>
                  </g>
                ))}

                {activeTool && dragPoint && (
                  <g className="drag-proxy">
                    <rect x={dragPoint.x - 22} y={dragPoint.y - 15} width={44} height={30} rx={10} className="drag-token" />
                    <path d={TOOL_ICON_PATH[activeTool]} className="asset-slot-icon" transform={`translate(${dragPoint.x - 8} ${dragPoint.y})`} />
                    <text x={dragPoint.x + 11} y={dragPoint.y + 4} textAnchor="middle" className="asset-slot-label">
                      {TOOL_LABEL[activeTool]}
                    </text>
                  </g>
                )}

                {dropFeedback && (
                  <circle
                    cx={dropFeedback.at.x}
                    cy={dropFeedback.at.y}
                    r={22 + pulse * 6}
                    className={`drop-feedback ${dropFeedback.valid ? "valid" : "invalid"}`}
                  />
                )}
              </g>
            </svg>
          </DepthParallaxGroup>

          <CanvasFxLayer className="map-fx fx-layer" width={MAP_WIDTH} height={MAP_HEIGHT} draw={draw} />
        </div>
      </LayeredScene>

      {focusedCell && (
        <div className="zone-focus-hud" aria-live="polite">
          <span className="zone-focus-name">{focusedCell.zoneName}</span>
          <div className="zone-focus-meters">
            <div className="zone-meter fire">
              <span style={{ width: `${focusedCell.fireLevel}%` }} />
            </div>
            <div className="zone-meter pop">
              <span style={{ width: `${Math.min(100, Math.round((focusedCell.population / 360) * 100))}%` }} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
