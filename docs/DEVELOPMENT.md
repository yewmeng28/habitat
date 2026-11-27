# Habitat: developer guide

Build a better life, one habit at a time.

A local-first PWA that combines habit tracking and focus sessions with an ecosystem you grow: every completed focus session plants a permanent tree in one of six pixel-art biomes. The full product spec is `project_brief.md`. Architecture decisions are in `docs/decisions/` (0001 to 0007, one per phase of work).

**If you are a new session picking this up, read this file, then `project_brief.md`, then the ADRs in order.**

## Status

| Phase | What | State |
|---|---|---|
| 1 | Habit tracker: Growth habits, Challenges (incl. manual Screen Time), Nature Energy, Insights, IndexedDB, JSON backup/restore, guest mode | Done |
| 2 | Focus timer, permanent tree planting, Woodland Sanctuary (Phaser), procedural pixel art | Done |
| 3 | Collection, data-driven unlock rules, wildlife, achievements, discoveries, forest overview | Done |
| 4 | Supabase auth, schema + RLS, guest-to-account migration, local-first sync, multi-device testing | **Not started (deferred by the user)** |
| 5 | Frozen Tundra, Golden Savannah, Whispering Marsh; biome unlocking; world overview | Done |
| 6 | Skybound Peaks (floating island) and Enchanted Fairy Forest; rare discoveries | Done |
| 7 | Day/night, seasons, generated sound and music, accessibility, quality options, more achievements/insights | Done (subset, see below) |

Also built beyond the brief's phases: full-screen immersive Habitat and Focus on phones, portrait-only on touch devices, page-zoom lock, app icon set, dev-only test tools, GitHub Actions deploy.

## Develop

```
npm install
npm run dev      # http://localhost:5173
npm test         # vitest: domain, persistence, backup, terrain, wildlife, progression (87 tests)
npm run lint     # oxlint
npm run build    # typecheck (tsc -b) + production build
```

**Dev tools:** `http://localhost:5173/#/test` plants trees instantly (any biome, 0 minutes allowed), fast-forwards a running session, adds Nature Energy, resets discoveries, and wipes data. It exists only under `npm run dev` (`import.meta.env.DEV`); it is not in the production bundle and `/test` redirects away there. Useful for reaching later biomes: they unlock at 15, 35, 60, 90 and 130 trees.

Routes use the URL hash (`/#/habitat`, `/#/growth`, `/#/focus`, `/#/challenges`, `/#/collection`, `/#/insights`, `/#/settings`).

## Screenshots

The images in `docs/screenshots/` (used by the product README) are generated at iPhone 16 size (393 x 852, 3x) by `scripts/screenshots.mjs` using Playwright. It seeds a demo account through the dev-only helpers, so it needs the dev server:

```
npm run dev &
npx playwright install chromium   # first time only
npm run screenshots
```

`.github/workflows/screenshots.yml` does this on every push to `main` and commits any changed images back with `[skip ci]`. Set `CHROMIUM_PATH` to use a specific Chromium binary locally.

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` runs lint, tests and a build on every push and pull request. A push to `main` also publishes the built site to a **`gh-pages` branch**. Pull requests never deploy. If any check fails, nothing deploys.

One-time setup on GitHub:

1. Settings, Actions, General, Workflow permissions: **Read and write permissions**.
2. Push to `main` (or run the workflow from the Actions tab). The first successful run creates `gh-pages`.
3. Settings, Pages, Source: **Deploy from a branch**, branch **`gh-pages`**, folder **`/ (root)`**.
4. Site: `https://<username>.github.io/<repo-name>/`.

**Important:** Pages must point at `gh-pages`, **not `main`**. If it points at `main` it serves the source `index.html` (which loads `/src/main.tsx`) and the page is blank white even though GitHub reports a successful deploy. View-source on a blank site: `src="/src/main.tsx"` means it is serving source; `src="/<repo>/assets/index-….js"` means it is the built app.

