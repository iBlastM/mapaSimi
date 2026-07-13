#!/usr/bin/env python3
"""Servidor de desarrollo local para MapaSimi (sin dependencias).

    python serve.py            # http://localhost:8000
    python serve.py 5500       # puerto alternativo
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".geojson": "application/json",
        ".json": "application/json",
        ".js": "text/javascript",
        ".mjs": "text/javascript",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"MapaSimi en http://localhost:{PORT}  (Ctrl+C para detener)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nDetenido.")
