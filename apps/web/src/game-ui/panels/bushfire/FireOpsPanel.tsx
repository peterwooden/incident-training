import type { FireOpsPayload } from "@incident/shared";

interface FireOpsPanelProps {
  payload: FireOpsPayload;
}

export function FireOpsPanel({ payload }: FireOpsPanelProps) {
  const bombPips = Array.from({ length: Math.max(1, payload.waterBombsAvailable + 2) }, (_, idx) => idx);

  return (
    <section className="scene-panel fire-ops-panel visual-heavy">
      <header className="panel-chip-row">
        <h3>Fire Ops</h3>
        <div className="chip-strip">
          <span className="chip warning">water {payload.waterBombsAvailable}</span>
          <span className="chip supporting">active {payload.burningZoneIds.length}</span>
        </div>
      </header>

      <div className="visual-stage ops-stage">
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
      </div>
    </section>
  );
}
