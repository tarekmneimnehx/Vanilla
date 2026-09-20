// Makes the static web export relocatable so it can be hosted under any sub-path
// (for example a shared preview link): relative asset URLs, a runtime <base>,
// and a loader that finds the bundle next to the page.
// Run after: npx expo export --platform web
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const entryMatch = html.match(/src="\/_expo\/static\/js\/web\/(entry-[^"]+\.js)"/);
if (!entryMatch) throw new Error('entry bundle not found in index.html');

// Some hosts reserve names starting with "_": move the bundles to bundles/.
const oldJsDir = path.join(dist, '_expo', 'static', 'js', 'web');
const jsDir = path.join(dist, 'bundles');
fs.mkdirSync(jsDir, { recursive: true });
for (const file of fs.readdirSync(oldJsDir)) fs.renameSync(path.join(oldJsDir, file), path.join(jsDir, file));
fs.rmSync(path.join(dist, '_expo'), { recursive: true, force: true });
const entry = `bundles/${entryMatch[1]}`;

// Relative asset and bundle references inside every JS bundle.
for (const file of fs.readdirSync(jsDir)) {
  if (!file.endsWith('.js')) continue;
  const full = path.join(jsDir, file);
  const src = fs.readFileSync(full, 'utf8');
  const out = src.split('"/assets/').join('"assets/').split("'/assets/").join("'assets/").split('/_expo/static/js/web/').join('bundles/');
  fs.writeFileSync(full, out);
}

const loader = `
<script>
(function () {
  var href = location.href.split(/[?#]/)[0];
  var candidates = [];
  if (href.slice(-1) === '/') candidates.push(href);
  else if (/\\.html?$/.test(href)) candidates.push(href.replace(/[^/]*$/, ''));
  else { candidates.push(href + '/'); candidates.push(href.replace(/[^/]*$/, '')); }
  function boot(base) {
    var b = document.createElement('base');
    b.setAttribute('href', base);
    document.head.insertBefore(b, document.head.firstChild);
    var s = document.createElement('script');
    s.src = base + '${entry}';
    s.defer = true;
    document.body.appendChild(s);
  }
  function probe(i) {
    if (i >= candidates.length) { boot(candidates[0]); return; }
    fetch(candidates[i] + 'metadata.json', { cache: 'no-store' })
      .then(function (r) { if (r.ok) boot(candidates[i]); else probe(i + 1); })
      .catch(function () { probe(i + 1); });
  }
  probe(0);
})();
</script>`;

html = html
  .replace(/<script src="\/_expo\/[^"]+" defer><\/script>/, '')
  .replace(/href="\/favicon\.ico"/g, 'href="favicon.ico"')
  .replace(/<title>[^<]*<\/title>/, '<title>Rituvaya preview</title>')
  .replace('</body>', `${loader}\n</body>`);
fs.writeFileSync(indexPath, html);

const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else files.push(path.relative(dist, full).split(path.sep).join('/'));
  }
})(dist);
fs.writeFileSync(path.join(dist, 'files.json'), JSON.stringify(files.filter((f) => f !== 'index.html' && f !== 'files.json'), null, 2));
console.log('prepared', files.length, 'files; entry', entry);
