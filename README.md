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

For GitHub Pages, build with `VITE_BASE_PATH=/<repo-name>/ npm run build`.

## Status

Phases 1 (habit tracker), 2 (focus timer, tree planting, Woodland Sanctuary) and 3 (collection, unlock rules, wildlife, achievements, forest overview) are implemented. Cloud sync and further biomes are planned.
