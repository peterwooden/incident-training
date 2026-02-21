import type { FireOpsPayload } from "@incident/shared";
import { LayeredScene, RimLight, ShadowCaster, SpecularOverlay, useAmbientMotionClock } from "../../visuals/core";
import { getVisualAsset } from "../../visuals/assets/manifest";

interface FireOpsPanelProps {
  payload: FireOpsPayload;
}

export function FireOpsPanel({ payload }: FireOpsPanelProps) {
  const bombPips = Array.from({ length: Math.max(1, payload.waterBombsAvailable + 2) }, (_, idx) => idx);
  const { pulse } = useAmbientMotionClock({ loopMs: 2100, paused: false });
  const waterPct = Math.max(0, Math.min(100, Math.round((payload.waterRemainingLiters / 20000) * 100)));

  return (
    <section className="scene-widget fire-ops-panel visual-heavy">
      <header className="widget-chip-row">
        <h3>Fire Ops</h3>
        <div className="chip-strip">
          <span className="chip warning">water {payload.waterBombsAvailable}</span>
          <span className="chip supporting">active {payload.burningZoneIds.length}</span>
        </div>
      </header>

      <LayeredScene className="visual-stage ops-stage cinematic-depth" depthPx={4} perspectivePx={720}>
        <ShadowCaster blurPx={12} opacity={0.3} offsetY={5} />
        <RimLight color="#95bfff" intensity={0.16 + pulse * 0.12} />
        <SpecularOverlay intensity={0.14} angleDeg={-14} />

        <div className="firefront-hero">
          <img src={getVisualAsset(payload.firefrontStageImageId)} alt="Firefront stage" className="firefront-hero-base" />
          {payload.firefrontOverlayImageId && (
            <img src={getVisualAsset(payload.firefrontOverlayImageId)} alt="" aria-hidden className="firefront-hero-overlay" />
          )}
        </div>

        <div className="ops-pips" aria-label="Water payloads">
          {bombPips.map((pip) => (
            <span key={pip} className={`ops-pip ${pip < payload.waterBombsAvailable ? "active" : "spent"}`} />
          ))}
        </div>
        <div className="resource-track">
          <span>Water {payload.waterRemainingLiters}L</span>
          <div className="resource-track-bar">
            <div className="resource-track-fill" style={{ width: `${waterPct}%` }} />
          </div>
        </div>

        <div className="zone-token-lane" aria-label="Burning sectors">
          {payload.burningZoneIds.map((zoneId) => (
            <article key={zoneId} className="zone-token hot">
              <span>{zoneId.replace("cell_", "Z")}</span>
              <span>HOT</span>
            </article>
          ))}
        </div>
        <div className="lane-stack">
          {payload.updates.slice(0, 3).map((update) => (
            <article key={update.id} className={`briefing-card severity-${update.severity}`}>
              <p>{update.text}</p>
            </article>
          ))}
        </div>
      </LayeredScene>
    </section>
  );
}
