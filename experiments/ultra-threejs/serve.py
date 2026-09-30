"""Local-only preview server; no installation step. Run: python serve.py."""
import argparse
import http.server
from pathlib import Path
import webbrowser

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=18767)
parser.add_argument('--no-open', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
url = f'http://127.0.0.1:{args.port}/experiments/ultra-threejs/'

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(root), **kw)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
print(url, flush=True)
if not args.no_open:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    server.server_close()
