#!/usr/bin/env node
// Cybrainx app pages generator — zero dependencies, Node 18+.
//
//   node _generator/generate.mjs                 build every app from _apps/*.json
//   node _generator/generate.mjs --check         dry run: validate, check links, list pending changes
//   node _generator/generate.mjs new <slug> "<Name>" [--lang pt]
//   node _generator/generate.mjs from-app <path-to-expo-app> [--slug <slug>] [--lang pt]
//
// For each app with "mode": "generated" it writes <slug>/index.html,
// <slug>/privacy-policy.html and <slug>/terms-of-use.html. It also keeps three
// generated regions up to date on the hub: the app cards on index.html (only
// for apps that have no hand-made card), the app count, and the app list of
// data-deletion-request.html. Files it did not create are never overwritten.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PERMISSIONS, SERVICES, SIGN_IN_PROVIDERS } from './catalog.mjs';
import { legalContext, privacyPolicy, termsOfUse } from './legal.mjs';
import { APP_PAGES_CSS, CSS_MARKER, MARKER, appPage, homeCard, legalPage } from './templates.mjs';
import { HEX_RE, formatDate, sha256, shiftHue, today } from './util.mjs';
import { appFromExpoProject } from './from-app.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPS_DIR = join(ROOT, '_apps');
const SITE = JSON.parse(readFileSync(join(ROOT, '_generator', 'site.json'), 'utf8'));
const CI = process.env.GITHUB_ACTIONS === 'true';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FA_RE = /^fa-(solid|regular|brands) fa-[a-z0-9-]+$/;
const PKG_RE = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const RESERVED = new Set(['assets', 'images', 'css', 'js', 'node_modules']);

const KNOWN_KEYS = new Set([
  'name', 'mode', 'lang', 'headline', 'tagline', 'description', 'icon', 'image', 'colors', 'tags',
  'category', 'stores', 'features', 'highlights', 'screenshots', 'plans', 'privacyBlurb', 'home', 'legal',
]);
const KNOWN_LEGAL_KEYS = new Set([
  'updated', 'platforms', 'minAge', 'account', 'services', 'ads', 'permissions', 'purpose', 'onDevice', 'cloud',
  'dataCards', 'scopeNote', 'aiNote', 'userContent', 'purchases', 'subscriptions', 'extraPrivacy', 'extraTerms',
  'privacy', 'terms',
]);

// ─── Reporting ──────────────────────────────────────────────────────────────

const errors = [];
const warnings = [];
const rel = (p) => relative(ROOT, p).split(sep).join('/');
const error = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

function flushReport() {
  for (const w of warnings) {
    console.log(`  ⚠ ${w.file}: ${w.msg}`);
    if (CI) console.log(`::warning file=${w.file}::${w.msg}`);
  }
  for (const e of errors) {
    console.log(`  ✖ ${e.file}: ${e.msg}`);
    if (CI) console.log(`::error file=${e.file}::${e.msg}`);
  }
}

// ─── Manifests ──────────────────────────────────────────────────────────────

function loadApps() {
  if (!existsSync(APPS_DIR)) return [];
  const apps = [];
  for (const file of readdirSync(APPS_DIR).sort()) {
    if (!file.endsWith('.json') || file.startsWith('_')) continue;
    const path = `_apps/${file}`;
    let app;
    try {
      app = JSON.parse(readFileSync(join(APPS_DIR, file), 'utf8'));
    } catch (e) {
      error(path, `invalid JSON — ${e.message}`);
      continue;
    }
    app.slug = file.replace(/\.json$/, '');
    app._file = path;
    if (validate(app)) apps.push(app);
  }
  return apps;
}

