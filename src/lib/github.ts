// Build-time GitHub reads. No client JS, no tracking.
// - Auth: GITHUB_TOKEN if set (CI), else the local GitHub CLI login (`gh auth token`), else anonymous (60 req/hour).
// - Cache: responses are kept in .cache/github.json for 10 minutes, and the last good copy is used if GitHub fails,
//   so dev reloads and rebuilds don't burn the rate limit and the build never breaks.
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export interface Commit { repo: string; sha: string; message: string; date: Date; url: string; }

const CACHE_FILE = '.cache/github.json';
const TTL_MS = 10 * 60 * 1000;

function token(): string | undefined {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || undefined; }
  catch { return undefined; }
}
const tok = token();
const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'site-build' };
if (tok) headers.Authorization = `Bearer ${tok}`;

type Cache = Record<string, { at: number; rows: any[] }>;
let cache: Cache = {};
try { cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8')); } catch {}
const save = () => { try { mkdirSync('.cache', { recursive: true }); writeFileSync(CACHE_FILE, JSON.stringify(cache)); } catch {} };

export async function recentCommits(repo: string, n = 5): Promise<Commit[]> {
  const key = `${repo}#${n}`;
  const hit = cache[key];
  let rows: any[] | undefined = hit && Date.now() - hit.at < TTL_MS ? hit.rows : undefined;
  if (!rows) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=${n}`, { headers });
      if (res.ok) { rows = (await res.json()) as any[]; cache[key] = { at: Date.now(), rows }; save(); }
    } catch {}
    rows ??= hit?.rows; // stale copy beats nothing
  }
  return (rows ?? []).map((r) => ({
    repo,
    sha: r.sha,
    message: String(r.commit.message).split('\n')[0],
    date: new Date(r.commit.author?.date ?? r.commit.committer?.date),
    url: r.html_url,
  }));
}

export const isMerge = (c: Commit) => /^Merge (pull request|branch)/.test(c.message);
