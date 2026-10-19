"""Deploy the configured private importer locally; never embed it in public HTML.

4.9.119（导出（23），用户 10-19 19:45）：文件入口加载的是这里生成的副本 runtime/importer.html。导入器修复只部署到源文件时
（10-19 12:06 独立交付 2.29），副本没人重新生成，用户照样跑旧版、Error 87 复现。现在副本带来源戳（源文件 sha256 / 修改时间），
旁边写 importer.source.json；runtime_state() 判断新旧，ensure_runtime() 旧了就重新生成（8034 服务在 /api/session 里调）。"""
import datetime
import hashlib
import json
import re
import threading
from pathlib import Path

STAMP_FILE = 'importer.source.json'
_lock = threading.Lock()


def source_stamp(importer):
    p = Path(importer); data = p.read_bytes(); st = p.stat()
    return {'sha256': hashlib.sha256(data).hexdigest(), 'size': st.st_size, 'file': p.name,
            'mtime': datetime.datetime.fromtimestamp(st.st_mtime).isoformat(timespec='seconds')}


def _runtime(tool_root):
    return Path(tool_root) / 'local_delivery' / 'runtime'


def runtime_state(tool_root, importer):
    """副本是不是由现在这份源文件生成的：{source, runtime（旁注里记的，没有 = None）, fresh}"""
    src = source_stamp(importer)
    try:
        rt = json.loads((_runtime(tool_root) / STAMP_FILE).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        rt = None
    html = _runtime(tool_root) / 'importer.html'
    fresh = bool(rt and html.is_file() and rt.get('sha256') == src['sha256'])
    return {'source': src, 'runtime': rt, 'fresh': fresh}


def ensure_runtime(tool_root, importer):
    """旧了（或 4.9.119 以前生成、没有戳）就按现在的源文件重新生成；返回 {source, refreshed}"""
    with _lock:
        st = runtime_state(tool_root, importer)
        if st['fresh']:
            return {'source': st['source'], 'refreshed': False}
        prepare(tool_root, importer)
        return {'source': runtime_state(tool_root, importer)['source'], 'refreshed': True}


def stamp_script(stamp):
    return '<script>window.__DF_IMPORTER_SOURCE=' + json.dumps(stamp, ensure_ascii=True) + ';</script>\n'


def prepare(tool_root, importer=None, setup=None):
    tool_root = Path(tool_root)
    setup = Path(setup) if setup else Path.home() / '.fireworkslab/delivery-launcher.json'
    if not importer and setup.is_file():
        importer = json.loads(setup.read_text(encoding='utf-8')).get('importerPath')
    if not importer:
        return False
    stamp = source_stamp(importer)
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
    html = html.replace('</body>', stamp_script(stamp) + scripts + '</body>')     # 4.9.119 戳在注入脚本前：delivery-host.js 把它回报给烘焙器
    dest = tool_root / 'local_delivery/runtime/importer.html'
    dest.parent.mkdir(parents=True, exist_ok=True)
    temp = dest.with_suffix('.tmp')
    temp.write_text(html, encoding='utf-8')
    temp.replace(dest)
    side = dest.with_name(STAMP_FILE); tmp2 = side.with_suffix('.tmp')
    tmp2.write_text(json.dumps(stamp, ensure_ascii=False, indent=1), encoding='utf-8'); tmp2.replace(side)
    return True