function validate(app) {
  const f = app._file;
  const before = errors.length;
  const need = (cond, msg) => cond || error(f, msg);
  const isText = (v) => typeof v === 'string' && v.trim().length > 0;
  const list = (v) => v === undefined || Array.isArray(v);

  need(SLUG_RE.test(app.slug), `file name must be the app slug in kebab-case (e.g. "my-app.json"), got "${app.slug}"`);
  need(!RESERVED.has(app.slug), `"${app.slug}" is a reserved folder name`);
  need(isText(app.name), '"name" is required');
  app.mode = app.mode || 'generated';
  need(['generated', 'manual'].includes(app.mode), '"mode" must be "generated" or "manual"');
  for (const key of Object.keys(app)) {
    if (!key.startsWith('_') && key !== 'slug' && !KNOWN_KEYS.has(key)) warn(f, `unknown field "${key}" (typo?)`);
  }
  for (const key of Object.keys(app.legal || {})) {
    if (!KNOWN_LEGAL_KEYS.has(key)) warn(f, `unknown field "legal.${key}" (typo?)`);
  }
  if (app.home !== undefined && typeof app.home !== 'object') error(f, '"home" must be an object');

  if (app.mode === 'manual') {
    const dir = join(ROOT, app.slug);
    need(existsSync(join(dir, 'index.html')), `manual app: ${app.slug}/index.html does not exist`);
    for (const [key, fallback] of [['privacy', 'privacy-policy.html'], ['terms', 'terms-of-use.html']]) {
      const target = app.legal?.[key] || fallback;
      need(resolvePage(join(dir, target)), `manual app: legal page ${app.slug}/${target} does not exist (set "legal.${key}")`);
    }
    return errors.length === before;
  }

  app.lang = app.lang || 'en';
  need(['en', 'pt'].includes(app.lang), '"lang" must be "en" or "pt"');
  need(isText(app.headline), '"headline" is required (hero title of the app page)');
  need(isText(app.tagline), '"tagline" is required (one sentence for the home card and search engines)');
  need(isText(app.description), '"description" is required');
  if (isText(app.tagline) && app.tagline.length > 170) warn(f, '"tagline" is long; keep it under ~160 characters');
  need(FA_RE.test(app.icon || ''), '"icon" must be a Font Awesome class such as "fa-solid fa-star"');
  need(Array.isArray(app.colors) && app.colors.length >= 1 && app.colors.length <= 2 && app.colors.every((c) => HEX_RE.test(c)),
    '"colors" must be one or two hex colors, e.g. ["#8b5cf6", "#3b82f6"]');
  if (Array.isArray(app.colors) && app.colors.length === 1 && HEX_RE.test(app.colors[0])) {
    app.colors = [app.colors[0], shiftHue(app.colors[0], 35)];
  }
  need(list(app.tags) && (app.tags || []).every((t) => isText(t.label) && FA_RE.test(t.icon || '')),
    '"tags" must be [{ "icon": "fa-solid fa-...", "label": "..." }]');
  need(list(app.features) && (app.features || []).every((x) => isText(x.title) && isText(x.text) && FA_RE.test(x.icon || '')),
    '"features" must be [{ "icon": "fa-solid fa-...", "title": "...", "text": "..." }]');
  if (!app.features?.length) warn(f, 'no "features" — the page will have no feature section');
  need(list(app.highlights) && (app.highlights || []).every(isText), '"highlights" must be a list of short texts');
  need(list(app.plans) && (app.plans || []).every((pl) => isText(pl.name) && list(pl.items)), '"plans" must be [{ "name", "price", "items": [] }]');

  const stores = app.stores || {};
  if (stores.googlePlay !== undefined && stores.googlePlay !== '') need(PKG_RE.test(stores.googlePlay), '"stores.googlePlay" must be the Android package, e.g. "com.cybrainx.myapp"');
  if (stores.appStore) need(/^https:\/\/apps\.apple\.com\//.test(stores.appStore), '"stores.appStore" must be an https://apps.apple.com/... URL');

  const assetExists = (p) => typeof p === 'string' && !p.includes('..') && existsSync(join(ROOT, app.slug, p));
  if (app.image) need(assetExists(app.image), `"image" not found: upload it to ${app.slug}/${app.image}`);
  need(list(app.screenshots), '"screenshots" must be a list of file names');
  for (const s of app.screenshots || []) need(assetExists(s), `screenshot not found: upload it to ${app.slug}/${s}`);

  const legal = app.legal || {};
  for (const id of legal.services || []) need(SERVICES[id], `unknown service "${id}" — known: ${Object.keys(SERVICES).join(', ')}`);
  for (const perm of legal.permissions || []) {
    need(typeof perm === 'string' ? PERMISSIONS[perm] : isText(perm?.name) && isText(perm?.why),
      `unknown permission ${JSON.stringify(perm)} — known: ${Object.keys(PERMISSIONS).join(', ')} (or { "name": "...", "why": "..." })`);
  }
  for (const id of legal.account?.providers || []) need(SIGN_IN_PROVIDERS[id], `unknown sign-in provider "${id}"`);
  if (legal.updated) need(DATE_RE.test(legal.updated), '"legal.updated" must be YYYY-MM-DD (or leave it out to date changes automatically)');
  if (legal.minAge !== undefined) need(Number.isInteger(legal.minAge) && legal.minAge > 0, '"legal.minAge" must be a whole number');
  for (const key of ['dataCards', 'extraPrivacy', 'extraTerms']) {
    need(list(legal[key]) && (legal[key] || []).every((x) => isText(x.title) && isText(x.text)), `"legal.${key}" must be [{ "title": "...", "text": "..." }]`);
  }
  for (const key of ['privacy', 'terms']) {
    if (legal[key]) error(f, `"legal.${key}" is only for manual apps — generated apps always get their own legal pages`);
  }
  if (!(legal.services || []).length) warn(f, 'no "legal.services" — the privacy policy will say no third-party services receive data');
  return errors.length === before;
}

// ─── Build ──────────────────────────────────────────────────────────────────

const outputs = new Map(); // repo-relative path → content

function readIfExists(path) {
  const abs = join(ROOT, path);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
}

/** Keep "Last updated" stable until the text of the page actually changes. */
function stampLegal(app, path, template) {
  const hash = sha256(template);
  const existing = readIfExists(path);
  const kept = existing?.includes(`content="${hash}"`) ? existing.match(/data-updated="(\d{4}-\d{2}-\d{2})"/)?.[1] : null;
  const iso = app.legal?.updated || kept || today();
  return template
    .replace('%%HASH%%', hash)
    .replace('%%UPDATED_ISO%%', iso)
    .replace('%%UPDATED%%', formatDate(iso, app.lang))
    .replace('%%YEAR%%', String(new Date().getFullYear()));
}

function buildApp(app) {
  const year = new Date().getFullYear();
  const ctx = legalContext(app, SITE);
  outputs.set(`${app.slug}/index.html`, appPage(app, SITE, year));
  outputs.set(`${app.slug}/privacy-policy.html`, stampLegal(app, `${app.slug}/privacy-policy.html`, legalPage(app, SITE, privacyPolicy(ctx), 'privacy')));
  outputs.set(`${app.slug}/terms-of-use.html`, stampLegal(app, `${app.slug}/terms-of-use.html`, legalPage(app, SITE, termsOfUse(ctx), 'terms')));
}

function replaceRegion(html, start, end, body) {
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i === -1 || j === -1 || j < i) return null;
  return html.slice(0, i + start.length) + body + html.slice(j);
}

