import type { PoliceOpsPayload } from "@incident/shared";

interface PoliceOpsPanelProps {
  payload: PoliceOpsPayload;
}

export function PoliceOpsPanel({ payload }: PoliceOpsPanelProps) {
  return (
    <section className="scene-panel police-ops-panel">
      <h3>Police Ops Console</h3>
      <p>{payload.note}</p>
      <h4>Evac Zones</h4>
      <ul>
        {payload.evacuationZoneIds.map((zoneId) => (
          <li key={zoneId}>{zoneId}</li>
        ))}
      </ul>
      <h4>Blocked Zones</h4>
      <ul>
        {payload.blockedZoneIds.map((zoneId) => (
          <li key={zoneId}>{zoneId}</li>
        ))}
      </ul>
    </section>
  );
}
