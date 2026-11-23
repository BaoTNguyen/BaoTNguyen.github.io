// Main projects shown first on the Activities page. `repos` are also scanned for the live commit feed.
export interface Project {
  name: string;
  repo: string; // owner/name
  blurb: string;
  parts?: string[];
  extraRepos?: string[]; // sub-repos whose commits also feed "Latest activity"
}

export const projects: Project[] = [
  {
    name: 'vascular',
    repo: 'BaoTNguyen/vascular',
    blurb: 'A coding-agent stack that runs from one clone: an orchestrator, shared memory, prompt retrieval and an event journal, as six repos that work together.',
    parts: ['heart', 'plexus', 'arteries', 'capillaries', 'marrow', 'pulse'],
    extraRepos: ['heart', 'plexus', 'arteries', 'capillaries', 'marrow', 'pulse'].map((r) => `BaoTNguyen/${r}`),
  },
  {
    name: 'inference-opt',
    repo: 'BaoTNguyen/inference-opt',
    blurb: 'Serving Qwen3.8-27B at 125 tok/s per request on two RTX 3090s, with the setup and benchmarks behind the number.',
  },
];
