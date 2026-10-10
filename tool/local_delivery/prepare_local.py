"""Deploy the configured private importer locally; never embed it in public HTML."""
import json
import re
from pathlib import Path


def prepare(tool_root, importer=None, setup=None):
    tool_root = Path(tool_root)
    setup = Path(setup) if setup else Path.home() / '.fireworkslab/delivery-launcher.json'
    if not importer and setup.is_file():
        importer = json.loads(setup.read_text(encoding='utf-8')).get('importerPath')
    if not importer:
        return False
    html = Path(importer).read_text(encoding='utf-8')
    for kind in ('workspace-view-state', 'workspace-import-state'):
        anchor = "parent.postMessage({type:'" + kind + "'"
        if html.count(anchor) != 1:
            raise ValueError('本机导入器状态接口不匹配，请重构独立导入入口')
        html = html.replace(anchor, "window.postMessage({type:'" + kind + "'")
    # file: has an opaque serialized origin; literal 'null' is not a valid targetOrigin.
    html, count = re.subn(r"(window\.postMessage\(\{type:'workspace-(?:view|import)-state'[^\n]*?),location\.origin\)",
                         r"\1,location.protocol==='file:'?'*':location.origin)", html)
    if count != 2:
        raise ValueError('本机导入器广播目标接口不匹配')
    if html.count('</body>') != 1:
        raise ValueError('本机导入器HTML无效')
    # Private code stays in a gitignored sidecar. Stable URL preserves file storage.
    scripts = ''.join('<script>\n' + (tool_root / 'local_delivery' / name).read_text(encoding='utf-8')
                      + '\n</script>' for name in ('directory-client.js', 'delivery-host.js'))
    html = html.replace('</body>', scripts + '</body>')
    dest = tool_root / 'local_delivery/runtime/importer.html'
    dest.parent.mkdir(parents=True, exist_ok=True)
    temp = dest.with_suffix('.tmp')
    temp.write_text(html, encoding='utf-8')
    temp.replace(dest)
    return True