const CARDS_START = '<!-- APP-CARDS:START — generated from _apps/*.json, do not edit by hand -->';
const CARDS_END = '<!-- APP-CARDS:END -->';

function buildHome(apps) {
  let html = readIfExists('index.html');
  if (!html) return error('index.html', 'not found');

  if (!html.includes(CARDS_START)) {
    const section = html.indexOf('id="apps"');
    const close = section === -1 ? -1 : html.indexOf('</section>', section);
    const gridEnd = close === -1 ? -1 : html.lastIndexOf('</div>', close);
    if (gridEnd === -1) return error('index.html', 'could not find the apps grid (<section id="apps"> … </div></section>)');
    const lineStart = html.lastIndexOf('\n', gridEnd) + 1;
    html = `${html.slice(0, lineStart)}            ${CARDS_START}\n            ${CARDS_END}\n\n${html.slice(lineStart)}`;
  }

  const outside = html.slice(0, html.indexOf(CARDS_START)) + html.slice(html.indexOf(CARDS_END));
  const cards = apps
    .filter((app) => app.home?.listed !== false && app.mode === 'generated')
    .filter((app) => !outside.includes(`href="${app.slug}/index.html"`) && !outside.includes(`href="${app.slug}/"`))
    .sort((a, b) => (a.home?.order ?? 1000) - (b.home?.order ?? 1000) || a.name.localeCompare(b.name))
    .map(homeCard)
    .join('');
  html = replaceRegion(html, CARDS_START, CARDS_END, `\n${cards}            `);

  const listed = apps.filter((app) => app.home?.listed !== false).length;
  const statRe = /(<span class="stat-num">)\d+(<\/span>\s*<span class="stat-label">Apps<\/span>)/;
  if (statRe.test(html)) html = html.replace(statRe, `$1${listed}$2`);
  else warn('index.html', 'app counter (<span class="stat-num">N</span><span class="stat-label">Apps</span>) not found — left as is');

  outputs.set('index.html', html);
}

