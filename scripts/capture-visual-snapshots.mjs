#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.WEB_URL ?? "http://127.0.0.1:4173";
const outDir = process.env.VISUAL_SNAPSHOT_DIR ?? "artifacts/visual-regression";

mkdirSync(outDir, { recursive: true });

const shots = [
  { testId: "fixture-bomb-device", file: "bomb-device.png" },
  { testId: "fixture-bomb-manual", file: "bomb-manual.png" },
  { testId: "fixture-bushfire-map", file: "bushfire-map.png" },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });

try {
  await page.goto(`${baseUrl}/visual-regression`, { waitUntil: "networkidle", timeout: 30_000 });

  for (const shot of shots) {
    const locator = page.getByTestId(shot.testId);
    await locator.scrollIntoViewIfNeeded();
    await locator.screenshot({ path: join(outDir, shot.file) });
  }
} finally {
  await browser.close();
}

console.log(`Saved visual snapshots to ${outDir}`);
