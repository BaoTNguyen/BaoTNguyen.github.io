// Edge cases for resume-schema.mjs: each one mutates a known-good resume and names the rule that must fire
// The hand fixture is a frozen copy of resume/resume.tex, so live edits never silently skip cases.
// (or null: must still pass). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lint, renderedLineErrors, flushLineErrors } from './resume-schema.mjs';

const HAND = readFileSync(new URL('./fixtures/hand-resume.tex', import.meta.url), 'utf8');
const GEN = readFileSync(new URL('./fixtures/generated-resume.tex', import.meta.url), 'utf8');
const rep = (s, a, b) => { assert.ok(s.includes(a), `fixture lacks: ${a.slice(0, 70)}`); return s.replace(a, b); };
const bullet = (t) => `\\resumeItem{${t}}`;
// First M2M bullet, used as an anchor for inserting or editing a bullet.
const B1 = bullet('Took agentic AI from concept to working systems in smart-city traffic, 311 response, farming, and sales');
const withB1 = (t) => (s) => rep(s, B1, bullet(t));
const HEART2 = bullet("Verifies changes against the target repository's test suite on a clean checkout, applying them only after verification passes and the reviewer approves");
const SKILL_TOOLS = '\\textbf{Developer Tools}{: AWS, GCP, Azure, Claude Code, Codex, Cursor, Git, Linux}';
const SKILL_LIBS = '\\textbf{Libraries}{: PyTorch, TensorFlow, LangChain, LangGraph, LangSmith, MCP, FastAPI, PostgreSQL, pgvector, pytest}';
const CERT_GCP = '\\textbf{\\small GCP Professional Machine Learning Engineer} & \\textbf{\\small May 2026} \\\\';
const CERT_AWS = '\\textbf{\\small AWS Certified Machine Learning Engineer -- Associate} & \\textbf{\\small Sep 2025} \\\\';
const TERMS = '% terms: agent, client, evaluat, production';

