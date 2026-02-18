import { useMemo, useState } from "react";
import type { BombRulebookPayload, FxProfile, ManualHotspot } from "@incident/shared";
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

interface BombRulebookPanelProps {
  payload: BombRulebookPayload;
  currentPage: number;
  onChangePage: (index: number) => void;
  fxProfile: FxProfile;
  ambientLoopMs: number;
  hoverDepthPx: number;
}

export function BombRulebookPanel({
  payload,
  currentPage,
  onChangePage,
  fxProfile,
  ambientLoopMs,
  hoverDepthPx,
}: BombRulebookPanelProps) {
  const safeIndex = Math.max(0, Math.min(currentPage, payload.spreads.length - 1));
  const spread = payload.spreads[safeIndex];
  const [activeHotspot, setActiveHotspot] = useState<ManualHotspot | undefined>(undefined);

  const pageLabel = useMemo(() => `${safeIndex + 1}/${payload.spreads.length}`, [safeIndex, payload.spreads.length]);
  const { pulse } = useAmbientMotionClock({ loopMs: Math.max(1500, ambientLoopMs), paused: fxProfile === "reduced" });
  const { offsetX, offsetY, bind } = usePointerDepthState(hoverDepthPx);

  if (!spread) {
    return null;
  }

  const onNextPage = () => onChangePage(Math.min(payload.spreads.length - 1, safeIndex + 1));
  const onPrevPage = () => onChangePage(Math.max(0, safeIndex - 1));

  return (
    <section className="scene-panel bomb-rulebook-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Manual Flipbook</h3>
        <div className="chip-strip">
          <span className="chip">{pageLabel}</span>
          <span className="chip supporting">hotspots {spread.hotspots.length}</span>
        </div>
      </header>

      <LayeredScene className="visual-stage rulebook-stage cinematic-depth" depthPx={hoverDepthPx} perspectivePx={980}>
        <div className="manual-stage-root" {...bind}>
          <ShadowCaster blurPx={20} opacity={0.38} offsetY={12} />
          <RimLight color="#f6d9ad" intensity={0.24 + pulse * 0.2} />
          <SpecularOverlay intensity={0.32} angleDeg={-24} />

          <DepthParallaxGroup offsetX={offsetX} offsetY={offsetY} depth={0.38}>
            <img src={getVisualAsset(spread.spreadBackgroundAssetId)} className="manual-desk-backdrop" alt="" aria-hidden="true" />
          </DepthParallaxGroup>

          <DepthParallaxGroup offsetX={offsetX} offsetY={offsetY} depth={0.62}>
            <svg viewBox="0 0 760 440" className="geometry-layer" preserveAspectRatio="xMidYMid meet" aria-label="Illustrated manual page">
              <defs>
                <pattern id="paperTexture" width="12" height="12" patternUnits="userSpaceOnUse">
                  <image href={getVisualAsset(spread.paperNormalAssetId)} width="12" height="12" opacity="0.3" />
                </pattern>
                <linearGradient id="pageEdge" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f3e8d1" />
                  <stop offset="100%" stopColor="#d9cab2" />
                </linearGradient>
                <linearGradient id="cornerCurl" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f8f0df" />
                  <stop offset="100%" stopColor="#cbbda8" />
                </linearGradient>
              </defs>

              <rect x={22} y={20} width={716} height={398} rx={20} className="manual-page-shadow" />
              <rect x={18} y={16} width={712} height={394} rx={18} className="manual-page" />
              <rect x={18} y={16} width={712} height={394} rx={18} fill="url(#paperTexture)" opacity="0.32" />
              <rect x={18} y={16} width={712} height={394} rx={18} fill="url(#pageEdge)" opacity="0.12" />
              <image href={getVisualAsset(spread.creaseMapAssetId)} x={18} y={16} width={712} height={394} opacity={0.14} />
              <text x={44} y={58} className="manual-title">{spread.title}</text>

              {spread.diagramLayers.map((layer) => (
                <polyline
                  key={layer.id}
                  points={layer.points.map((point) => `${point.x},${point.y}`).join(" ")}
                  className={`manual-diagram ${layer.type} ${layer.depth}`}
                  style={{ stroke: layer.stroke, fill: layer.fill }}
                />
              ))}

              {spread.diagramAssets.map((asset) => (
                <polyline
                  key={asset.id}
                  points={asset.points.map((point) => `${point.x},${point.y}`).join(" ")}
                  className={`manual-diagram ${asset.type}`}
                />
              ))}

              {spread.calloutPins.map((pin) => (
                <g key={pin.id} className="manual-pin">
                  <circle cx={pin.x} cy={pin.y} r={10} />
                  <line x1={pin.x} y1={pin.y} x2={pin.x - 30} y2={pin.y + 22} />
                </g>
              ))}

              <path
                d={`M ${spread.turnHintPath[0]?.x ?? 690} ${spread.turnHintPath[0]?.y ?? 350} Q ${spread.turnHintPath[1]?.x ?? 728} ${spread.turnHintPath[1]?.y ?? 372} ${spread.turnHintPath[2]?.x ?? 710} ${spread.turnHintPath[2]?.y ?? 408} Z`}
                fill="url(#cornerCurl)"
                className="manual-corner-curl"
                onPointerDown={onNextPage}
              />

              <g className="manual-secondary-page" aria-hidden="true">
                <rect x={48} y={308} width={664} height={92} rx={14} className="manual-secondary-shadow" />
                <rect x={42} y={300} width={664} height={92} rx={14} className="manual-secondary-body" />
                <polyline points="72,332 132,324 194,338 248,320 306,334 360,320 420,336" className="manual-secondary-line" />
                <polyline points="72,360 134,352 192,368 248,352 304,368 360,352 420,366" className="manual-secondary-line" />
                <rect x={522} y={320} width={154} height={22} rx={8} className="manual-secondary-card" />
                <rect x={522} y={352} width={154} height={22} rx={8} className="manual-secondary-card" />
                <circle cx={486} cy={344} r={22} className="manual-secondary-emblem" />
                <circle cx={486} cy={344} r={10} className="manual-secondary-emblem-core" />
              </g>
            </svg>
          </DepthParallaxGroup>

          <svg viewBox="0 0 760 440" className="interaction-layer" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            {spread.hotspots.map((spot) => (
              <rect
                key={spot.id}
                x={spot.x}
                y={spot.y}
                width={spot.width}
                height={spot.height}
                rx={8}
                className="manual-hotspot"
                onPointerDown={() => setActiveHotspot(spot)}
                style={{ cursor: "pointer" }}
                tabIndex={0}
                role="button"
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveHotspot(spot);
                  }
                }}
              />
            ))}

            <path
              d="M 22 188 C 16 212 16 252 22 276"
              className="manual-page-tab prev"
              onPointerDown={onPrevPage}
            />
          </svg>
        </div>
      </LayeredScene>

      <div className="rulebook-controls cinematic-tabs">
        <button className="icon-btn" onClick={onPrevPage} disabled={safeIndex === 0}>
          ◀
        </button>
        <button
          className="icon-btn"
          onClick={onNextPage}
          disabled={safeIndex >= payload.spreads.length - 1}
        >
          ▶
        </button>
      </div>

      {activeHotspot && (
        <div className="hotspot-detail" role="status">
          <strong>{activeHotspot.label}</strong>
          <span>{activeHotspot.detail}</span>
        </div>
      )}
    </section>
  );
}
