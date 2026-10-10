import http.client
import tempfile
import threading
import unittest
from pathlib import Path
from service import Server


class HTTPEntryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.file = self.root / '原工具.html'
        self.file.write_bytes('<title>原工具</title>'.encode())
        (self.root / 'design-system').mkdir()
        (self.root / 'design-system/tokens.css').write_text('.fw-scope{}')
        self.server = Server(0, self.file, self.root)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, method='GET', host=None):
        c = http.client.HTTPConnection('127.0.0.1', self.port)
        c.request(method, path, headers={'Host': host or f'127.0.0.1:{self.port}'})
        r = c.getresponse()
        result = (r.status, r.read(), dict(r.getheaders()))
        c.close()
        return result

    def test_original_bytes_and_fixed_url_reads_overwrite(self):
        a = self.request('/workbench/?qa=read-only')
        self.assertEqual(a[1], self.file.read_bytes())
        self.assertEqual(a[2]['Cache-Control'], 'no-store')
        self.file.write_bytes(b'<title>new same file</title>')
        self.assertEqual(self.request('/workbench/')[1], self.file.read_bytes())

    def test_only_explicit_routes_never_serve_filesystem(self):
        for route in ('/../原工具.html', '/%2e%2e/原工具.html', '/C:/Windows/win.ini', '/service.py', '/workbench/../', '/workbench'):
            with self.subTest(route=route):
                # 保留原请求路径，仅将中文编码为ASCII百分号形式。
                from urllib.parse import quote
                self.assertEqual(self.request(quote(route, safe='/%:'))[0], 404)

    def test_foreign_host_and_post_are_rejected(self):
        self.assertEqual(self.request('/workbench/', host='other.example')[0], 403)
        self.assertEqual(self.request('/workbench/', 'POST')[0], 501)

    def test_missing_original_is_explicit_not_blank_or_fallback(self):
        self.file.unlink()
        self.assertEqual(self.request('/workbench/')[0], 503)
        self.assertIn(b'false', self.request('/health')[1])

    def test_head_and_hub_links(self):
        status, body, headers = self.request('/workbench/', 'HEAD')
        self.assertEqual((status, body), (200, b''))
        self.assertEqual(int(headers['Content-Length']), self.file.stat().st_size)
        hub = self.request('/')[1]
        for url in (b'http://127.0.0.1:8034/baker', b'http://127.0.0.1:8025/', b'/workbench/'):
            self.assertIn(url, hub)
        self.assertEqual(self.request('/tokens.css')[0], 200)


if __name__ == '__main__':
    unittest.main()
