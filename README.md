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

Phase 1 (habit tracker foundation) is implemented. Focus timer, woodland, collection and cloud sync are planned.
