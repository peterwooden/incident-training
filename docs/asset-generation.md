# AI Asset Generation (OpenAI + Gemini)

This repo includes a local script to generate image assets directly into the game visual folders using official provider APIs.

## Why this path

- Trusted providers only: OpenAI and Google Gemini official endpoints.
- Your own account keys: no third-party relay service.
- Works with current `SVG+Canvas` scene panel architecture (generate textures/sprites, then compose in UI).

## Script

`/Users/peterwooden/incident-training-rpg/scripts/generate-game-asset.mjs`

## Prerequisites

1. Set one API key:
   - `OPENAI_API_KEY` for OpenAI
   - `GEMINI_API_KEY` for Google Gemini
2. Pick output path in your local asset tree, e.g.:
   - `/Users/peterwooden/incident-training-rpg/apps/web/src/game-ui/visuals/assets/generated/`

## Commands

OpenAI:

```bash
npm run asset:gen:openai -- \
  --prompt "top-down lush bushfire town map, green terrain, roads, river, no labels" \
  --out apps/web/src/game-ui/visuals/assets/generated/bushfire-town-map.png \
  --size 1536x1024 \
  --quality high \
  --background opaque
```

Gemini:

```bash
npm run asset:gen:gemini -- \
  --prompt "cinematic bomb console panel, industrial metal, layered electronics, no text" \
  --out apps/web/src/game-ui/visuals/assets/generated/bomb-console.png \
  --aspect 16:9
```

Multi-image batch:

```bash
npm run asset:gen:openai -- \
  --prompt "wildfire map landmark icons, emergency services, transparent background" \
  --out apps/web/src/game-ui/visuals/assets/generated/landmarks/icon.png \
  --n 4
```

When `--n > 1`, files are suffixed automatically (`icon-01.png`, `icon-02.png`, ...).

## Prompt presets

Preset starter prompts are in:

`/Users/peterwooden/incident-training-rpg/scripts/asset-prompts.json`

## Recommended production workflow

1. Generate broad concepts at medium quality.
2. Pick top candidate and regenerate with tighter art direction.
3. Cut/optimize in local tooling.
4. Import into panel layers (`map`, `bomb`, `manual`) with deterministic game-state overlays.

## Notes on `llm` CLI (Simon Willison)

`llm` is useful for prompt iteration and multimodal experimentation, but this repo uses direct official API calls for deterministic image-file output into the asset pipeline.

## Primary references

- OpenAI image generation guide: <https://platform.openai.com/docs/guides/image-generation>
- Google Gemini image generation guide: <https://ai.google.dev/gemini-api/docs/image-generation>
- Simon Willison `llm` docs: <https://llm.datasette.io/>
- Simon Willison `llm-gemini` plugin: <https://github.com/simonw/llm-gemini>
