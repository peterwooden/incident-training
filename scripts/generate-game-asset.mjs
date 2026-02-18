#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_SOURCE_FILE = "scripts/asset-prompts.json";

function printUsage(exitCode = 0) {
  const lines = [
    "Generate game art assets via trusted provider APIs (OpenAI or Gemini).",
    "",
    "Single asset mode:",
    "  node scripts/generate-game-asset.mjs --provider <openai|gemini> --prompt \"...\" --out <path>",
    "",
    "Source compile mode:",
    "  node scripts/generate-game-asset.mjs --source scripts/asset-prompts.json --all",
    "  node scripts/generate-game-asset.mjs --source scripts/asset-prompts.json --asset bomb-chassis-hero",
    "",
    "Common options:",
    "  --source <file>              Source manifest JSON",
    "  --asset <id[,id,...]>        Compile only selected source asset IDs",
    "  --all                        Compile every source asset",
    "  --list                       List asset IDs in source and exit",
    "  --dry-run                    Show planned compile tasks without API calls",
    "  --env-file <path>            Override env file path (default: .env)",
    "",
    "Single mode options:",
    "  --provider <openai|gemini>   Default: openai",
    "  --prompt <text>              Required in single mode",
    "  --out <file>                 Required in single mode",
    "  --n <count>                  Number of images (default: 1)",
    "",
    "OpenAI options:",
    "  --model <id>                 Default: gpt-image-1",
    "  --size <WxH>                 Default: 1536x1024",
    "  --quality <low|medium|high>  Default: high",
    "  --background <transparent|opaque>  Default: transparent",
    "  --format <png|jpeg|webp>     Default: png",
    "",
    "Gemini options:",
    "  --model <id>                 Default: gemini-2.5-flash-image",
    "  --aspect <1:1|4:3|3:4|16:9|9:16>  Default: 16:9",
    "",
    "Env vars (auto-loaded from .env if present):",
    "  OPENAI_API_KEY",
    "  GEMINI_API_KEY",
  ];
  console.log(lines.join("\n"));
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function isTrue(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function extensionFromMimeType(mimeType) {
  if (!mimeType) {
    return "png";
  }
  if (mimeType.includes("png")) {
    return "png";
  }
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }
  if (mimeType.includes("webp")) {
    return "webp";
  }
  return "png";
}

function deriveOutputPath(baseOut, index, total, fallbackExt) {
  const parsed = path.parse(baseOut);
  const finalExt = parsed.ext || `.${fallbackExt}`;
  if (total === 1) {
    return path.join(parsed.dir, `${parsed.name}${finalExt}`);
  }
  const suffix = `-${String(index + 1).padStart(2, "0")}`;
  return path.join(parsed.dir, `${parsed.name}${suffix}${finalExt}`);
}

function parseEnvLine(line) {
  const clean = line.trim();
  if (!clean || clean.startsWith("#")) {
    return null;
  }

  const normalized = clean.startsWith("export ") ? clean.slice(7).trim() : clean;
  const splitIdx = normalized.indexOf("=");
  if (splitIdx <= 0) {
    return null;
  }

  const key = normalized.slice(0, splitIdx).trim();
  let value = normalized.slice(splitIdx + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  value = value.replace(/\\n/g, "\n");
  return { key, value };
}

async function loadEnvFileIfPresent(envFilePath) {
  try {
    const content = await readFile(envFilePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        continue;
      }
      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value;
      }
    }
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function fetchImageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image URL: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateViaOpenAI(config) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = config.model ?? "gpt-image-1";
  const size = config.size ?? "1536x1024";
  const quality = config.quality ?? "high";
  const background = config.background ?? "transparent";
  const format = config.format ?? "png";
  const n = toInt(config.n, 1);
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/images/generations`;

  const requestBody = {
    model,
    prompt: config.prompt,
    n,
    size,
    quality,
    background,
    output_format: format,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`OpenAI error ${response.status}: ${JSON.stringify(payload)}`);
  }

  const items = Array.isArray(payload.data) ? payload.data : [];
  if (items.length === 0) {
    throw new Error("OpenAI returned no image data.");
  }

  const images = [];
  for (const item of items.slice(0, n)) {
    if (item.b64_json) {
      images.push({ buffer: Buffer.from(item.b64_json, "base64"), mimeType: `image/${format}` });
      continue;
    }
    if (item.url) {
      const buffer = await fetchImageBuffer(item.url);
      images.push({ buffer, mimeType: `image/${format}` });
    }
  }
  return images;
}

async function generateViaGemini(config) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const model = config.model ?? "gemini-2.5-flash-image";
  const aspect = config.aspect ?? "16:9";
  const n = toInt(config.n, 1);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: config.prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: aspect,
      },
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Gemini error ${response.status}: ${JSON.stringify(payload)}`);
  }

  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const images = [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData ?? part.inline_data;
      if (!inline?.data) {
        continue;
      }
      images.push({
        buffer: Buffer.from(inline.data, "base64"),
        mimeType: inline.mimeType ?? inline.mime_type ?? "image/png",
      });
      if (images.length >= n) {
        return images;
      }
    }
  }

  if (images.length === 0) {
    throw new Error("Gemini returned no image bytes.");
  }
  return images;
}

