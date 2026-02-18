import type { IncidentCommandPayload } from "@incident/shared";

interface IncidentCommandPanelProps {
  payload: IncidentCommandPayload;
}

export function IncidentCommandPanel({ payload }: IncidentCommandPanelProps) {
  return (
    <section className="scene-panel incident-command-panel">
      <h3>Incident Command Console</h3>
      <p>Containment: {payload.containment}%</p>
      <h4>Objectives</h4>
      <ul>
        {payload.strategicObjectives.map((objective, idx) => (
          <li key={`${objective}-${idx}`}>{objective}</li>
        ))}
      </ul>
      <h4>Top Risks</h4>
      <ul>
        {payload.topRisks.map((risk, idx) => (
          <li key={`${risk}-${idx}`}>{risk}</li>
        ))}
      </ul>
    </section>
  );
}
