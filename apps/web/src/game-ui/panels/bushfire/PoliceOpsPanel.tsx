import type { PoliceOpsPayload } from "@incident/shared";

interface PoliceOpsPanelProps {
  payload: PoliceOpsPayload;
}

export function PoliceOpsPanel({ payload }: PoliceOpsPanelProps) {
  return (
    <section className="scene-panel police-ops-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Police Ops</h3>
        <div className="chip-strip">
          <span className="chip">evac {payload.evacuationZoneIds.length}</span>
          <span className="chip warning">blocked {payload.blockedZoneIds.length}</span>
        </div>
      </header>

      <div className="visual-stage ops-stage">
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
      </div>
    </section>
  );
}