The base path comes from the repo name (`VITE_BASE_PATH=/<repo-name>/`). Locally: `VITE_BASE_PATH=/<repo-name>/ npm run build`. Installed copies update in the background, so a device that already has the app can show the old version until the second reload.

## Architecture

Principles (from the brief, all upheld): local-first; React for UI, Phaser only for the habitat world; IndexedDB is the source of truth; static content is data; modular so Supabase can be added without restructuring.

```
src/
  data/          static content: biomes.ts, species.ts, collection.ts (wildlife, achievements, rare finds)
  domain/        pure logic, no DOM/DB: habits, focus timer maths, progress/unlock rules,
                 terrain, wildlife movement, daylight, seasons, preferences, woodland placement
  persistence/   Dexie schema (db.ts), repositories, focusRepo (sessions + planting), progressRepo
                 (discoveries), backup.ts (zod-validated JSON export/import)
  game/          habitatGame.ts (Phaser scene), pixel.ts (all art is drawn in code)
  audio/         soundscape.ts, useSoundscape.ts (Web Audio, generated, no files)
  features/      growth, challenges, focus, habitat, collection, insights, settings (React screens)
  components/    shared UI (FloatingMenu, FocusBar, ErrorBoundary, RotatePrompt, previews...)
  dev/           dev-only /test page
```

Key ideas a new session must know:

- **Every record is sync-ready:** UUID `id`, `userId` (null for guests), `createdAt`, `updatedAt`, soft `deletedAt`. Never hard-delete user data in app code.
- **Dexie schema is at v3** (tables: habits, completions, challenges, challengeRecords, ledger, preferences, focusSessions, plantedTrees, discoveries). New fields have been added as optional on existing rows (for example display options on `preferences`) rather than migrating. **Backup format is version 4**; older backups still import.
- **Focus timer is timestamp-based** (`startedAt`, `pausedAt`, `pausedMs`), never tick-counting, so it survives refresh and iOS suspension. Completion is **atomic and idempotent** (`completeSession`): one tree per session (unique index on `plantedTrees.focusSessionId`) and one Nature Energy award (`ledger.sourceKey = focus:<sessionId>`). App-level code (`App.tsx`) settles sessions so a minimised session still finishes.
- **Rules engine:** one `Rule` type (`always, sessions, hours, trees, species-trees, biome-trees, area-trees, species-discovered, habit-streak, biomes-unlocked, rares-found, all`) drives species unlocks, wildlife, achievements, rare finds and biomes. `computeStats` + `ruleProgress` + `pendingDiscoveries` in `domain/progress.ts`. Discoveries are recorded idempotently (unique `[kind+itemId]`).
- **Biomes are data** (`data/biomes.ts`): palette, unlock threshold (0, 15, 35, 60, 90, 130 total trees), areas with themes and capacities plus unlimited overflow, water style and size, stream chance, weather, optional `floating` and `lightFloor`. Area ids are `<biomeId>:<index>` (for example `tundra:1`). Currently 6 biomes, 23 tree species, 21 wildlife.
- **Terrain model (`domain/terrain.ts`)** is derived from the area id and is read by the renderer, tree placement and wildlife movement, so everything agrees where water, path, stream and (for Skybound) open sky are. New trees' crowns are kept off water; older saved trees on water are nudged for display only, never modified. Tree positions are stored **normalised (0..1)** so they are device-independent; the world is portrait or landscape depending on the viewport.
- **Art is procedural** (`game/pixel.ts`): trees (5 growth stages each), wildlife (idle and moving frames), terrain per biome and area theme, seasonal recolouring of woodland broadleaf trees. No image assets. Do not use emoji or a single static background as art.
- **Display options** (day/night, seasons, weather, motion, quality, sound, music, volume) live on the preferences record, resolved by `resolveDisplay` into `AppData.display`. Sound and music are **off by default**.

## Gotchas (learned the hard way)

