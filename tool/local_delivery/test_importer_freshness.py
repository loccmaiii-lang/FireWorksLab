"""4.9.119（导出（23），用户 10-19 19:45「gpt一直修不好……好像修错地方了」）：
文件入口加载的导入器是 tool/local_delivery/runtime/importer.html 这份本机副本。导入器（5）把修复部署到源文件后，
副本没人重新生成，用户照样跑旧版（Error 87 复现）。这里查：副本带来源戳、能判断新旧、服务发现旧副本会自己重新生成。"""
import json
import tempfile
import threading
import time
import unittest
import urllib.request
from pathlib import Path

from prepare_local import prepare, runtime_state, ensure_runtime
from service import Server
from store import Store


def native(text):
    return ("<body><main>" + text + "</main><script>" + ''.join(
        "parent.postMessage({type:'" + kind + "',receipts:{}},location.origin);\n"
        for kind in ('workspace-view-state', 'workspace-import-state')) + '</script></body>')


def make_tool(root):
    tool = root / 'tool'
    local = tool / 'local_delivery'
    local.mkdir(parents=True)
    for name in ('directory-client.js', 'delivery-host.js'):
        (local / name).write_text('// ' + name)
    return tool


class FreshnessTests(unittest.TestCase):
    def test_runtime_copy_carries_source_stamp(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); tool = make_tool(root); src = root / 'private.html'
            src.write_text(native('v2.28'), encoding='utf-8')
            self.assertTrue(prepare(tool, src))
            html = (tool / 'local_delivery/runtime/importer.html').read_text(encoding='utf-8')
            st = runtime_state(tool, src)
            self.assertTrue(st['fresh'])
            self.assertIn('window.__DF_IMPORTER_SOURCE=', html)
            self.assertIn(st['source']['sha256'], html)
            # 戳在注入脚本之前（delivery-host.js 读它回报给烘焙器）
            self.assertLess(html.index('__DF_IMPORTER_SOURCE'), html.index('// delivery-host.js'))

    def test_source_update_makes_copy_stale_and_ensure_regenerates(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); tool = make_tool(root); src = root / 'private.html'
            src.write_text(native('v2.28'), encoding='utf-8')
            prepare(tool, src)
            src.write_text(native('v2.29 proofs-stdin'), encoding='utf-8')     # 导入器（5）部署了新版，副本没动
            st = runtime_state(tool, src)
            self.assertFalse(st['fresh'])
            out = ensure_runtime(tool, src)
            self.assertTrue(out['refreshed'])
            self.assertTrue(runtime_state(tool, src)['fresh'])
            self.assertIn('v2.29 proofs-stdin', (tool / 'local_delivery/runtime/importer.html').read_text(encoding='utf-8'))
            self.assertFalse(ensure_runtime(tool, src)['refreshed'])     # 已是新的：不重写

    def test_copy_made_before_stamps_existed_counts_as_stale(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); tool = make_tool(root); src = root / 'private.html'
            src.write_text(native('v2.29'), encoding='utf-8')
            (tool / 'local_delivery/runtime').mkdir()
            (tool / 'local_delivery/runtime/importer.html').write_text(native('v2.28'), encoding='utf-8')     # 4.9.119 以前生成的副本没有戳
            self.assertFalse(runtime_state(tool, src)['fresh'])
            self.assertTrue(ensure_runtime(tool, src)['refreshed'])


class ServiceFreshnessTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name); self.tool = make_tool(root); self.src = root / 'private.html'
        self.src.write_text(native('v2.28'), encoding='utf-8')
        prepare(self.tool, self.src)
        self.src.write_text(native('v2.29'), encoding='utf-8')
        self.server = Server(('127.0.0.1', 0), Store(root / 'settings.json'), self.tool, self.src)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.server_close); self.addCleanup(self.server.shutdown)
        self.base = 'http://127.0.0.1:' + str(self.server.server_address[1])

    def session(self):
        req = urllib.request.Request(self.base + '/api/session', headers={'Origin': self.base})
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())

    def test_session_regenerates_stale_copy_and_reports_source(self):
        s = self.session()
        self.assertTrue(s['importerRuntimeRefreshed'])
        self.assertEqual(s['importerSource']['sha256'], runtime_state(self.tool, self.src)['source']['sha256'])
        self.assertIn('v2.29', (self.tool / 'local_delivery/runtime/importer.html').read_text(encoding='utf-8'))
        self.assertFalse(self.session()['importerRuntimeRefreshed'])

    def test_session_reports_service_code_change(self):
        self.assertFalse(self.session()['serviceCodeStale'])
        self.server.code_sig = 'started-with-older-code'     # 等价于：git pull 更新了服务代码，旧进程还在跑
        self.assertTrue(self.session()['serviceCodeStale'])

    def test_http_host_page_carries_the_same_stamp(self):
        req = urllib.request.Request(self.base + '/delivery-host', headers={'Origin': self.base})
        with urllib.request.urlopen(req) as r:
            html = r.read().decode('utf-8')
        self.assertIn(runtime_state(self.tool, self.src)['source']['sha256'], html)


if __name__ == '__main__':
    unittest.main()
