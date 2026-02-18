#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function printUsage(exitCode = 0) {
  const lines = [
    "Generate game art assets via trusted provider APIs (OpenAI or Gemini).",
    "",
    "Usage:",
    "  node scripts/generate-game-asset.mjs --provider <openai|gemini> --prompt \"...\" --out <path>",
    "",
    "Common options:",
    "  --provider <openai|gemini>   Default: openai",
    "  --prompt <text>              Required",
    "  --out <file>                 Required output path",
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
    "Env vars:",
    "  OPENAI_API_KEY   Required for provider=openai",
    "  GEMINI_API_KEY   Required for provider=gemini",
    "",
    "Examples:",
    "  npm run asset:gen:openai -- --prompt \"cinematic bomb console concept art, no text\" --out apps/web/src/game-ui/visuals/assets/generated/bomb-console.png",
    "  npm run asset:gen:gemini -- --prompt \"top-down lush bushfire town map, green terrain, roads, river\" --out apps/web/src/game-ui/visuals/assets/generated/town-map.png",
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

async function generateViaOpenAI({ prompt, n, args }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const model = args.model ?? "gpt-image-1";
  const size = args.size ?? "1536x1024";
  const quality = args.quality ?? "high";
  const background = args.background ?? "transparent";
  const format = args.format ?? "png";
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/images/generations`;

  const requestBody = {
    model,
    prompt,
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

async function generateViaGemini({ prompt, n, args }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const model = args.model ?? "gemini-2.5-flash-image";
  const aspect = args.aspect ?? "16:9";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help === "true" || args.h === "true") {
    printUsage(0);
  }

  const prompt = args.prompt;
  const out = args.out;
  if (!prompt || !out) {
    printUsage(1);
  }

  const provider = String(args.provider ?? "openai").toLowerCase();
  const n = toInt(args.n, 1);

  let images;
  if (provider === "openai") {
    images = await generateViaOpenAI({ prompt, n, args });
  } else if (provider === "gemini") {
    images = await generateViaGemini({ prompt, n, args });
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  await mkdir(path.dirname(out), { recursive: true });

  const writtenPaths = [];
  for (let i = 0; i < images.length; i += 1) {
    const image = images[i];
    const fallbackExt = extensionFromMimeType(image.mimeType);
    const outputPath = deriveOutputPath(out, i, images.length, fallbackExt);
    await writeFile(outputPath, image.buffer);
    writtenPaths.push(outputPath);
  }

  console.log(`Generated ${writtenPaths.length} image asset(s):`);
  for (const item of writtenPaths) {
    console.log(`- ${item}`);
  }
}

main().catch((error) => {
  console.error(String(error?.message ?? error));
  process.exit(1);
});
