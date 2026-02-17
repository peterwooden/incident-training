import type { GameMode, IncidentRole } from "@incident/shared";

const ROLE_POOLS: Record<GameMode, IncidentRole[]> = {
  "bomb-defusal": [
    "Lead Coordinator",
    "Device Specialist",
    "Manual Analyst",
    "Safety Officer",
    "Observer",
  ],
  "bushfire-command": [
    "Incident Controller",
    "Fire Operations SME",
    "Police Operations SME",
    "Public Information Officer",
    "Observer",
  ],
};

export function rolesForMode(mode: GameMode): IncidentRole[] {
  return ROLE_POOLS[mode];
}

export function defaultRoleForMode(mode: GameMode): IncidentRole {
  return rolesForMode(mode)[0] ?? "Observer";
}

export function isRoleAllowed(mode: GameMode, role: IncidentRole): boolean {
  return rolesForMode(mode).includes(role);
}
