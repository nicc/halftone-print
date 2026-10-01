# halftone-print

General-purpose image → halftone dots library (npm). Not specific to any site. Extracted from mcnoose-dot-com.

- Use tokens efficiently at all times.
- `src/screen.ts`: pure maths (Node-safe). `src/image.ts`, `src/render.ts`: browser. Keep the core DOM-free.
- Relative imports use `.js` extensions (native ESM output from `tsc`).
- Tests: `npm test` (Node), `npm run test:browser` (Chromium, Firefox, WebKit via Vitest browser mode). Canvas/image behaviour must be tested in all three.
- Done = typecheck + all tests pass → commit and push. Ask before committing a broken state.
- Release: `npm version <bump> && git push --follow-tags` → publish workflow (trusted publishing). Never publish from local except the initial 0.1.0.
