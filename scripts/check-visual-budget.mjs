#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const gameplayPanels = [
  "apps/web/src/game-ui/panels/bomb/BombDeviceConsolePanel.tsx",
  "apps/web/src/game-ui/panels/bomb/BombRulebookPanel.tsx",
  "apps/web/src/game-ui/panels/bomb/BombSafetyTelemetryPanel.tsx",
  "apps/web/src/game-ui/panels/bomb/BombCoordinationBoardPanel.tsx",
  "apps/web/src/game-ui/panels/bushfire/BushfireMapPanel.tsx",
  "apps/web/src/game-ui/panels/bushfire/FireOpsPanel.tsx",
  "apps/web/src/game-ui/panels/bushfire/PoliceOpsPanel.tsx",
  "apps/web/src/game-ui/panels/bushfire/PublicInfoPanel.tsx",
  "apps/web/src/game-ui/panels/bushfire/IncidentCommandPanel.tsx",
];

const bannedButtonLabels = [
  /\bcrew\b/i,
  /\bwater\b/i,
  /\bfirebreak\b/i,
  /\broadblock\b/i,
  /\bdeploy\b/i,
  /\bpublish advisory\b/i,
];

const issues = [];

for (const file of gameplayPanels) {
  const path = resolve(process.cwd(), file);
  const source = readFileSync(path, "utf8");

  const denseLists = [...source.matchAll(/<(ul|ol)\b/g)].length;
  if (denseLists > 0) {
    issues.push(`${file}: dense list markup (<ul>/<ol>) is not allowed in live gameplay panels`);
  }

  const buttons = [...source.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)];
  for (const match of buttons) {
    const normalized = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!normalized) {
      continue;
    }
    if (bannedButtonLabels.some((pattern) => pattern.test(normalized))) {
      issues.push(`${file}: generic action button label found ("${normalized}")`);
    }
  }
}

if (issues.length > 0) {
  console.error("Visual budget check failed:\n");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("Visual budget check passed.");
