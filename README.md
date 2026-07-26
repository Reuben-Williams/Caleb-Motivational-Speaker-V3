# Caleb Jakes Motivational Speaker V3

A cinematic, responsive Next.js website for motivational speaker and author
Caleb Jakes.

## Local development

```bash
npm ci
npm run dev
```

## Validation

```bash
npm run check
npm run build:pages
```

`npm run build:pages` creates the static GitHub Pages artifact in `out/`. The
Pages preview intentionally excludes the server inquiry route and displays
direct phone and email alternatives. The production inquiry implementation
remains in `src/app/api/inquiries` for deployment to a server-capable host.

## GitHub Pages

Pushes to `main` deploy through `.github/workflows/pages.yml`.