const CASES = [
  // ---- bullet count: 2-4 per experience role and project ----
  ['5+ bullets in a role', (s) => rep(s, B1, `${B1}\n${bullet('Built an agent for a client')}\n${bullet('Built a second agent for a client')}`), 'bulletCount'],
  ['4 bullets in a project (projects cap at 3)', (s) => s.replace(/(\\section\{[^}]*Projects\}[\s\S]*?\\resumeItemListStart)/, `$1\n${bullet('Built an agent for a client')}\n${bullet('Built a second agent for a client')}`), 'bulletCount'],
  ['1 bullet in a project', (s) => rep(s, HEART2, ''), 'bulletCount'],
  ['0 bullets in a project', (s) => rep(rep(s, HEART2, ''), bullet('Built a coding-agent orchestrator that runs an implement, test, and review loop in isolated git worktrees, with routing across models and providers'), ''), 'bulletCount'],
  ['commented-out 5th bullet does not count', (s) => rep(s, B1, `${B1}\n% ${bullet('Built an agent for a client')}`), null],
  ['hand-written \\item counts as a bullet', (s) => rep(s, B1, `${B1}\n\\item Built an agent for a client\n\\item Built another agent for a client`), 'bulletCount'],
  ['\\resumeSubItem counts as a bullet', (s) => rep(s, B1, `${B1}\n\\resumeSubItem{Built an agent for a client}\n\\resumeSubItem{Built another agent for a client}`), 'bulletCount'],
  ['bullet hidden in \\iffalse does not count', (s) => rep(s, B1, `${B1}\n\\iffalse ${bullet('Built an agent for a client')} \\fi`), null],
  ['bullet hidden in comment env does not count', (s) => rep(s, B1, `${B1}\n\\begin{comment}\n${bullet('Built an agent for a client')}\n\\end{comment}`), null],
  ['custom macro wrapping \\resumeItem is refused', (s) => rep(rep(s, '\\begin{document}', '\\newcommand{\\pt}[1]{\\resumeItem{#1}}\n\\begin{document}'), B1, `${B1}\n\\pt{Built an agent for a client}`), 'bulletCount'],
  ['\\section* still counts as a section', (s) => rep(rep(s, '\\section{Projects}', '\\section*{Projects}'), HEART2, ''), 'bulletCount'],
  ['Markdown bold left in a bullet', withB1('Took agentic AI to **4** clients'), 'content'],
  ['Markdown italics in a stack', (s) => rep(s, '\\emph{Python}}}', '\\emph{*Python*}}}'), 'content'],
  ['\\section* asterisk is not Markdown', (s) => rep(s, '\\section{Projects}', '\\section*{Projects}'), null],
  ['Markdown link as a project name', (s) => rep(s, '\\underline{heart}', '\\underline{[heart](https://github.com/BaoTNguyen/heart)}'), 'content'],
  ['\\input of another file is refused', (s) => rep(s, B1, `${B1}\n\\input{more-bullets}`), 'content'],
  ['unescaped % hides the rest of a bullet', withB1('Took agentic AI to production for 40% of clients'), 'content'],

  // ---- narrative and terms ----
  ['no narrative line', (s) => rep(s, /% narrative:.*\n/.exec(s)[0], ''), 'narrative'],
  ['empty terms', (s) => rep(s, TERMS, '% terms: , ,'), 'narrative'],
  ['narrative after \\begin{document}', (s) => rep(rep(s, /% narrative:.*\n/.exec(s)[0], ''), '\\begin{document}', '\\begin{document}\n% narrative: x'), 'narrative'],
  ['narrative of two sentences', (s) => rep(s, '% narrative: ML engineer', '% narrative: I build agents. ML engineer'), 'narrative'],
  ['capitalised "% Narrative:" is accepted', (s) => rep(s, '% narrative:', '% Narrative:'), null],

  // ---- bullet style ----
  ['~ for about', withB1('Took agentic AI to about~4 client systems'), 'bulletStyle'],
  ['$\\sim$ for about', withB1('Took agentic AI to $\\sim$4 client systems'), 'bulletStyle'],
  ['+ as and', withB1('Took agentic AI to traffic + farming clients'), 'bulletStyle'],
  ['A+B with no spaces', withB1('Took agentic AI to traffic+farming clients'), 'bulletStyle'],
  ['C++ is not shorthand', withB1('Took agentic AI in C++ and Python to clients'), null],
  ['& as and', withB1('Took agentic AI to traffic \\& farming clients'), 'bulletStyle'],
  ['arrow as shorthand', withB1('Took agentic AI from concept $\\rightarrow$ client systems'), 'bulletStyle'],
  ['-> as shorthand', withB1('Took agentic AI from concept -> client systems'), 'bulletStyle'],
  ['w/ as shorthand', withB1('Took agentic AI w/ clients to working systems'), 'bulletStyle'],
  ['colon clause list', withB1('Took agentic AI to clients: traffic, farming, sales'), 'bulletStyle'],
  ['time like 12:30 is not a colon list', withB1('Took agentic AI to clients, shipping by 12:30 daily'), null],
  ['two parentheticals', withB1('Took agentic AI (four domains) to clients (traffic)'), 'bulletStyle'],
  ['one parenthetical is fine', withB1('Took agentic AI to clients (traffic and farming)'), null],
  ['we', withB1('We took agentic AI to clients'), 'bulletStyle'],
  ['ours', withB1('Took agentic AI to clients of ours'), 'bulletStyle'],
  ['US as a country is not "us"', withB1('Took agentic AI to US clients'), null],
  ['~ inside a link URL is not shorthand', withB1('Took agentic AI to clients, see \\href{https://example.com/~bao}{notes}'), null],

  // ---- bolding ----
  ['4 bold spans', withB1('Took \\textbf{a} \\textbf{b} \\textbf{c} \\textbf{d} agentic AI to clients'), 'bolding'],
  ['{\\bf } counts as bold', withB1('Took {\\bf a} {\\bf b} {\\bf c} {\\bf d} agentic AI to clients'), 'bolding'],
  ['bold a table-stakes word', withB1('Took \\textbf{LLM} agents to clients'), 'bolding'],
  ['bold a table-stakes phrase', withB1('Took \\textbf{AI agents} to clients'), 'bolding'],
  ['bold a verb', withB1('\\textbf{Reduced} agent cost for clients'), 'bolding'],
  ['bold a soft claim', withB1('Took \\textbf{scalable} agentic AI to clients'), 'bolding'],
  ['bold a whole clause', withB1('Took agentic AI to clients and \\textbf{cut their review time in half overall}'), 'bolding'],
  ['bold repeated, different case', withB1('Took \\textbf{langchain} agents to clients'), 'bolding'],
  ['repeated number is exempt', withB1('Took agentic AI to \\textbf{5} clients'), null],
  ['bold "Speed" is not a verb', withB1('Took agentic AI to clients, tuning \\textbf{Speed} Index'), null],
  ['bold in skills line', (s) => rep(s, SKILL_LIBS, SKILL_LIBS.replace('PyTorch', '\\textbf{PyTorch}')), 'skills'],

  // ---- sections ----
  ['summary section', (s) => rep(s, '\\section{Experience}', '\\section{Summary}\nx\n\\section{Experience}'), 'sections'],
  ['about section', (s) => rep(s, '\\section{Experience}', '\\section{About Me}\nx\n\\section{Experience}'), 'sections'],
  ['unknown extra section', (s) => rep(s, '\\section{Education}', '\\section{Volunteering}\nx\n\\section{Education}'), 'sections'],
  ['duplicate section', (s) => rep(s, '\\section{Education}', '\\section{Projects}\nx\n\\section{Education}'), 'sections'],
  ['missing Education', (s) => s.slice(0, s.indexOf('\\section{Education}')) + '\\end{document}', 'sections'],
  ['Education first', (s) => { const e = s.slice(s.indexOf('\\section{Education}'), s.indexOf('\\end{document}')); return rep(s.replace(e, ''), '\\section{Experience}', `${e}\n\\section{Experience}`); }, 'sections'],

  // ---- header ----
  ['location with country', (s) => rep(s, 'Edmonton, AB $|$', 'Edmonton, AB, Canada $|$'), 'header'],
  ['location with CA code', (s) => rep(s, 'Edmonton, AB $|$', 'Edmonton, AB, CA $|$'), 'header'],
  ['location with remote', (s) => rep(s, 'Edmonton, AB $|$', 'Edmonton, AB (Remote) $|$'), 'header'],
  ['location with relocation', (s) => rep(s, 'Edmonton, AB $|$', 'Edmonton, AB $|$ Open to relocation $|$'), 'header'],
  ['location with timezone', (s) => rep(s, 'Edmonton, AB $|$', 'Edmonton, AB $|$ MST $|$'), 'header'],
  ['location alone on its line (\\\\) is fine', (s) => rep(s, 'Edmonton, AB $|$', 'Edmonton, AB \\\\'), null],
  ['location spelled out', (s) => rep(s, 'Edmonton, AB $|$', 'Edmonton, Alberta $|$'), 'header'],
  ['wrong email', (s) => s.replaceAll('baotnguyen8@gmail.com', 'bao@example.com'), 'header'],
  ['mailto:mailto:', (s) => rep(s, 'mailto:baotnguyen8', 'mailto:mailto:baotnguyen8'), 'header'],
  ['no email at all', (s) => rep(s, /\\href\{mailto:[^\n]*\n/.exec(s)[0], ''), 'header'],
  ['right link, wrong email shown', (s) => rep(s, '\\underline{baotnguyen8@gmail.com}', '\\underline{old@gmail.com}'), 'header'],
  ['no LinkedIn link', (s) => rep(s, /\\href\{https:\/\/www\.linkedin[^\n]*\n/.exec(s)[0], ''), 'header'],
  ['no GitHub link', (s) => rep(s, '\\href{https://github.com/BaoTNguyen}{\\faGithub\\ \\underline{GitHub}}', ''), 'header'],
  ['full URL shown instead of the word', (s) => rep(s, '\\underline{GitHub}', '\\underline{github.com/BaoTNguyen}'), 'header'],
  ['envelope icon in header', (s) => rep(s, '\\underline{baotnguyen8@gmail.com}', '\\faEnvelope\\ \\underline{baotnguyen8@gmail.com}'), 'content'],
  ['icon in a bullet', withB1('Took \\faStar agentic AI to clients'), 'content'],
  ['image logo', (s) => rep(s, '\\faGithub', '\\includegraphics{gh.png}'), 'content'],
  ['two-column layout', (s) => rep(s, '\\section{Experience}', '\\begin{multicols}{2}\n\\section{Experience}'), 'content'],
  ['twocolumn class option', (s) => rep(s, '[letterpaper,11pt]', '[letterpaper,11pt,twocolumn]'), 'content'],

  // ---- experience ----
  ['same company repeated', (s) => rep(s, '\\resumeSubheadingContinue\n            {Machine Learning Engineer Intern}{Apr 2024 -- Mar 2026}', '\\resumeSubheading{M2M Tech}{Vancouver, BC}{Machine Learning Engineer Intern}{Apr 2024 -- Mar 2026}'), 'experience'],
  ['same company, trailing period', (s) => rep(s, '\\resumeSubheadingContinue\n            {Machine Learning Engineer Intern}{Apr 2024 -- Mar 2026}', '\\resumeSubheading{M2M Tech.}{Vancouver, BC}{Machine Learning Engineer Intern}{Apr 2024 -- Mar 2026}'), 'experience'],
  ['continuation with no company before it', (s) => rep(s, '\\resumeSubheading\n        {M2M Tech}{Vancouver, BC}\n        {Machine Learning Engineer}{Apr 2026 -- Present}', '\\resumeSubheadingContinue{Machine Learning Engineer}{Apr 2026 -- Present}'), 'experience'],
  ['dates and location swapped', (s) => rep(s, '{M2M Tech}{Vancouver, BC}\n        {Machine Learning Engineer}{Apr 2026 -- Present}', '{M2M Tech}{Apr 2026 -- Present}\n        {Machine Learning Engineer}{Vancouver, BC}'), 'experience'],
  ['M2M location must be Vancouver', (s) => rep(s, '{M2M Tech}{Vancouver, BC}', '{M2M Tech}{Surrey, BC}'), 'experience'],

  // ---- projects ----
  ['project with a date', (s) => rep(s, '\\emph{Python}}}{}', '\\emph{Python}}}{2025}'), 'projects'],
  ['project with a description', (s) => rep(s, '\\emph{Python}}}{}', '\\emph{Python}} $|$ a coding agent}{}'), 'projects'],
  ['GitLab link', (s) => rep(s, 'https://github.com/BaoTNguyen/heart', 'https://gitlab.com/BaoTNguyen/heart'), 'projects'],
  ['GitHub profile, not repo', (s) => rep(s, 'https://github.com/BaoTNguyen/heart}', 'https://github.com/BaoTNguyen}'), 'projects'],
  ['name not underlined', (s) => rep(s, '\\underline{heart}', 'heart'), 'projects'],
  ['stack bold (no \\textnormal)', (s) => rep(s, '\\textnormal{$|$ \\emph{Python}}', '$|$ \\emph{Python}'), 'projects'],
  ['filler lib in stack', (s) => rep(s, '\\emph{Python}}}', '\\emph{Python, scikit-learn}}}'), 'projects'],
  ['psycopg2 allowed in stack', (s) => rep(s, '\\emph{Python}}}', '\\emph{Python, psycopg2}}}'), null],
  ['dependency posture in stack', (s) => rep(s, '\\emph{Python}}}', '\\emph{Python (standard library only)}}}'), 'projects'],
  ['technique in stack', (s) => rep(s, '\\emph{Python}}}', '\\emph{Python, git worktrees}}}'), 'projects'],
  ['marrow project', (s) => rep(s, 'BaoTNguyen/heart', 'BaoTNguyen/marrow'), 'content'],
  ['STAT 471 project', (s) => rep(s, '\\underline{heart}', '\\underline{STAT 471}'), 'content'],

  // ---- skills ----
  ['LaTeX listed as a skill', (s) => s.replace(/(Git, Linux)/, '$1, LaTeX'), 'skills'],
  ['PostgreSQL filed as a tool', (s) => s.replace(/(Git, Linux)/, '$1, PostgreSQL').replace('FastAPI, PostgreSQL,', 'FastAPI,'), 'skills'],
  ['pytest filed as a tool', (s) => s.replace(/(Git, Linux)/, '$1, pytest').replace('pgvector, pytest}', 'pgvector}'), 'skills'],
  ['Codex filed as a library', (s) => s.replace('Codex, ', '').replace('pgvector, pytest}', 'pgvector, pytest, Codex}'), 'skills'],
  ['fourth category', (s) => rep(s, SKILL_LIBS, `${SKILL_LIBS} \\\\\n\\textbf{Frameworks}{: Django}`), 'skills'],
  ['renamed category', (s) => rep(s, '\\textbf{Developer Tools}', '\\textbf{Tools}'), 'skills'],
  ['missing Azure', (s) => rep(s, 'AWS, GCP, Azure,', 'AWS, GCP,'), 'skills'],
  ['filler lib, any case', (s) => rep(s, 'pgvector}', 'pgvector, Scikit-Learn}'), 'skills'],
  ['filler lib declared as a term', (s) => rep(rep(s, 'pgvector}', 'pgvector, scikit-learn}'), TERMS, `${TERMS}, scikit-learn`), null],
  ['Rust in Languages is allowed', (s) => rep(s, '{: Python, R, SQL}', '{: Python, R, SQL, Rust}'), null],
  ['FastAPI filed as a tool', (s) => rep(rep(s, 'MCP, FastAPI, PostgreSQL', 'MCP, PostgreSQL'), 'Git, Linux}', 'Git, Linux, FastAPI}'), 'skills'],
  ['PostgreSQL filed as a library', (s) => rep(rep(s, 'Cursor, PostgreSQL, Git', 'Cursor, Git'), 'pgvector}', 'pgvector, PostgreSQL}'), 'skills'],
  ['duplicate skill', (s) => rep(s, 'pgvector}', 'pgvector, PyTorch}'), 'skills'],

  // ---- certifications ----
  ['only one cert', (s) => rep(s, CERT_AWS, ''), 'certifications'],
  ['AWS-only terms need AWS first', (s) => rep(s, TERMS, `${TERMS}, SageMaker`), 'certifications'],
  ['AWS-only terms with AWS first pass', (s) => rep(rep(rep(s, TERMS, `${TERMS}, SageMaker`), CERT_GCP, 'GCPLINE'), CERT_AWS, CERT_GCP).replace('GCPLINE', CERT_AWS), null],
  ['Azure terms keep GCP first', (s) => rep(s, TERMS, `${TERMS}, Azure`), null],
  ['date not bold', (s) => rep(s, '\\textbf{\\small Sep 2025}', '\\small Sep 2025'), 'certifications'],
  ['cert name not bold', (s) => rep(s, '\\textbf{\\small GCP Professional Machine Learning Engineer}', '\\small GCP Professional Machine Learning Engineer'), 'certifications'],
  ['wrong cert date', (s) => rep(s, 'Sep 2025', 'Sept 2025'), 'certifications'],
  ['invented Azure cert', (s) => rep(s, CERT_AWS, `${CERT_AWS}\n\\textbf{\\small Azure AI Engineer Associate} & \\textbf{\\small Jan 2026} \\\\`), 'certifications'],

  // ---- content ----
  ['NeMo alone', withB1('Took agentic AI on NeMo to clients'), 'content'],
  ['Nvidia NeMo (wrong case)', withB1('Took agentic AI on Nvidia NeMo to clients'), 'content'],
  ['Expected graduation', (s) => rep(s, 'Graduated June 2026', 'Expected June 2026'), 'content'],
  ['date range in Education', (s) => rep(s, 'Graduated June 2026', 'Sep 2021 -- June 2026'), 'content'],
  ['UofA under another name', (s) => rep(s, '{University of Alberta}', '{U of A}'), 'content'],
];

for (const [name, mutate, rule] of CASES) {
  for (const [kind, base] of [['hand', HAND], ['generated', GEN]]) {
    let src;
    try { src = mutate(base); } catch { continue; } // case written against markup this fixture doesn't have
    test(`${kind}: ${name}`, () => {
      const errs = lint(src).errors;
      if (rule) assert.ok(errs.some((e) => e.startsWith(`[${rule}]`)), `expected a [${rule}] error, got:\n${errs.join('\n') || '(none)'}`);
      else assert.deepEqual(errs, []);
    });
  }
}

test('both fixtures pass untouched', () => {
  assert.deepEqual(lint(HAND).errors, []);
  assert.deepEqual(lint(GEN).errors, []);
});

test('generated resume can declare narrative in tailoring-data.json', () => {
  const bare = GEN.replace(/% (narrative|terms):.*\n/g, '');
  assert.ok(lint(bare).errors.some((e) => e.startsWith('[narrative]')));
  assert.deepEqual(lint(bare, { narrative: 'ML engineer who ships agents', terms: ['agent', 'client'] }).errors, []);
});

test('rendered line counting', () => {
  assert.equal(renderedLineErrors('  • one\n    two\n    three\n  • ok').length, 1);
  assert.equal(renderedLineErrors('  • one\n\n    two\nSkills\n  Languages').length, 0);
});

// Geometry measured from a real compile: a one-line bullet padded until its edge hit the margin (582.5) left a 24.9pt gap.
test('flush-right last line', () => {
  const line = (x0, y, x1, text) => `<line xMin="${x0}" yMin="${y}" xMax="${x1}" yMax="${y + 9}">${text.split(' ').map((w) => `<word>${w}</word>`).join('')}</line>`;
  const page = (shrankEdge) => [
    line(486.1, 188.9, 582.5, 'Apr 2024 – Mar 2026'),
    line(43.5, 364.2, shrankEdge, '• Shrank tool lists to about 3'),
    line(43.5, 377.1, 569.6, '• Paired each routed attempt with a solo run'),
    line(52.8, 389.1, 164.1, '(real change under 0.6 s)'),
    line(43.5, 449.0, 582.5, '• Verifies changes against the test suite'), // wraps: a full first line is fine
    line(52.8, 460.9, 166.7, 'and the reviewer approves'),
  ].join('\n');
  assert.equal(flushLineErrors(page(576.3)).length, 0, '6pt short of the margin is fine');
  assert.equal(flushLineErrors(page(582.5)).length, 1, 'a last line at the margin is flagged');
});
