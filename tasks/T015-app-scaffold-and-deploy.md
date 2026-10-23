# T015 — App scaffold, dependencies and GitHub Pages deploy

**Status:** Ready

**Epic:** E03

## Objective

Create the `app/` project with every dependency E03 needs installed up front, a
working build/test setup, and a GitHub Actions workflow that deploys to GitHub Pages.

## Context

`docs/ARCHITECTURE.md` § "Web app". Spec §12 (static React PWA, no backend, free
static host). Later tasks (T016–T020) run in parallel and must not need to add
packages, so install everything listed below now.

## Dependencies

- None (E02 done)

## Implementation Contract

### Outputs

- `app/` Vite + React + TypeScript project: `package.json` (exact versions pinned,
  no `^`), lockfile, `vite.config.ts` (`base: '/ML_Assistant/'`, Tailwind v4 plugin,
  `vite-plugin-pwa` with `registerType: 'autoUpdate'`, precache `data/**/*.json`),
  `tsconfig*.json` (strict), `index.html` (lang="en", title "ML Field Guide").
- Dependencies: react, react-dom, react-router (HashRouter), tailwindcss +
  @tailwindcss/vite, radix-ui, shadcn/ui setup (`components.json`, `src/lib/utils.ts`
  with `cn`, plus class-variance-authority, clsx, tailwind-merge as shadcn needs),
  @tabler/icons-react, prism-react-renderer, js-yaml, @fontsource/atkinson-hyperlegible,
  @fontsource/space-grotesk, @fontsource/jetbrains-mono, @fontsource/lexend,
  @fontsource/opendyslexic. Dev: vitest, @testing-library/react,
  @testing-library/user-event, @testing-library/jest-dom, jsdom, @playwright/test,
  @axe-core/playwright, eslint (flat config) with react-hooks plugin.
- shadcn components added via the shadcn CLI (or copied from its registry) into
  `app/src/components/ui/`: button, tabs, collapsible, accordion, sheet, dialog,
  tooltip, toggle-group, badge, command, scroll-area, separator. Unstyled beyond
  defaults — T016 restyles.
- npm scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (vitest run),
  `e2e` (playwright), `lint`, and `prebuild`/`predev` hooks that call
  `node scripts/build-content.mjs` — create that script as a stub that writes
  `public/data/index.json` with `{}` (T017 replaces it).
- `app/playwright.config.ts`: runs against `vite preview`, projects for 1440×900 and
  1024×768, Chromium only. Install the Chromium browser locally.
- `app/.gitignore`: node_modules, dist, public/data, test-results, playwright-report.
- `.github/workflows/deploy.yml` (repo root): on push to `main` and manual dispatch;
  Node 26; `npm ci`, `npm run lint`, `npm test`, `npm run build` in `app/`; upload
  `app/dist` with `actions/upload-pages-artifact` and deploy with `actions/deploy-pages`
  (permissions: pages write, id-token write). The content build needs the repo's
  `content/` folder — it is in the checkout.
- `app/src/App.tsx`: a placeholder page reading "ML Field Guide" so the deploy can be checked.
- One smoke unit test and one Playwright smoke test (page loads, title correct).
- `app/README.md`: commands.

### Rules

- Do not write styles, tokens, layout or content code (other tasks own them).
- No network fonts or CDNs.

## Acceptance Criteria

- [ ] `npm ci && npm run lint && npm test && npm run build && npm run e2e` pass in `app/`.
- [ ] `dist/` contains a service worker and manifest; asset URLs use `/ML_Assistant/`.

## Verification

`cd app && npm ci && npm run lint && npm test && npm run build && npm run e2e`
