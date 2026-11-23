import { defineConfig } from 'astro/config';

// Deploys to https://baotnguyen.github.io (user site, served from the repo root).
export default defineConfig({
  site: 'https://baotnguyen.github.io',
  output: 'static',
});
