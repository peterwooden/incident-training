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
      <div className="sim-role-grid">
        <button
          type="button"
          className={`sim-role-chip ${simulatedRole ? "" : "active"}`}
          onClick={() => onSimulateRole(undefined)}
        >
          Full GM
        </button>
        {roleOptions.map((role) => (
          <button
            type="button"
            key={role}
            className={`sim-role-chip ${simulatedRole === role ? "active" : ""}`}
            onClick={() => onSimulateRole(role)}
          >
            {role}
          </button>
        ))}
      </div>
    </section>
  );
}
