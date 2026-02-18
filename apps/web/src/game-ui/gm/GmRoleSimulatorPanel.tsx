import type { IncidentRole } from "@incident/shared";

interface GmRoleSimulatorPanelProps {
  roleOptions: IncidentRole[];
  simulatedRole?: IncidentRole;
  onSimulateRole: (role?: IncidentRole) => void;
}

export function GmRoleSimulatorPanel({
  roleOptions,
  simulatedRole,
  onSimulateRole,
}: GmRoleSimulatorPanelProps) {
  return (
    <section className="gm-role-simulator">
      <h4>Role Simulation</h4>
      <select
        value={simulatedRole ?? ""}
        onChange={(event) => onSimulateRole(event.target.value ? (event.target.value as IncidentRole) : undefined)}
      >
        <option value="">None</option>
        {roleOptions.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </section>
  );
}
