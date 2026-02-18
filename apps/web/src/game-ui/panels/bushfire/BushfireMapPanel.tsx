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
const MAP_HEIGHT = 360;

const TOOL_LABEL: Record<BushfireToolType, string> = {
  crew: "CR",
  water: "WT",
  firebreak: "FB",
  roadblock: "RB",
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
    <section className="scene-panel bushfire-map-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Town Firefront</h3>
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
              aria-label="Bushfire map"
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
                <linearGradient id="zoneFill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1f2d45" />
                  <stop offset="100%" stopColor="#172234" />
                </linearGradient>
              </defs>

              <BushfireTerrainLayer payload={payload} />

              {payload.zonePolygons.map((zone) => {
                const cell = cellById.get(zone.zoneId);
                if (!cell) {
                  return null;
                }
                const center = centroid(zone.points);
                const severity = Math.max(0.15, Math.min(1, cell.fireLevel / 100));
                const selected = focusedZoneId === zone.zoneId;

                return (
                  <g key={zone.zoneId}>
                    <polygon
                      points={zone.points.map((point) => `${point.x},${point.y}`).join(" ")}
                      className={`map-zone ${selected ? "focused" : ""}`}
                      style={{ opacity: 0.68 + severity * 0.24, cursor: "pointer" }}
                      onPointerDown={() => setFocusedZoneId(zone.zoneId)}
                    />

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

                    <circle cx={center.x} cy={center.y} r={16 + severity * 18} className="zone-heat" />
                    <text x={center.x} y={center.y - 12} className="zone-name" textAnchor="middle">{cell.zoneName}</text>
                    <text x={center.x} y={center.y + 6} className="zone-meta" textAnchor="middle">F{cell.fireLevel}%</text>
                    <text x={center.x} y={center.y + 21} className="zone-meta" textAnchor="middle">P{cell.population}</text>

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
                  style={{ opacity: 0.18 + sample.strength * 0.34 }}
                />
              ))}

              <g className="wind-glyph" transform={`translate(650 34) rotate(${(windAngle * 180) / Math.PI})`}>
                <path d="M -24 0 L 16 0 M 16 0 L 6 -8 M 16 0 L 6 8" />
              </g>

              {payload.assetSlots.map((slot) => (
                <g key={slot.id}>
                  <circle
                    cx={slot.x}
                    cy={slot.y}
                    r={22}
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
                  <text x={slot.x} y={slot.y + 5} className="asset-slot-label" textAnchor="middle">
                    {TOOL_LABEL[slot.type]}
                  </text>
                </g>
              ))}

              {activeTool && dragPoint && (
                <g className="drag-proxy">
                  <circle cx={dragPoint.x} cy={dragPoint.y} r={20} className="drag-token" />
                  <text x={dragPoint.x} y={dragPoint.y + 5} textAnchor="middle" className="asset-slot-label">
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
            </svg>
          </DepthParallaxGroup>

          <CanvasFxLayer className="map-fx fx-layer" width={MAP_WIDTH} height={MAP_HEIGHT} draw={draw} />
        </div>
      </LayeredScene>
    </section>
  );
}
