# Habitat

Build a better life, one habit at a time.

A local-first PWA habit tracker that grows into a living ecosystem. See `project_brief.md` for the full spec and `docs/decisions/` for architecture notes.

## Develop

```
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (domain, persistence, backup)
npm run build    # typecheck + production build
```

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds the app and publishes it to a `gh-pages` branch whenever `main` is pushed. Pull requests only run the checks (lint, tests, build); they never deploy.

One-time setup on GitHub:

1. **Settings, Actions, General, Workflow permissions:** choose **Read and write permissions** and save. The workflow needs this to push the `gh-pages` branch.
2. Push to `main` (or open the **Actions** tab, pick **Build and deploy** and press **Run workflow**). The first successful run creates the `gh-pages` branch.
3. **Settings, Pages, Build and deployment:** set **Source** to **Deploy from a branch**, then choose branch **`gh-pages`** and folder **`/ (root)`**, and save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`. Every later push to `main` updates it.

Notes:
- The base path is set automatically from the repository name. To build locally the same way: `VITE_BASE_PATH=/<repo-name>/ npm run build`.
- Routing uses the URL hash (`/#/habitat`), so no extra Pages configuration is needed for page refreshes.
- If a deploy fails with a permissions error, recheck step 1. Private repositories need a GitHub plan that includes Pages.
- When Supabase is added later, its URL and publishable key will be supplied as repository variables and passed to the build.

## Status

Phases 1 to 3 (habit tracker, focus and tree planting, collection and wildlife) and Phase 5 (Frozen Tundra, Golden Savannah and Whispering Marsh with biome unlocking and a world overview) are implemented. Phase 4 (cloud sync) is deferred, and the fantasy biomes are planned.
