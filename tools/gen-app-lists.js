#!/usr/bin/env node
// Writes app-lists.json — the app's vocabulary (types, type → template map,
// templates, energy sources, devices, verification codes, locations,
// hospitals) that loto-web checks its own lists against (gap review 3.4,
// build 109) — from index.html. Only the literal constants DATA, HOSPITALS,
// EQUIPMENT_TEMPLATE_MAP, DEVICE_VERIFICATION_MAP and the function
// appListsSnapshot are taken out of the page and evaluated, in an empty
// sandbox: no other page code runs. The build number is the header label's.
//
//   node tools/gen-app-lists.js           write app-lists.json (npm run build / sync run this)
//   node tools/gen-app-lists.js --check   exit 1 when the committed file is stale
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const outPath = path.join(root, 'app-lists.json');

// The balanced { … } or [ … ] starting at or after `from`, skipping strings
// and comments (these literals hold no regex or template literals).
function balanced(src, from) {
  const open = from + src.slice(from).search(/[[{]/);
  let depth = 0;
  let quote = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && next === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && next === '*') { i = src.indexOf('*/', i + 2) + 1; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '`') throw new Error('template literal inside an extracted block at ' + i);
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error('unbalanced block from ' + open);
}

function constLiteral(name) {
  const m = new RegExp('\\nconst ' + name + ' = ').exec(html);
  if (!m) throw new Error('const ' + name + ' not found in index.html');
  return balanced(html, m.index + m[0].length);
}

function functionSource(name) {
  const m = new RegExp('\\nfunction ' + name + '\\(').exec(html);
  if (!m) throw new Error('function ' + name + ' not found in index.html');
  const body = html.indexOf('{', m.index);
  return html.slice(m.index + 1, body) + balanced(html, body);
}

const label = /VA LOTO Collector <span[^>]*>v[\d.]+ &middot; b(\d+)<\/span>/.exec(html);
if (!label) throw new Error('header build label ("v7.0 · bNNN") not found in index.html');
const build = parseInt(label[1], 10);

const sandbox = vm.createContext({});
vm.runInContext(
  'const DATA = ' + constLiteral('DATA') + ';\n' +
  'const HOSPITALS = ' + constLiteral('HOSPITALS') + ';\n' +
  'const EQUIPMENT_TEMPLATE_MAP = ' + constLiteral('EQUIPMENT_TEMPLATE_MAP') + ';\n' +
  'const DEVICE_VERIFICATION_MAP = ' + constLiteral('DEVICE_VERIFICATION_MAP') + ';\n' +
  functionSource('appListsSnapshot') + '\n' +
  'this.__lists = JSON.stringify(appListsSnapshot(' + build + '), null, 2) + "\\n";',
  sandbox, { timeout: 2000 });
const text = sandbox.__lists;

if (process.argv.includes('--check')) {
  const have = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
  if (have !== text) {
    console.error('app-lists.json is stale — run: node tools/gen-app-lists.js');
    process.exit(1);
  }
  console.log('app-lists.json matches index.html (build ' + build + ')');
} else {
  fs.writeFileSync(outPath, text);
  console.log('wrote app-lists.json (build ' + build + ')');
}
