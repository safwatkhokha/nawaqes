#!/usr/bin/env python3
"""
Simple HTTP file server to share the Nawaqes complete ZIP backup.
Run: python3 /home/z/my-project/scripts/serve_zip.py
Access: http://localhost:8765/nawaqes-complete-WITH-SECRETS-v2.3.0.zip
"""
import http.server
import socketserver
import os
from pathlib import Path

PORT = 8765
DIRECTORY = "/home/z/my-project/download"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Allow download from anywhere (including iframe embeds)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Disposition', 'attachment')
        super().end_headers()

def main():
    os.chdir(DIRECTORY)
    files = sorted(Path(DIRECTORY).iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
    print(f"📂 Serving directory: {DIRECTORY}")
    print(f"🌐 URL: http://localhost:{PORT}/")
    print()
    print("Available files:")
    for f in files:
        if f.is_file():
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"  - {f.name}  ({size_mb:.2f} MB)  →  http://localhost:{PORT}/{f.name}")
    print()
    print("Press Ctrl+C to stop the server.")
    print("=" * 60)

    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped.")

if __name__ == "__main__":
    main()
