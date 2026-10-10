import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch, MagicMock
from pathlib import Path
from service import Server
from store import Store
from test_store import pack


class ServiceTests(unittest.TestCase):
    def test_directory_transport_is_a_non_visual_same_origin_endpoint(self):
        with urllib.request.urlopen(self.base + '/directory-transport') as response:
            html = response.read().decode()
        self.assertIn('directory-transport.js', html)
        self.assertNotIn('FwImporter', html)
        with urllib.request.urlopen(self.base + '/directory-transport.js') as response:
            self.assertIn('directory-request', response.read().decode())

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.server = Server(('127.0.0.1', 0), Store(Path(self.tmp.name) / 'settings.json'), Path(self.tmp.name), read_origins=['http://127.0.0.1:8025'])
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.base = 'http://127.0.0.1:' + str(self.server.server_address[1])

    def request(self, path, data=None, origin=None, token=None, raw=False):
        headers = {'Origin': origin or self.base}
        if token:
            headers['X-Workspace-Token'] = token
        if data is not None and not raw:
            data = json.dumps(data).encode()
        req = urllib.request.Request(self.base + path, data=data, headers=headers)
        with urllib.request.urlopen(req) as r:
            return r.status, r.read()

    def test_session_publication_and_read_only_origin(self):
        _, data = self.request('/api/session')
        token = json.loads(data)['token']
        self.request('/api/output-root', {'outputRoot': str(Path(self.tmp.name) / 'output')}, token=token)
        status, data = self.request('/api/deliveries?name=Test', pack(), token=token, raw=True)
        self.assertEqual(status, 201)
        r = json.loads(data)
        self.assertEqual(self.request('/api/deliveries/' + r['deliveryId'] + '/T_Test.png')[1], b'original-png')
        self.assertEqual(self.request('/api/resources', origin='http://127.0.0.1:8025')[0], 200)
        for path, data, origin, key in [('/api/session', None, 'http://127.0.0.1:8025', None), ('/api/output-root', {}, 'https://evil.example', token), ('/api/output-root', {}, self.base, None)]:
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                self.request(path, data, origin, key)
            self.assertEqual(ctx.exception.code, 403)
        for path in ['/api/deliveries/unknown', '/../../settings.json']:
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                self.request(path)
            self.assertEqual(ctx.exception.code, 404)

    def test_metadata_body_and_cancel_keep_existing_directory(self):
        token = json.loads(self.request('/api/session')[1])['token']
        output = str(Path(self.tmp.name) / 'output')
        self.request('/api/output-root', {'outputRoot': output}, token=token)
        metadata = json.dumps({'recipe': {'name': '中文配方'}}).encode()
        raw = len(metadata).to_bytes(4, 'little') + metadata + pack()
        req = urllib.request.Request(self.base + '/api/deliveries?name=Test', data=raw, headers={'Origin':self.base,'X-Workspace-Token':token,'Content-Type':'application/vnd.fireworkslab.delivery'})
        with urllib.request.urlopen(req) as r:
            self.assertEqual(json.loads(r.read())['metadata']['recipe']['name'], '中文配方')
        with patch('tkinter.Tk', return_value=MagicMock()), patch('tkinter.filedialog.askdirectory', return_value=''):
            status, result = self.request('/api/output-root/pick', {}, token=token)
        self.assertEqual(status, 200)
        self.assertTrue(json.loads(result)['cancelled'])
        self.assertEqual(json.loads(result)['outputRoot'], str(Path(output).resolve()))

    def test_embedded_host_available_without_private_importer(self):
        html = self.request('/delivery-host')[1]
        script = self.request('/delivery-host.js')[1]
        self.assertIn(b'src="/delivery-host.js"', html)
        self.assertNotIn(b'<iframe', html)
        self.assertIn(b'workspace-host-request', script)
        self.assertFalse(json.loads(self.request('/api/session')[1])['importerAvailable'])
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self.request('/delivery-host', origin='https://evil.example')
        self.assertEqual(ctx.exception.code, 403)

    def test_native_host_adapts_only_broadcasts_without_editing_private_file(self):
        private = Path(self.tmp.name) / 'private.html'
        original = "<html><body><script>parent.postMessage({type:'workspace-view-state'},location.origin);parent.postMessage({type:'workspace-import-state'},location.origin);</script></body></html>"
        private.write_text(original, encoding='utf-8')
        self.server.importer = private
        hosted = self.request('/delivery-host')[1].decode()
        self.assertEqual(private.read_text(encoding='utf-8'), original)
        self.assertEqual(self.request('/importer')[1].decode(), original)
        self.assertIn("window.postMessage({type:'workspace-view-state'", hosted)
        self.assertIn("window.postMessage({type:'workspace-import-state'", hosted)
        self.assertIn('<script src="/delivery-host.js"></script>', hosted)
        private.write_text('<body>wrong entry</body>', encoding='utf-8')
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self.request('/delivery-host')
        self.assertEqual(ctx.exception.code, 409)


if __name__ == '__main__':
    unittest.main()
