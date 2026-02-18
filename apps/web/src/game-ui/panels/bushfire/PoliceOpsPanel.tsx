import type { PoliceOpsPayload } from "@incident/shared";
import { LayeredScene, RimLight, ShadowCaster, SpecularOverlay, useAmbientMotionClock } from "../../visuals/core";

interface PoliceOpsPanelProps {
  payload: PoliceOpsPayload;
}

export function PoliceOpsPanel({ payload }: PoliceOpsPanelProps) {
  const { pulse } = useAmbientMotionClock({ loopMs: 2300, paused: false });

  return (
    <section className="scene-panel police-ops-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Police Ops</h3>
        <div className="chip-strip">
          <span className="chip">evac {payload.evacuationZoneIds.length}</span>
          <span className="chip warning">blocked {payload.blockedZoneIds.length}</span>
        </div>
      </header>

      <LayeredScene className="visual-stage ops-stage cinematic-depth" depthPx={4} perspectivePx={760}>
        <ShadowCaster blurPx={14} opacity={0.32} offsetY={6} />
        <RimLight color="#ffd6c4" intensity={0.18 + pulse * 0.12} />
        <SpecularOverlay intensity={0.14} angleDeg={-12} />

        <div className="lane-stack">
          <div className="lane-card">
            <h4>Evac Corridors</h4>
            <div className="zone-token-lane">
              {payload.evacuationZoneIds.map((zoneId) => (
                <span key={zoneId} className="zone-token evac">{zoneId.replace("cell_", "Z")}</span>
              ))}
            </div>
          </div>

          <div className="lane-card">
            <h4>Roadblocks</h4>
            <div className="zone-token-lane">
              {payload.blockedZoneIds.map((zoneId) => (
                <span key={zoneId} className="zone-token blocked">{zoneId.replace("cell_", "Z")}</span>
              ))}
            </div>
          </div>
        </div>
      </LayeredScene>
    </section>
  );
}
