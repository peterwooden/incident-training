# AI Asset Generation (OpenAI + Gemini)

This repo treats prompts as source code and generated images as compiled artifacts.

- Source: `/Users/peterwooden/incident-training-rpg/scripts/asset-prompts.json`
- Compiler: `/Users/peterwooden/incident-training-rpg/scripts/generate-game-asset.mjs`
- Artifacts: `/Users/peterwooden/incident-training-rpg/apps/web/src/game-ui/visuals/assets/generated/`

## Why this path

- Trusted providers only: OpenAI and Google Gemini official endpoints.
- Your own account keys: no third-party relay service.
- Works with current `SVG+Canvas` scene panel architecture (generate textures/sprites, then compose in UI).

## Prerequisites

1. Set one API key in repo root `.env`:
   - `OPENAI_API_KEY=...` for OpenAI
   - `GEMINI_API_KEY=...` for Google Gemini
2. Pick output path in your local asset tree, e.g.:
   - `/Users/peterwooden/incident-training-rpg/apps/web/src/game-ui/visuals/assets/generated/`

The compiler auto-loads `.env` by itself. Shell-level env vars still override `.env` values.

## Commands

Compile all source prompts:

```bash
npm run asset:build
```

Compile one asset by ID (surgical rebuild):

```bash
npm run asset:build -- --asset bushfire-town-base-v2
```

List available IDs:

```bash
npm run asset:list
```

Dry run:

```bash
npm run asset:build -- --dry-run
```

Single ad-hoc generation (outside source manifest):

```bash
npm run asset:gen:openai -- \
  --prompt "cinematic bomb console panel, industrial metal, layered electronics, no text" \
  --out apps/web/src/game-ui/visuals/assets/generated/bomb-console.png
```

## Prompt presets

Prompt source entries in `scripts/asset-prompts.json` support:

- `id`: stable build target ID
- `prompt`: full canonical prompt (keep this complete to avoid regressions)
- `out`: compiled image output path
- optional generation options (`provider`, `model`, `size`, `quality`, `background`, `format`, `aspect`, `n`)

Global defaults are under `defaults`.

## Recommended production workflow

1. Edit only the target prompt in `scripts/asset-prompts.json`.
2. Rebuild only that asset ID via `npm run asset:build -- --asset <id>`.
3. Review panel visuals.
4. Commit source prompt + compiled artifact together.

## Notes on `llm` CLI (Simon Willison)

`llm` is useful for prompt iteration and multimodal experimentation, but this repo uses direct official API calls for deterministic image-file output into the asset pipeline.

## Primary references

- OpenAI image generation guide: <https://platform.openai.com/docs/guides/image-generation>
- Google Gemini image generation guide: <https://ai.google.dev/gemini-api/docs/image-generation>
- Simon Willison `llm` docs: <https://llm.datasette.io/>
- Simon Willison `llm-gemini` plugin: <https://github.com/simonw/llm-gemini>
