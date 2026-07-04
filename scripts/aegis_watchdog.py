#!/usr/bin/env python
from __future__ import annotations

import json
import socket
import subprocess
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def run(cmd: list[str]) -> tuple[int, str]:
    proc = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True)
    return proc.returncode, proc.stdout.strip()


def detect_port() -> int:
    for name in ('.env.local', '.env', '.env.template', '.env.example'):
        path = REPO / name
        if not path.exists():
            continue
        try:
            for raw in path.read_text(encoding='utf-8').splitlines():
                line = raw.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                if key.strip() == 'AEGIS_PORT':
                    return int(value.strip().strip('"').strip("'"))
        except Exception:
            pass
    return 3000


def port_open(port: int) -> bool:
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=1.5):
            return True
    except OSError:
        return False


def health_ok(port: int) -> tuple[bool, str]:
    url = f'http://127.0.0.1:{port}/api/health'
    try:
        with urllib.request.urlopen(url, timeout=4) as resp:
            payload = json.loads(resp.read().decode('utf-8', errors='replace'))
            status = payload.get('status')
            if resp.status == 200 and status in {'ok', 'degraded'}:
                return True, f"health {status} | uptime={payload.get('uptime')}s"
            return False, f"health unexpected | http={resp.status} payload={payload}"
    except urllib.error.HTTPError as e:
        return False, f"health HTTP {e.code}"
    except Exception as e:
        return False, str(e)


def main() -> int:
    port = detect_port()
    open_ok = port_open(port)
    health, detail = health_ok(port)
    _, branch = run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
    _, commit = run(['git', 'rev-parse', '--short', 'HEAD'])

    if open_ok and health:
        return 0

    print('AEGIS ALERT')
    print(f'Repo: {REPO}')
    print(f'Git: {branch or "unknown"} @ {commit or "unknown"}')
    print(f'Port {port}: {"open" if open_ok else "closed"}')
    print(f'Health: {detail}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