- TypeScript has `erasableSyntaxOnly`: **no enums, no constructor parameter properties**. Declare fields and assign in the constructor.
- Phaser is **v4**: `setTintFill()` is gone; use `setTint(color).setTintMode(Phaser.TintModes.FILL)`. Phaser is lazy-loaded (`import()`) so other tabs stay light.
- Dexie transactions must list **every table touched** inside (including via helper functions), or you get `NotFoundError`.
- `index.html` URLs, the PWA manifest and the service worker all depend on `VITE_BASE_PATH`.
- iOS ignores `user-scalable=no`; page zoom is locked with `touch-action: pan-x pan-y` plus cancelling WebKit `gesture*` events (`src/lockZoom.ts`). The habitat canvas opts back in with `touch-action: none` so only the world zooms.
- iOS can stop painting `backdrop-filter` elements over a repainting background. The Focus buttons are deliberately opaque for that reason.
- Phones are portrait-only: manifest `orientation`, an attempted lock, and a rotate prompt for touch devices held sideways. Desktop is unaffected.

## Not verified on a real device

Most visual and audio work was checked only through unit tests and images rendered with a software canvas (see below), not in a browser or on an iPhone. Please verify on a phone:

- The full-screen Habitat layout, floating menu, area chip dropdown and bottom sheet; the bottom-bar height on iPhone; page zoom lock.
- Focus: that the buttons (Pause, Minimise, Give up) now stay visible (a fix was made for a report that they vanished after about a second, cause not confirmed); Minimise and the "Focus in progress" chip; sound while a session runs.
- Ambient sound and music (never heard; levels untested), day/night lighting, seasons, weather effects, creature animation timing, pinch zoom on the habitat.
- Whether the Fairy Forest ground is too dark, and whether autumn trees look too blocky.

## Phase 4 (next major piece): Supabase

Not started. **Prerequisites from the user:** a Supabase project, and its URL and publishable key as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (repository variables for the build; never expose a service-role key). Also needs the Auth redirect URLs for the GitHub Pages site. The user should also decide conflict rules between devices.

Design notes already in place for it: every record has `userId`, timestamps and soft delete; idempotency keys exist (`focusSessionId` unique for trees, `ledger.sourceKey`, discoveries `[kind+itemId]`, completions `[habitId+date]`, challenge records `[challengeId+date]`); there is no sync queue table yet. Follow section 14 of `project_brief.md` (phases A to F): keep Habitat-specific `habitat_*` tables, RLS so users only touch their own rows, guest-to-account migration with a merge/replace choice, an outbox of idempotent operations, and never award the same completed session twice. Keep IndexedDB and manual JSON backup working.

## Not done / ideas

- Phase 4 above. A fuller world map. Spending Nature Energy on decorations, and rare finds appearing in the world. Frame-rate cap. Seasons outside the woodland and southern-hemisphere seasons. Recorded audio. A lion in the Savannah (the brief lists one; there are three animals per biome). Plants, flowers and mushrooms as collectibles (Collection currently has trees, wildlife, rare, achievements, biomes).
- `src/components/ComingSoon.tsx` is no longer used by any screen and can be deleted.

## Working with the user (observed preferences)

- The user reviews on a real iPhone and reports visual or layout problems; they are often specific about look and feel. Ask when a request is ambiguous.
- Commit when asked (end commit messages with the `Co-Authored-By` attribution line the session provides). **The user pushes to GitHub themselves**; do not push.
- Many shell commands that kill processes or combine several risky steps have been declined. Prefer small, single-purpose commands, avoid `rm`, and do not start background servers you cannot stop. There is no browser automation available in the usual environment.
- Report honestly what was and was not verified.

## Art and debugging without a browser

Because no browser could be driven, pixel art and terrain were previewed by bundling the pure drawing code with `rolldown`, shimming `document.createElement('canvas')` with a tiny software canvas (`fillRect`, `drawImage`, `getImageData`/`putImageData`), and writing PNGs with Node's `zlib`. Those helper scripts lived in `node_modules/.cache/habitat-debug/` (git-ignored, may be gone); they are easy to recreate if needed. This only covers canvas drawing, not layout, CSS or audio.
