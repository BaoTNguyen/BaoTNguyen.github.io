import { defineConfig } from 'astro/config';
import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const RESUME_TEX = path.join(ROOT, 'resume/resume.tex');

// Files the in-page editor may read and write: the resume source plus site source under src/.
// Anything else (config, scripts, public/, .git) is refused, whatever path the browser sends.
function editableFiles() {
  const walk = (dir) => readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.(astro|ts|js|css|md|mdx)$/.test(d.name) ? [`${dir}/${d.name}`] : []);
  return ['resume/resume.tex', ...walk('src').filter((f) => f !== 'src/data/latest-video.json')];
}

// Dev only. (1) Saving resume/resume.tex rebuilds the PDF and preview image through
// scripts/build-resume.sh, which refuses anything that fails the resume checks, then reloads.
// (2) An "Edit" app on the dev toolbar edits those files from the page itself (dev/site-editor.js).
// ponytail: one resume build at a time; a save during a build queues exactly one rerun.
const devEditing = {
  name: 'dev-editing',
  hooks: {
    'astro:config:setup': ({ command, addDevToolbarApp }) => {
      if (command !== 'dev') return;
      addDevToolbarApp({
        id: 'site-editor',
        name: 'Edit site & resume',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
        entrypoint: fileURLToPath(new URL('./dev/site-editor.js', import.meta.url)),
      });
    },
    'astro:server:setup': ({ server, logger, toolbar }) => {
      let running = false, again = false;
      const build = () => {
        if (running) { again = true; return; }
        running = true;
        execFile('sh', ['scripts/build-resume.sh'], { cwd: ROOT }, (err, stdout, stderr) => {
          running = false;
          if (err) {
            const message = `resume not rebuilt:\n${(stdout + stderr).trim()}`;
            logger.error(message);
            toolbar.send('site-editor:error', { message });
          } else { logger.info('resume rebuilt'); server.ws.send({ type: 'full-reload' }); }
          if (again) { again = false; build(); }
        });
      };
      server.watcher.add(RESUME_TEX);
      server.watcher.on('change', (file) => { if (file === RESUME_TEX) build(); });

      const allowed = (p) => typeof p === 'string' && editableFiles().includes(p);
      toolbar.on('site-editor:list', () => toolbar.send('site-editor:files', editableFiles()));
      toolbar.on('site-editor:read', ({ path: p }) => {
        if (!allowed(p)) return toolbar.send('site-editor:error', { message: `not editable: ${p}` });
        toolbar.send('site-editor:content', { path: p, content: readFileSync(path.join(ROOT, p), 'utf8') });
      });
      toolbar.on('site-editor:write', ({ path: p, content }) => {
        if (!allowed(p) || typeof content !== 'string') return toolbar.send('site-editor:error', { message: `not editable: ${p}` });
        writeFileSync(path.join(ROOT, p), content); // the file watcher takes it from here
        toolbar.send('site-editor:saved', { path: p });
      });
    },
  },
};

// Deploys to https://baotnguyen.github.io (user site, served from the repo root).
export default defineConfig({
  site: 'https://baotnguyen.github.io',
  output: 'static',
  integrations: [devEditing],
});
