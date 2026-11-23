# baotnguyen.github.io

Personal site built with [Astro](https://astro.build). Static output, no tracking, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main` and every 6 hours.

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
| Resume | replace `public/Bao_Nguyen_Resume.pdf`, then `pdftoppm -png -r 200 -singlefile public/Bao_Nguyen_Resume.pdf public/resume` and update the image size in `src/pages/resume.astro` if the page size changes |

## Live data

- Commits: fetched from the GitHub API at build time (`src/lib/github.ts`). Uses `GITHUB_TOKEN` in CI, your `gh` login locally, and a 10-minute cache in `.cache/`.
- Latest video: `scripts/fetch-youtube.mjs` reads the channel's public RSS feed before each dev/build run and saves the thumbnail locally.

GitHub pauses scheduled workflows after 60 days without repo activity; any push restarts the clock.
