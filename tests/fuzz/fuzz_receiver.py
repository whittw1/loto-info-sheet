# Local-only receiver: the fuzz harness POSTs each export ZIP here so the
# loto-web differential check can import it. Binds 127.0.0.1 only.
import http.server, os, sys, urllib.parse
D = sys.argv[1]
os.makedirs(D, exist_ok=True)
class H(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
        self.send_header('Access-Control-Allow-Headers', '*')
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def do_GET(self):
        self.send_response(200); self._cors(); self.end_headers()
        self.wfile.write(('fuzz receiver: ' + str(len(os.listdir(D))) + ' files').encode())
    def do_POST(self):
        name = os.path.basename(urllib.parse.urlparse(self.path).path) or 'upload.bin'
        n = int(self.headers.get('Content-Length', 0))
        with open(os.path.join(D, name), 'wb') as f:
            f.write(self.rfile.read(n))
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(b'ok')
    def log_message(self, *a):
        pass
http.server.ThreadingHTTPServer(('127.0.0.1', 8748), H).serve_forever()
