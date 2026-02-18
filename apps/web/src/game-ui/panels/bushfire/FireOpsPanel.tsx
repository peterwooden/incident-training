import type { FireOpsPayload } from "@incident/shared";
import { LayeredScene, RimLight, ShadowCaster, SpecularOverlay, useAmbientMotionClock } from "../../visuals/core";

interface FireOpsPanelProps {
  payload: FireOpsPayload;
}

export function FireOpsPanel({ payload }: FireOpsPanelProps) {
  const bombPips = Array.from({ length: Math.max(1, payload.waterBombsAvailable + 2) }, (_, idx) => idx);
  const { pulse } = useAmbientMotionClock({ loopMs: 2100, paused: false });

  return (
    <section className="scene-panel fire-ops-panel visual-heavy">
      <header className="panel-chip-row">
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

        <div className="ops-pips" aria-label="Water payloads">
          {bombPips.map((pip) => (
            <span key={pip} className={`ops-pip ${pip < payload.waterBombsAvailable ? "active" : "spent"}`} />
          ))}
        </div>

        <div className="zone-token-lane" aria-label="Burning sectors">
          {payload.burningZoneIds.map((zoneId) => (
            <article key={zoneId} className="zone-token hot">
              <span>{zoneId.replace("cell_", "Z")}</span>
              <span>HOT</span>
            </article>
          ))}
        </div>
      </LayeredScene>
    </section>
  );
}