const OPTIONS_START = '<!-- APP-OPTIONS:START — generated from _apps/*.json -->';
const OPTIONS_END = '<!-- APP-OPTIONS:END -->';
const PRESELECT_START = '<!-- APP-PRESELECT:START — generated -->';
const PRESELECT_END = '<!-- APP-PRESELECT:END -->';
const PRESELECT = `
    <script>
        // ?app=<slug> (used by each app page) preselects the app in the form.
        (function () {
            var slug = (new URLSearchParams(window.location.search).get('app') || '').replace(/[^a-z0-9-]/g, '');
            var option = slug && document.querySelector('#app option[data-slug="' + slug + '"]');
            if (option) option.selected = true;
        })();
    </script>
    `;

function buildDeletionPage(apps) {
  const path = 'data-deletion-request.html';
  let html = readIfExists(path);
  if (!html) return warn(path, 'not found — app list not updated');

  if (!html.includes(OPTIONS_START)) {
    const first = html.match(/[ \t]*<option value="">[^\n]*<\/option>\n/);
    const website = html.match(/[ \t]*<option value="cybrainx\.com \(website\)">/);
    if (!first || !website || website.index < first.index) {
      return warn(path, 'could not find the app <select> options — app list not updated');
    }
    const indent = first[0].match(/^[ \t]*/)[0];
    const from = first.index + first[0].length;
    html = `${html.slice(0, from)}${indent}${OPTIONS_START}\n${indent}${OPTIONS_END}\n${html.slice(website.index)}`;
  }
  const indent = html.slice(html.lastIndexOf('\n', html.indexOf(OPTIONS_START)) + 1, html.indexOf(OPTIONS_START));
  const options = [...apps]
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .map((app) => `${indent}<option value="${escAttr(app.name)}" data-slug="${app.slug}">${escAttr(app.name)}</option>\n`)
    .join('');
  html = replaceRegion(html, OPTIONS_START, OPTIONS_END, `\n${options}${indent}`);

  if (!html.includes(PRESELECT_START)) {
    const body = html.lastIndexOf('</body>');
    html = `${html.slice(0, body)}    ${PRESELECT_START}${PRESELECT_END}\n${html.slice(body)}`;
  }
  html = replaceRegion(html, PRESELECT_START, PRESELECT_END, PRESELECT);
  outputs.set(path, html);
}

const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// ─── Ownership, links and housekeeping checks ───────────────────────────────

const HUB_FILES = new Set(['index.html', 'data-deletion-request.html']);

