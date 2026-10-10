"""为原单文件特效工作台提供只读本机HTTP入口。"""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

FORMAT = 'df.local-tools/1'
DEFAULT_SETUP = Path.home() / '.fireworkslab' / 'local-http-tools.json'
DEFAULT_WORKBENCH = 'D:/FXTools/DFWorkbench/df-fx-workbench_v2_locmai.html'
DEFAULT_DEV = Path(__file__).resolve().parents[1] / 'workbench'


def options(setup=DEFAULT_SETUP):
    p = Path(setup)
    saved = json.loads(p.read_text(encoding='utf-8-sig')) if p.is_file() else {}
    if not isinstance(saved, dict):
        raise ValueError('本机HTTP配置必须是对象')
    return {
        'workbenchPath': Path(saved.get('workbenchPath', DEFAULT_WORKBENCH)).resolve(),
        'devPath': Path(saved.get('devPath', DEFAULT_DEV)).resolve(),
        'nodePath': saved.get('nodePath'),
    }


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, port, workbench, tool_root):
        self.workbench = Path(workbench).resolve()
        self.tool_root = Path(tool_root).resolve()
        super().__init__(('127.0.0.1', port), Handler)


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, body, content_type='text/plain; charset=utf-8', head=False):
        if isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        if not head:
            self.wfile.write(body)

    def do_HEAD(self):
        self.do_GET(head=True)

    def do_GET(self, head=False):
        port = self.server.server_address[1]
        if self.headers.get('Host') not in (f'127.0.0.1:{port}', f'localhost:{port}'):
            return self.respond(403, '只允许本机访问', head=head)
        path = urlsplit(self.path).path
        if path == '/health':
            return self.respond(200, json.dumps({'format': FORMAT, 'workbenchAvailable': self.server.workbench.is_file()}),
                                'application/json; charset=utf-8', head)
        files = {
            '/': (Path(__file__).with_name('index.html'), 'text/html; charset=utf-8'),
            '/workbench/': (self.server.workbench, 'text/html; charset=utf-8'),
            '/tokens.css': (self.server.tool_root / 'design-system/tokens.css', 'text/css; charset=utf-8'),
        }
        if path not in files:
            return self.respond(404, '页面不存在', head=head)
        file, content_type = files[path]
        try:
            body = file.read_bytes()
        except FileNotFoundError:
            return self.respond(503, '本机工具文件未找到。请核对 ~/.fireworkslab/local-http-tools.json；原文件未修改。', head=head)
        return self.respond(200, body, content_type, head)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--setup', default=str(DEFAULT_SETUP))
    args = parser.parse_args(argv)
    cfg = options(args.setup)
    server = Server(8036, cfg['workbenchPath'], Path(__file__).resolve().parents[1])
    print('三个工具入口：http://127.0.0.1:8036/', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
