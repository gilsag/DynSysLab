// Creates a new lab module from src/labs/_template.
// Usage: npm run new-lab -- <id>        (id: lowercase letters, digits and dashes, e.g. "root-locus")
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const id = process.argv[2];
if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('Usage: npm run new-lab -- <id>   (lowercase letters, digits and dashes, e.g. root-locus)');
  process.exit(1);
}
if (existsSync(`src/labs/${id}`) || existsSync(`${id}.html`)) {
  console.error(`A lab called "${id}" already exists.`);
  process.exit(1);
}
cpSync('src/labs/_template', `src/labs/${id}`, { recursive: true });
const html = readFileSync('src/labs/_template/page.html.txt', 'utf8').replaceAll('__ID__', id);
writeFileSync(`${id}.html`, html);
// the copied module does not need the page template
import('node:fs').then(({ rmSync }) => rmSync(`src/labs/${id}/page.html.txt`));

console.log(`✓ Created src/labs/${id}/ and ${id}.html (served at /${id}.html with npm run dev).

Next steps:
  1. Build the lab in src/labs/${id}/ (App.tsx, i18n.ts, styles.css), following DESIGN.md.
  2. When it is ready to publish, register it in src/shared/suite.ts (title and summary in six
     languages) and add its glyph to GLYPHS in src/shared/LabChrome.tsx; then pass lab="${id}"
     to LabHeader instead of title. It will appear on the home page and in every lab's About.
  3. Put the same glyph in the favicon of ${id}.html.`);
