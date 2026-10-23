# ML Field Guide app

Vite + React + TypeScript. Run from this folder.

- `npm ci` install
- `npm run dev` dev server (runs `scripts/build-content.mjs` first)
- `npm run build` typecheck and production build into `dist/`
- `npm run preview` serve `dist/` at http://localhost:4173/ML_Assistant/
- `npm test` unit tests (Vitest)
- `npm run e2e` Playwright smoke tests (needs `npx playwright install chromium` once, and a prior `npm run build`)
- `npm run lint` ESLint