function normalizeConfig(base) {
  return {
    ...base,
    provider: String(base.provider ?? "openai").toLowerCase(),
    n: toInt(base.n, 1),
  };
}

function ensureTaskConfig(config, contextLabel) {
  if (!config.prompt) {
    throw new Error(`${contextLabel}: missing prompt`);
  }
  if (!config.out) {
    throw new Error(`${contextLabel}: missing out`);
  }
  if (!config.provider) {
    throw new Error(`${contextLabel}: missing provider`);
  }
}

async function writeGeneratedImages(config, images) {
  await mkdir(path.dirname(config.out), { recursive: true });
  const writtenPaths = [];
  for (let i = 0; i < images.length; i += 1) {
    const image = images[i];
    const fallbackExt = extensionFromMimeType(image.mimeType);
    const outputPath = deriveOutputPath(config.out, i, images.length, fallbackExt);
    await writeFile(outputPath, image.buffer);
    writtenPaths.push(outputPath);
  }
  return writtenPaths;
}

async function compileTask(config) {
  const normalized = normalizeConfig(config);
  ensureTaskConfig(normalized, normalized.id ?? normalized.out);

  let images;
  if (normalized.provider === "openai") {
    images = await generateViaOpenAI(normalized);
  } else if (normalized.provider === "gemini") {
    images = await generateViaGemini(normalized);
  } else {
    throw new Error(`Unsupported provider: ${normalized.provider}`);
  }

  return writeGeneratedImages(normalized, images);
}

async function loadSourceManifest(sourcePath) {
  const raw = await readFile(sourcePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid source manifest.");
  }
  const defaults = parsed.defaults && typeof parsed.defaults === "object" ? parsed.defaults : {};
  const assets = Array.isArray(parsed.assets) ? parsed.assets : [];
  return { defaults, assets };
}

function parseAssetIdFilter(raw) {
  if (!raw) {
    return [];
  }
  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function listSourceAssets(assets) {
  for (const asset of assets) {
    if (asset?.id) {
      console.log(asset.id);
    }
  }
}

function buildSourceTasks(manifest, args) {
  const requestedIds = parseAssetIdFilter(args.asset);
  const allSourceTasks = manifest.assets.map((asset) => normalizeConfig({ ...manifest.defaults, ...asset }));

  if (requestedIds.length === 0) {
    return allSourceTasks;
  }

  const filtered = allSourceTasks.filter((task) => requestedIds.includes(String(task.id)));
  if (filtered.length !== requestedIds.length) {
    const found = new Set(filtered.map((task) => String(task.id)));
    const missing = requestedIds.filter((id) => !found.has(id));
    throw new Error(`Unknown source asset id(s): ${missing.join(", ")}`);
  }
  return filtered;
}

async function compileFromSource(args) {
  const sourcePath = path.resolve(String(args.source || DEFAULT_SOURCE_FILE));
  const manifest = await loadSourceManifest(sourcePath);

  if (isTrue(args.list)) {
    listSourceAssets(manifest.assets);
    return;
  }

  const tasks = buildSourceTasks(manifest, args);
  if (tasks.length === 0) {
    throw new Error("No source tasks to compile.");
  }

  if (isTrue(args["dry-run"])) {
    for (const task of tasks) {
      console.log(`[dry-run] ${task.id ?? task.out} -> ${task.out}`);
    }
    return;
  }

  for (const task of tasks) {
    const written = await compileTask(task);
    console.log(`Generated ${written.length} image asset(s) for ${task.id ?? task.out}:`);
    for (const outPath of written) {
      console.log(`- ${outPath}`);
    }
  }
}

async function compileSingle(args) {
  const config = normalizeConfig({
    provider: args.provider ?? "openai",
    prompt: args.prompt,
    out: args.out,
    n: args.n,
    model: args.model,
    size: args.size,
    quality: args.quality,
    background: args.background,
    format: args.format,
    aspect: args.aspect,
  });

  ensureTaskConfig(config, "single mode");

  if (isTrue(args["dry-run"])) {
    console.log(`[dry-run] single -> ${config.out}`);
    return;
  }

  const written = await compileTask(config);
  console.log(`Generated ${written.length} image asset(s):`);
  for (const outPath of written) {
    console.log(`- ${outPath}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (isTrue(args.help) || isTrue(args.h)) {
    printUsage(0);
  }

  const envFilePath = path.resolve(String(args["env-file"] || ".env"));
  await loadEnvFileIfPresent(envFilePath);

  if (args.source || isTrue(args.all) || isTrue(args.list) || args.asset) {
    await compileFromSource(args);
    return;
  }

  await compileSingle(args);
}

main().catch((error) => {
  console.error(String(error?.message ?? error));
  process.exit(1);
});
