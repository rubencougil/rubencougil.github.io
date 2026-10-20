import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);

if (args.includes('--help')) {
    console.log('Usage: node scripts/sync-content.mjs [--check]');
    console.log('After editing i18n/es.json or i18n/en.json, regenerate the static Spanish HTML and embedded translations.');
    console.log('--check reports stale generated content without modifying files.');
    process.exit(0);
}
if (args.some((arg) => arg !== '--check')) {
    throw new Error('Unknown argument. Run with --help for usage.');
}

function escapeHtml(value) {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

const translations = {};
for (const locale of ['en', 'es']) {
    translations[locale] = JSON.parse(await readFile(new URL(`i18n/${locale}.json`, root), 'utf8'));
}
const spanishKeys = Object.keys(translations.es).sort();
if (JSON.stringify(spanishKeys) !== JSON.stringify(Object.keys(translations.en).sort())) {
    throw new Error('Spanish and English dictionaries must contain the same keys.');
}

function translate(key) {
    const value = translations.es[key];
    if (typeof value !== 'string') {
        throw new Error(`Missing Spanish translation: ${key}`);
    }
    return value;
}

const html = await readFile(new URL('index.html', root), 'utf8');
const withAttributes = html.replace(
    /<[a-z][a-z0-9]*\b[^>]*\bdata-i18n="\[(content|alt|aria-label)\]([^"]+)"[^>]*>/g,
    (tag, attribute, key) => {
        const pattern = new RegExp(`\\b${attribute}="[^"]*"`);
        if (!pattern.test(tag)) {
            throw new Error(`Missing ${attribute} attribute for translation: ${key}`);
        }
        return tag.replace(pattern, () => `${attribute}="${escapeHtml(translate(key))}"`);
    }
);
const synchronizedHtml = withAttributes.replace(
    /(<([a-z][a-z0-9]*)\b[^>]*\bdata-i18n="(\[html\])?([^"[\]]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (match, opening, tag, isHtml, key, content, closing) => {
        const value = translate(key);
        const leading = content.match(/^\s*/)[0];
        const trailing = content.trim() ? content.match(/\s*$/)[0] : '';
        return `${opening}${leading}${isHtml ? value : escapeHtml(value)}${trailing}${closing}`;
    }
);

const outputs = new Map([
    ['index.html', synchronizedHtml],
    ['js/i18n-inline.js', `window.__I18N = ${JSON.stringify(translations)};\n`]
]);
let stale = false;
for (const [path, expected] of outputs) {
    const url = new URL(path, root);
    const actual = await readFile(url, 'utf8');
    if (actual === expected) {
        continue;
    }
    if (args.includes('--check')) {
        console.error(`Stale generated content: ${path}. Run node scripts/sync-content.mjs.`);
        stale = true;
    } else {
        await writeFile(url, expected);
        console.log(`Updated ${path}`);
    }
}
if (stale) {
    process.exitCode = 1;
}
