# baotnguyen.github.io

Personal site built with [Astro](https://astro.build). Static output, no tracking, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main` and once a day (11:17 UTC).

## Run it

```
npm install
npm run dev      # http://localhost:4321
npm run build    # output in dist/
```

## Where things live

| To change | Edit |
|---|---|
| Name, links, link hub | `src/site.ts` |
| Home text, beliefs, interests | `src/pages/index.astro` |
| Main projects and the repos tracked for commits | `src/data/projects.ts` |
| Colours, fonts, spacing | `src/styles/global.css` (tokens at the top) |
| Resume | edit `resume/resume.tex`, then `npm run resume` (rebuilds the PDF and preview image; refuses to publish unless `scripts/resume-schema.mjs` passes). See [Resume](#resume) |

## Resume

`resume/resume.tex` is the one source for the one-page general resume. It moves between machines through this repo: pull, edit, `npm run resume`, check `/resume` on the dev server, commit, push. Building needs TeX Live (with `fontawesome5`) and poppler-utils. `npm run resume` runs `scripts/resume-schema.mjs` (one page, 2-4 bullets per job and 2-3 per project, declared `% narrative:` and `% terms:`, bolding, section order and the rest of the house rules); `npm test` runs its edge-case suite and stops before touching `public/` if anything fails.

career-ops sees the same file through a symlink. Set that up once on each machine that has both repos side by side in `~/Coding/Projects`:

```
mkdir -p ~/Coding/Projects/career-ops/output/_general
ln -s ../../../personal-website/resume/resume.tex "$HOME/Coding/Projects/career-ops/output/_general/One-Page Resume - Bao Nguyen.tex"
```

The 2-page master bullet pool in career-ops stays local to the workstation (career-ops ignores `output/` in git), so carry new bullets into the one-pager by hand.

## Live data

- Commits: fetched from the GitHub API at build time (`src/lib/github.ts`). Uses `GITHUB_TOKEN` in CI, your `gh` login locally, and a 10-minute cache in `.cache/`.
- Latest video: `scripts/fetch-youtube.mjs` reads the channel's public RSS feed before each dev/build run and saves the thumbnail locally.

GitHub pauses scheduled workflows after 60 days without repo activity; any push restarts the clock.
