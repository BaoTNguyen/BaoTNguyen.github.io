// Dev-toolbar "Edit" app: edit the resume and site source from the page itself.
// Ctrl/Cmd+S saves; the dev server rebuilds and reloads, and the panel reopens where you were.
// ponytail: a textarea, not CodeMirror — no dependency for a handful of small files.
import { defineToolbarApp } from 'astro/toolbar';

const KEY = 'site-editor';
const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch { return {}; } };
const store = (s) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

export default defineToolbarApp({
  init(canvas, app, server) {
    canvas.innerHTML = `
      <style>
        /* Undo the toolbar window's centered, height-capped defaults: dock it to the left half. */
        astro-dev-toolbar-window { position: fixed; left: 12px; top: 12px; bottom: 72px; right: auto;
          width: min(760px, 48vw); height: auto; max-height: none; transform: none; margin: 0;
          display: flex; flex-direction: column; gap: 8px; padding: 12px; box-sizing: border-box; }
        .bar { display: flex; gap: 8px; align-items: center; }
        select { flex: 1; font: 13px ui-monospace, monospace; padding: 4px; }
        textarea { flex: 1; width: 100%; box-sizing: border-box; resize: none; tab-size: 2;
          font: 13px/1.5 ui-monospace, monospace; padding: 10px; border-radius: 6px;
          background: #13151a; color: #e6e6e6; border: 1px solid #343841; }
        .status { font: 12px ui-monospace, monospace; white-space: pre-wrap; max-height: 30%; overflow: auto; }
        .err { color: #ff8a8a; } .ok { color: #8ad6a0; }
      </style>
      <astro-dev-toolbar-window>
        <div class="bar">
          <select></select>
          <astro-dev-toolbar-button button-style="purple">Save (Ctrl+S)</astro-dev-toolbar-button>
        </div>
        <textarea spellcheck="false"></textarea>
        <div class="status"></div>
      </astro-dev-toolbar-window>`;
    const select = canvas.querySelector('select');
    const text = canvas.querySelector('textarea');
    const status = canvas.querySelector('.status');
    const say = (msg, cls = '') => { status.className = `status ${cls}`; status.textContent = msg; };
    let saved = '';
    const dirty = () => text.value !== saved;

    const saved0 = load();
    server.on(`${KEY}:files`, (files) => {
      select.innerHTML = files.map((f) => `<option>${f}</option>`).join('');
      select.value = files.includes(saved0.file) ? saved0.file : files[0];
      server.send(`${KEY}:read`, { path: select.value });
    });
    server.on(`${KEY}:content`, ({ path, content }) => {
      if (path !== select.value) return;
      text.value = saved = content;
      if (saved0.file === path && saved0.pos != null) {
        text.setSelectionRange(saved0.pos, saved0.pos);
        text.scrollTop = saved0.scroll || 0;
        if (saved0.justSaved) say(`saved ${path}`, 'ok');
        delete saved0.pos;
      } else say(path);
    });
    server.on(`${KEY}:saved`, ({ path }) =>
      say(path.endsWith('.tex') ? `saved ${path}, rebuilding resume…` : `saved ${path}`, 'ok'));
    server.on(`${KEY}:error`, ({ message }) => say(message, 'err'));

    select.addEventListener('change', () => {
      if (dirty() && !confirm('Discard unsaved changes?')) { select.value = load().file; return; }
      store({ open: true, file: select.value });
      server.send(`${KEY}:read`, { path: select.value });
    });
    const save = () => {
      store({ open: true, file: select.value, pos: text.selectionStart, scroll: text.scrollTop, justSaved: true });
      saved = text.value;
      server.send(`${KEY}:write`, { path: select.value, content: text.value });
    };
    canvas.querySelector('astro-dev-toolbar-button').addEventListener('click', save);
    text.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
      if (e.key === 'Tab') { e.preventDefault(); text.setRangeText('  ', text.selectionStart, text.selectionEnd, 'end'); }
    });

    app.onToggled(({ state }) => {
      store({ ...load(), open: state });
      // Side by side: push the page right of the panel while it's open.
      document.documentElement.style.paddingLeft = state ? 'calc(min(760px, 48vw) + 24px)' : '';
      if (state) server.send(`${KEY}:list`, {});
    });
    if (saved0.open) app.toggleState({ state: true }); // reopen after the save-triggered reload
  },
});
