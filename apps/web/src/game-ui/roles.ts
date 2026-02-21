import type { GameMode, IncidentRole } from "@incident/shared";

const BUSHFIRE_ROLE_ALIASES: Partial<Record<IncidentRole, string>> = {
  "Incident Controller": "Mayor",
  "Fire Operations SME": "Firefighter",
  "Police Operations SME": "Police Officer",
  "Public Information Officer": "Radio Host",
  Meteorologist: "Meteorologist",
};

export function roleLabelForMode(mode: GameMode, role: IncidentRole): string {
  if (mode === "bushfire-command") {
    const alias = BUSHFIRE_ROLE_ALIASES[role];
    if (alias && alias !== role) {
      return `${alias} (${role})`;
    }
  }
  return role;
}
