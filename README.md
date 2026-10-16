# K53 Practice

Learner’s licence study board for the South African K53 test: rules of the road, road signs, and vehicle controls. Live at [https://adoniscodes.github.io/k53-practice/](https://adoniscodes.github.io/k53-practice/).

Filter the bank, drag cards across **To study / Got wrong / Getting there / Mastered**, run a short quick test, or use **Review** for Anki-style spaced repetition (SM-2 with 1m/10m learning steps). Progress and scheduling stay in this browser (`localStorage`).

Review shows due cards one at a time. After you answer, rate **Again / Hard / Good / Easy** — intervals grow for easy cards (about 1d → 3d → 8d → 3w) and Again cards come back in the same session. The daily new-card limit defaults to 20. Filters (category, licence code, source, type, search) apply to both the board and the review queue. Board columns follow SRS state: new, learning/lapsed, young reviews, and mature (interval ≥ 21 days).

## Credits

Question text and images come from:

- [K53 Test](https://practicek53.co.za/)
- [Online Driving Academy / Appsworld](https://youtube.com/@onlinedrivingacademy)
- AI-written items based on the K53 manual and the National Road Traffic Act / Regulations

## Develop

```bash
npm ci
npm run dev
```

Vite serves the app at `/k53-practice/` (`base` in `vite.config.ts`). The runtime loads `data/index.json` and every listed batch via `import.meta.env.BASE_URL`, so image and fetch URLs work both locally and on GitHub Pages.

```bash
npm run build
npm run preview
```

GitHub Actions (`.github/workflows/pages.yml`) runs `npm ci` and `npm run build` on every push to `main`, then deploys `dist/` with GitHub Pages.

## Update the question bank

The bank ships in `public/data/` (`index.json`, `batches/`, `images/`).

1. Unpack a new `k53-data.tgz` so its `data/` tree replaces `public/data/` (keep `index.json` plus the listed batch and image files; skip videos and lock files).
2. Confirm `public/data/index.json` lists every batch the site should load.
3. Commit and push to `main`. Pages rebuilds automatically.

Example:

```bash
tar -xzf k53-data.tgz
rm -rf public/data
mv data public/data
# optional: rm -f public/data/.index.lock
git add public/data
git commit -m "Update K53 question bank"
git push
```
