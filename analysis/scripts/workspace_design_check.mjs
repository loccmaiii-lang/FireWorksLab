import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.join(root, 'tool/design-system');
const tokens = JSON.parse(fs.readFileSync(path.join(directory, 'tokens.json'), 'utf8'));
function luminance(hex) {
  const rgb = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + .05) / (dark + .05);
}
const c = tokens.color;
const pairs = [
  ['on-surface', 'surface'], ['on-surface', 'surface-low'], ['on-surface', 'surface-container'],
  ['on-surface-muted', 'surface-low'], ['on-surface-muted', 'surface-container'], ['on-surface-muted', 'surface-high'],
  ['on-primary', 'primary'], ['on-primary', 'on-primary-container'], ['on-primary-container', 'primary-container'],
  ['error', 'error-container'], ['error', 'surface-low'], ['warning', 'warning-container'], ['success', 'success-container'],
];
for (const [foreground, background] of pairs) {
  const ratio = contrast(c[foreground], c[background]);
  assert.ok(ratio >= 4.5, `${foreground}/${background}: ${ratio.toFixed(2)} < 4.5`);
}
for (const surface of ['surface', 'surface-low', 'surface-container', 'surface-high']) {
  assert.ok(contrast(c.outline, c[surface]) >= 3, `Control outline fails against ${surface}`);
  assert.ok(contrast(c.focus, c[surface]) >= 3, `Focus fails against ${surface}`);
}
assert.equal(tokens.size['control-compact'], 32);
assert.ok(tokens.size['target-coarse'] >= 48);
const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
assert.ok(html.includes('lang="zh-CN"') && html.includes('<dialog') && html.includes('未') && html.includes('示例'));
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  assert.ok(!/^(?:https?:)?\/\//.test(match[1]), `Unexpected external dependency: ${match[1]}`);
  assert.ok(fs.existsSync(path.join(directory, match[1])), `Missing dependency: ${match[1]}`);
}
const icons = fs.readFileSync(path.join(directory, 'icons.js'), 'utf8');
for (const match of html.matchAll(/data-fw-icon="([^"]+)"/g)) {
  assert.ok(icons.includes('"' + match[1] + '"'), `Missing icon: ${match[1]}`);
}
const css = fs.readFileSync(path.join(directory, 'components.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
for (const match of css.matchAll(/([^{}]+)\{/g)) {
  const selector = match[1].trim();
  if (selector.startsWith('@')) continue;
  assert.ok(selector.split(',').every(part => part.trim().startsWith('.fw-')), `Unscoped selector: ${selector}`);
}
assert.ok(css.includes('prefers-reduced-motion: reduce'));
assert.ok(css.includes('focus-visible'));
console.log(`Workspace design: ${pairs.length} text pairs >= 4.5, controls/focus >= 3; offline references/icons/scoped styles pass.`);