function checkOwnership() {
  for (const [path, content] of outputs) {
    if (HUB_FILES.has(path)) continue; // only generated regions change there
    const existing = readIfExists(path);
    if (existing === null) continue;
    const ours = path.endsWith('.css') ? existing.startsWith(CSS_MARKER) : existing.includes(MARKER);
    if (!ours) {
      error(path, 'already exists and was not created by the generator — refusing to overwrite it. Delete it (or rename the app) to let the generator own it.');
      outputs.delete(path);
    }
  }
}

function resolvePage(abs) {
  const clean = abs.split(/[?#]/)[0];
  if (existsSync(clean) && statSync(clean).isFile()) return clean;
  if (existsSync(join(clean, 'index.html'))) return join(clean, 'index.html');
  if (existsSync(`${clean}.html`)) return `${clean}.html`;
  return null;
}

function walkHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_') || entry.name === 'node_modules') continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(abs, out);
    else if (entry.name.endsWith('.html')) out.push(rel(abs));
  }
  return out;
}

function checkLinks(generated) {
  const pages = new Set([...walkHtml(ROOT), ...outputs.keys()].filter((p) => p.endsWith('.html')));
  const exists = (path) => outputs.has(path) || Boolean(resolvePage(join(ROOT, path))) || outputs.has(posix.join(path, 'index.html'));
  const base = new RegExp(`^https?://(www\\.)?${SITE.domain.replace(/\./g, '\\.')}/?`);

  for (const page of pages) {
    const html = outputs.get(page) ?? readIfExists(page) ?? '';
    const broken = new Set();
    for (const [, raw] of html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g)) {
      let target = raw.trim();
      if (/^(mailto:|tel:|#|javascript:|data:)/i.test(target)) continue;
      if (base.test(target)) target = `/${target.replace(base, '')}`;
      else if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue; // other sites and app deep links
      try {
        target = decodeURI(target.split(/[?#]/)[0]);
      } catch {
        broken.add(raw);
        continue;
      }
      if (!target) continue;
      const path = target.startsWith('/') ? target.slice(1) : posix.normalize(posix.join(posix.dirname(page), target));
      if (path.startsWith('..')) continue;
      if (!exists(path || 'index.html')) broken.add(raw);
    }
    if (broken.size) {
      const msg = `broken link${broken.size > 1 ? 's' : ''}: ${[...broken].join(', ')}`;
      generated.has(page) ? error(page, msg) : warn(page, msg);
    }
  }
}

function placeholderFiles(dir, depth = 0, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory() && depth < 1) placeholderFiles(abs, depth + 1, out);
    else if (/^(test|teste|text)\.txt$/.test(entry.name)) out.push(rel(abs));
  }
  return out;
}

function housekeeping(apps) {
  const placeholders = [];
  for (const app of apps) {
    const dir = join(ROOT, app.slug);
    if (!existsSync(dir)) continue;
    placeholders.push(...placeholderFiles(dir));
    const legacy = [['privacy.html', 'privacy-policy.html'], ['terms.html', 'terms-of-use.html']]
      .filter(([old, current]) => existsSync(join(dir, old)) && (existsSync(join(dir, current)) || outputs.has(`${app.slug}/${current}`)))
      .map(([old]) => old);
    if (legacy.length) {
      warn(`${app.slug}/`, `old legal page${legacy.length > 1 ? 's' : ''} ${legacy.join(' and ')} still published next to the current one — two public versions can contradict each other`);
    }
  }
  if (placeholders.length) {
    warn('(site)', `${placeholders.length} placeholder files (test.txt/teste.txt/text.txt) are published — safe to delete: ${placeholders.join(', ')}`);
  }
}

// ─── Commands ───────────────────────────────────────────────────────────────

function build({ dryRun }) {
  const apps = loadApps();
  const generated = apps.filter((a) => a.mode === 'generated');
  for (const app of generated) buildApp(app);
  if (generated.length) outputs.set('app-pages.css', APP_PAGES_CSS);
  buildHome(apps);
  buildDeletionPage(apps);
  checkOwnership();
  const generatedPaths = new Set(generated.flatMap((a) => ['index.html', 'privacy-policy.html', 'terms-of-use.html'].map((f) => `${a.slug}/${f}`)));
  checkLinks(generatedPaths);
  housekeeping(apps);

  const changes = [];
  for (const [path, content] of outputs) {
    const existing = readIfExists(path);
    if (existing === content) continue;
    changes.push(`${existing === null ? 'create' : 'update'} ${path}`);
    if (!dryRun && !errors.length) {
      mkdirSync(dirname(join(ROOT, path)), { recursive: true });
      writeFileSync(join(ROOT, path), content);
    }
  }

  console.log(`\nCybrainx app pages — ${apps.length} app(s): ${generated.length} generated, ${apps.length - generated.length} hand-made\n`);
  for (const app of generated) console.log(`  • ${app.name}: ${SITE.baseUrl}/${app.slug}/`);
  console.log('');
  flushReport();
  if (errors.length) {
    console.log(`\n✖ ${errors.length} error(s) — nothing was written.`);
    return 1;
  }
  if (!changes.length) console.log('✓ Everything is up to date.');
  else console.log(`${dryRun ? 'Pending' : '✓ Written'}:\n${changes.map((c) => `  ${c}`).join('\n')}`);

  if (CI && process.env.GITHUB_STEP_SUMMARY && generated.length) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### App pages\n\n${generated.map((a) => `- **${a.name}** — ${SITE.baseUrl}/${a.slug}/ · [privacy](${SITE.baseUrl}/${a.slug}/privacy-policy.html) · [terms](${SITE.baseUrl}/${a.slug}/terms-of-use.html)`).join('\n')}\n`);
  }
  return dryRun && changes.length ? 1 : 0;
}

function newApp(slug, name, lang) {
  if (!slug || !SLUG_RE.test(slug)) return fail('usage: new <slug-in-kebab-case> "<App Name>" [--lang pt]');
  const target = join(APPS_DIR, `${slug}.json`);
  if (existsSync(target)) return fail(`_apps/${slug}.json already exists`);
  const template = JSON.parse(readFileSync(join(APPS_DIR, '_TEMPLATE.json'), 'utf8'));
  template.name = name || slug;
  if (lang) template.lang = lang;
  writeFileSync(target, `${JSON.stringify(template, null, 2)}\n`);
  console.log(`✓ Created _apps/${slug}.json — fill it in, then run: node _generator/generate.mjs`);
  return 0;
}

function fromApp(projectPath, slugArg, lang) {
  if (!projectPath) return fail('usage: from-app <path-to-expo-app> [--slug <slug>] [--lang pt]');
  const result = appFromExpoProject(resolve(projectPath), { slug: slugArg, lang, siteRoot: ROOT });
  if (result.error) return fail(result.error);
  const target = join(APPS_DIR, `${result.slug}.json`);
  if (existsSync(target)) return fail(`_apps/${result.slug}.json already exists — delete it first or pass --slug`);
  writeFileSync(target, `${JSON.stringify(result.manifest, null, 2)}\n`);
  console.log(`✓ Created _apps/${result.slug}.json from ${projectPath}`);
  for (const line of result.notes) console.log(`  • ${line}`);
  console.log('\nFill in "headline", "tagline", "description" and "features", then run: node _generator/generate.mjs');
  return 0;
}

function fail(msg) {
  console.error(`✖ ${msg}`);
  return 1;
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const lang = flag('--lang');
const slug = flag('--slug');
const dryRun = args.includes('--check');
const [command, ...rest] = args.filter((a) => a !== '--check');

let code;
if (command === 'new') code = newApp(rest[0], rest[1], lang);
else if (command === 'from-app') code = fromApp(rest[0], slug, lang);
else if (!command) code = build({ dryRun });
else code = fail(`unknown command "${command}"`);
process.exitCode = code;
