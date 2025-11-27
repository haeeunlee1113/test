#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Simple HTTP server that serves index.html as default."""

import os
import http.server
import socketserver
from pathlib import Path

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS 헤더 추가
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        # 쿼리 파라미터 제거
        path = self.path.split('?')[0]
        
        # 루트 경로면 index.html로 리다이렉트
        if path == '/' or path == '':
            self.path = '/index.html'
        # /upload 경로면 upload.html로 리다이렉트
        elif path == '/upload' or path == '/upload/':
            self.path = '/upload.html'
        # /drybulk 경로면 charts.html로 리다이렉트
        elif path == '/drybulk' or path == '/drybulk/':
            self.path = '/charts.html'
        # /drybulk-media 경로면 drybulk-media.html로 리다이렉트
        elif path == '/drybulk-media' or path == '/drybulk-media/':
            self.path = '/drybulk-media.html'
        # /drybulk-half 경로면 drybulk-half.html로 리다이렉트
        elif path == '/drybulk-half' or path == '/drybulk-half/':
            self.path = '/drybulk-half.html'
        # /drybulk-quarter 경로면 drybulk-quarter.html로 리다이렉트
        elif path == '/drybulk-quarter' or path == '/drybulk-quarter/':
            self.path = '/drybulk-quarter.html'
        # /container 경로면 container.html로 리다이렉트
        elif path == '/container' or path == '/container/':
            self.path = '/container.html'
        # /weekly 경로면 weekly.html로 리다이렉트
        elif path == '/weekly' or path == '/weekly/':
            self.path = '/weekly.html'
        # /quarterly 경로면 quarterly.html로 리다이렉트
        elif path == '/quarterly' or path == '/quarterly/':
            self.path = '/quarterly.html'
        # /container-media 경로면 container-media.html로 리다이렉트
        elif path == '/container-media' or path == '/container-media/':
            self.path = '/container-media.html'
        # /container-quarter 경로면 container-quarter.html로 리다이렉트
        elif path == '/container-quarter' or path == '/container-quarter/':
            self.path = '/container-quarter.html'
        # /breaking 경로면 breaking.html로 리다이렉트
        elif path == '/breaking' or path == '/breaking/':
            self.path = '/breaking.html'
        # /deep 경로면 deep.html로 리다이렉트
        elif path == '/deep' or path == '/deep/':
            self.path = '/deep.html'
        return super().do_GET()

if __name__ == "__main__":
    # 현재 디렉토리를 서버 루트로 설정
    os.chdir(Path(__file__).parent)
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"프론트엔드 서버가 시작되었습니다!")
        print(f"http://localhost:{PORT} 에서 접속하세요.")
        print("서버를 종료하려면 Ctrl+C를 누르세요.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버를 종료합니다.")
            httpd.shutdown()
