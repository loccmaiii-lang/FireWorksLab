import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

// 把脚本、样式和两个字形装进成品，双击 HTML 即可离线运行。
const output = await build({
  entryPoints: ['main.js'],
  bundle: true,
  format: 'iife',
  minify: true,
  legalComments: 'inline',
  target: 'es2020',
  write: false,
});
const fonts = await Promise.all(
  ['normal', 'italic'].map(async (style) => {
    const file =
      'node_modules/@fontsource/dm-serif-text/files/dm-serif-text-latin-400-' + style + '.woff2';
    const font = (await readFile(file)).toString('base64');
    return (
      "@font-face{font-family:'DM Serif Text';font-weight:400;font-style:" +
      style +
      ';font-display:swap;src:url(data:font/woff2;base64,' +
      font +
      ") format('woff2')}"
    );
  }),
);
const fontLicense = await readFile('node_modules/@fontsource/dm-serif-text/LICENSE', 'utf8');
const threeLicense = await readFile('node_modules/three/LICENSE', 'utf8');
const [page, css] = await Promise.all(
  ['page.html', 'style.css'].map((file) => readFile(file, 'utf8')),
);
const script = output.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await writeFile(
  'index.html',
  page
    .replace('/* FONT_AND_CSS */', () => fonts.join('\n') + '\n' + css)
    .replace('/* APP */', () => script)
    .replace('<!-- LICENSES -->', () => '<!--\n' + threeLicense + '\n' + fontLicense + '\n-->'),
);
