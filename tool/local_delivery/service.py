"""Loopback-only baker publication and importer presentation service."""
import argparse
import json
import mimetypes
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit
from store import Store


class Server(ThreadingHTTPServer):
    def __init__(self, address, store, tool_root, importer=None, read_origins=()):
        if address[0] != '127.0.0.1':
            raise ValueError('服务只可监听 127.0.0.1')
        super().__init__(address, Handler)
        self.store, self.tool_root = store, Path(tool_root).resolve()
        self.importer = Path(importer).resolve() if importer else None
        self.token = secrets.token_urlsafe(32)
        self.read_origins = set(read_origins)
        self.picker_lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def origin(self):
        return 'http://' + self.headers.get('Host', '')

    def allowed(self, write=False):
        host = self.headers.get('Host', '')
        port = self.server.server_address[1]
        if host not in (f'127.0.0.1:{port}', f'localhost:{port}'):
            return False
        origin = self.headers.get('Origin')
        if origin and origin != self.origin() and (write or origin not in self.server.read_origins):
            return False
        if write and (not origin or self.headers.get('X-Workspace-Token') != self.server.token):
            return False
        return True

    def send(self, status, payload, content_type='application/json; charset=utf-8'):
        if isinstance(payload, (dict, list)):
            payload = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        if isinstance(payload, str):
            payload = payload.encode('utf-8')
        self.send_response(status)
        origin = self.headers.get('Origin')
        if origin in self.server.read_origins:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        if not self.allowed():
            return self.send(403, {'error': '仅支持本机授权工作区'})
        self.send(200, {})

    def do_GET(self):
        if not self.allowed():
            return self.send(403, {'error': '仅支持本机授权工作区'})
        path = unquote(urlsplit(self.path).path)
        try:
            if path == '/api/health':
                return self.send(200, {'format': 'df.local-delivery/1', 'importerAvailable': bool(self.server.importer and self.server.importer.is_file())})
            if path == '/api/session':
                if self.headers.get('Origin') and self.headers['Origin'] != self.origin():
                    return self.send(403, {'error': '会话仅供本工作区'})
                return self.send(200, {'token': self.server.token, **self.server.store.settings(), 'importerAvailable': bool(self.server.importer and self.server.importer.is_file())})
            if path == '/api/output-root':
                return self.send(200, self.server.store.settings())
            if path == '/api/resources':
                return self.send(200, self.server.store.resources())
            if path.startswith('/api/deliveries/'):
                parts = path.split('/', 4)
                r = self.server.store.receipt(parts[3])
                if len(parts) == 4:
                    return self.send(200, r)
                p = self.server.store.resource_file(parts[3], parts[4])
                return self.send(200, p.read_bytes(), mimetypes.guess_type(p.name)[0] or 'application/octet-stream')
            if path == '/importer':
                if not self.server.importer or not self.server.importer.is_file():
                    return self.send(503, {'error': '独立导入工作区未配置，请按 README 构建本机入口'})
                return self.send(200, self.server.importer.read_bytes(), 'text/html; charset=utf-8')
            if path in ('/', '/baker'):
                p = self.server.tool_root / 'FireworkBaker.html'
            else:
                p = (self.server.tool_root / path.lstrip('/')).resolve()
                if not p.is_relative_to(self.server.tool_root) or not (path.startswith('/data/') or path.startswith('/design-system/')):
                    raise FileNotFoundError('页面不存在')
            if not p.is_file():
                raise FileNotFoundError('页面不存在')
            return self.send(200, p.read_bytes(), mimetypes.guess_type(p.name)[0] or 'application/octet-stream')
        except FileNotFoundError as e:
            return self.send(404, {'error': str(e)})
        except Exception as e:
            return self.send(409, {'error': str(e)})

    def do_POST(self):
        if not self.allowed(write=True):
            return self.send(403, {'error': '写入仅支持当前本机工作区会话'})
        url = urlsplit(self.path)
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 0 or length > 2 * 1024 ** 3:
                return self.send(413, {'error': '资源包过大'})
            raw = self.rfile.read(length)
            if url.path == '/api/output-root':
                return self.send(200, self.server.store.set_root(json.loads(raw)['outputRoot']))
            if url.path == '/api/output-root/pick':
                if not self.server.picker_lock.acquire(blocking=False):
                    return self.send(409, {'error': '目录选择窗口已打开'})
                try:
                    import tkinter as tk
                    from tkinter import filedialog
                    window = tk.Tk()
                    window.withdraw()
                    window.attributes('-topmost', True)
                    try:
                        selected = filedialog.askdirectory(title='选择烟花资源导出目录', initialdir=str(self.server.store.root or Path.home()), parent=window)
                    finally:
                        window.destroy()
                    return self.send(200, self.server.store.set_root(selected) if selected else {**self.server.store.settings(), 'cancelled': True})
                finally:
                    self.server.picker_lock.release()
            if url.path == '/api/deliveries':
                q = parse_qs(url.query)
                metadata = {}
                if self.headers.get('Content-Type') == 'application/vnd.fireworkslab.delivery':
                    count = int.from_bytes(raw[:4], 'little')
                    if count > 16 * 1024 ** 2 or count + 4 > len(raw):
                        raise ValueError('交付请求元数据无效')
                    metadata = json.loads(raw[4:4 + count])
                    raw = raw[4 + count:]
                return self.send(201, self.server.store.publish(raw, q.get('name', [''])[0], metadata))
            if url.path.startswith('/api/import-receipts/'):
                return self.send(200, self.server.store.record_import(url.path.rsplit('/', 1)[-1], json.loads(raw)))
            return self.send(404, {'error': '接口不存在'})
        except Exception as e:
            return self.send(409, {'error': str(e)})


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--port', type=int, default=8034)
    p.add_argument('--config', default=str(Path.home() / '.fireworkslab' / 'delivery-settings.json'))
    p.add_argument('--importer', help='本机生成的独立交付工作区 HTML')
    p.add_argument('--read-origin', action='append', default=['http://127.0.0.1:8025', 'http://localhost:8025'])
    a = p.parse_args()
    service = Server(('127.0.0.1', a.port), Store(a.config), Path(__file__).resolve().parents[1], a.importer, a.read_origin)
    print(f'烟花工作区 http://127.0.0.1:{a.port}/baker', flush=True)
    service.serve_forever()
