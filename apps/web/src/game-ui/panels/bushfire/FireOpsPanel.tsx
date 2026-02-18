import type { FireOpsPayload } from "@incident/shared";

interface FireOpsPanelProps {
  payload: FireOpsPayload;
}

export function FireOpsPanel({ payload }: FireOpsPanelProps) {
  return (
    <section className="scene-panel fire-ops-panel">
      <h3>Fire Ops Console</h3>
      <p>Water bombs available: {payload.waterBombsAvailable}</p>
      <p>{payload.note}</p>
      <ul>
        {payload.burningZoneIds.map((zoneId) => (
          <li key={zoneId}>{zoneId}</li>
        ))}
      </ul>
    </section>
  );
}
