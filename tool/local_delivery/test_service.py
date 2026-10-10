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


if __name__ == '__main__':
    unittest.main()
