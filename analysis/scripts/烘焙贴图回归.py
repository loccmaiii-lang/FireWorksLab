"""Compare full RGBA bake output with a saved HTML revision (including V5 fades).

Default cases: JM4 and V5 small/medium/large, full export resolution. Every
texture, channel and frame is compared; nonzero differences fail the command.
Set FW_BROWSER_EXECUTABLE only to select an already installed Chromium.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile

import numpy as np
from playwright.sync_api import sync_playwright
from browser_runtime import chromium_options, verify_renderer

ROOT = Path(__file__).resolve().parents[2]
JS_BAKE = r"""async ({id, legacy}) => {
  state.stillBusy = true; clearTimeout(bakeTimer);
  const {P} = replicaPM(id); if (legacy) P.renderVer = 37;
  const b = await bake(P, 1, null), textures = [];
  const capture = (s, part) => {
    for (const key of ['head', 'tail']) {
      if (!s[key]) continue;
      const bytes = readRGBA8(s[key]); let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000)
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      textures.push({part: part + '/' + key, width: s.N, height: s.NH,
        cols: s.meta.L.cols, rows: s.meta.L.rows, frames: s.meta.L.F,
        data: btoa(binary)});
    }
  };
  try {
    for (let s = b, i = 0; s; s = s.next, i++) capture(s, 'segment' + i);
    for (const f of b.fades || []) capture(f, 'fade' + f.fps);
    return textures;
  } finally { disposeBake(b); }
}"""


def render(browser, html, ids, legacy, out, label):
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    try:
        page.goto(html.resolve().as_uri() + '?fast', wait_until='domcontentloaded')
        page.wait_for_function('window.__fw && window.__fw.idle()', timeout=180000)
        page.evaluate('state.stillBusy = true; clearTimeout(bakeTimer);')
        renderer = page.evaluate("document.querySelector('#gpu').title")
        verify_renderer(renderer)
        print(label, renderer, flush=True)
        result = {}
        for id in ids:
            textures = page.evaluate(JS_BAKE, {'id': id, 'legacy': legacy})
            for tex in textures:
                raw = base64.b64decode(tex.pop('data'))
                key = id + '/' + tex['part']
                data = np.frombuffer(raw, dtype=np.uint8)
                name = key.replace('/', '_') + '.npz'
                np.savez_compressed(out / (label + '_' + name), pixels=data)
                tex['sha256'] = hashlib.sha256(raw).hexdigest()
                tex['nonzero'] = int(np.count_nonzero(data))
                tex['path'] = label + '_' + name
                result[key] = tex
            print(label, id, len(textures), 'textures', flush=True)
        if errors:
            raise RuntimeError('Browser page errors: ' + '; '.join(errors))
        return result, renderer
    finally:
        page.close()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--ref', default='a707b63')
    ap.add_argument('--ids', default='JM4,TR2S,TR2M,TR2L')
    ap.add_argument('--out', required=True, help='Use an ignored local folder for full texture arrays')
    ap.add_argument('--report', required=True, help='Small JSON report suitable for committing')
    args = ap.parse_args()
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    fd, ref_name = tempfile.mkstemp(prefix='_ref_atlas_', suffix='.html', dir=ROOT / 'tool')
    os.close(fd); ref = Path(ref_name)
    ref.write_bytes(subprocess.run(['git', 'show', f'{args.ref}:tool/FireworkBaker.html'],
                                   cwd=ROOT, capture_output=True, check=True).stdout)
    try:
        with sync_playwright() as pw:
            with pw.chromium.launch(**chromium_options()) as browser:
                old, old_gpu = render(browser, ref, args.ids.split(','), False, out, 'old')
                new, new_gpu = render(browser, ROOT / 'tool/FireworkBaker.html', args.ids.split(','), True, out, 'new')
        rows = []
        for key in sorted(old.keys() | new.keys()):
            a, b = old.get(key), new.get(key)
            same_shape = a is not None and b is not None and all(a[k] == b[k] for k in ['width', 'height', 'cols', 'rows', 'frames'])
            row = {'texture': key, 'old': a, 'new': b, 'pass': False}
            if same_shape:
                x = np.load(out / a['path'])['pixels'].astype(np.int16)
                y = np.load(out / b['path'])['pixels'].astype(np.int16)
                delta = np.abs(x - y)
                row.update(max=int(delta.max()), mean=float(delta.mean()), changed=int(np.count_nonzero(delta)))
                row['pass'] = row['max'] == 0 and a['nonzero'] > 0
            rows.append(row)
        report = {'ref': args.ref, 'legacy': True, 'renderers': [old_gpu, new_gpu], 'textures': rows,
                  'pass': bool(rows) and all(r['pass'] for r in rows)}
        dest = Path(args.report); dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print('PASS' if report['pass'] else 'FAIL', dest, flush=True)
        if not report['pass']:
            raise SystemExit(1)
    finally:
        ref.unlink(missing_ok=True)


if __name__ == '__main__':
    main()
