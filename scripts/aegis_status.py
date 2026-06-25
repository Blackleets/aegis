#!/usr/bin/env python
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def run(cmd: list[str]) -> tuple[int, str, str]:
    proc = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True)
    return proc.returncode, proc.stdout.strip(), proc.stderr.strip()


def detect_port() -> int:
    candidates = [REPO / '.env.local', REPO / '.env', REPO / '.env.template', REPO / '.env.example']
    for path in candidates:
        if not path.exists():
            continue
        try:
            for raw in path.read_text(encoding='utf-8').splitlines():
                line = raw.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                if key.strip() == 'AEGIS_PORT':
                    try:
                        return int(value.strip().strip('"').strip("'"))
                    except ValueError:
                        pass
        except OSError:
            pass
    return 3000


def tcp_open(host: str, port: int, timeout: float = 1.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def healthcheck(port: int) -> dict:
    url = f'http://127.0.0.1:{port}/api/health'
    try:
        with urllib.request.urlopen(url, timeout=4) as resp:
            body = resp.read().decode('utf-8', errors='replace')
            payload = json.loads(body)
            return {
                'ok': True,
                'http_status': resp.status,
                'url': url,
                'payload': payload,
            }
    except urllib.error.HTTPError as e:
        return {'ok': False, 'url': url, 'http_status': e.code, 'error': str(e)}
    except Exception as e:
        return {'ok': False, 'url': url, 'error': str(e)}


def main() -> int:
    port = detect_port()
    branch_rc, branch_out, branch_err = run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
    commit_rc, commit_out, commit_err = run(['git', 'rev-parse', '--short', 'HEAD'])
    status_rc, status_out, status_err = run(['git', 'status', '--short'])

    health = healthcheck(port)
    listening = tcp_open('127.0.0.1', port)

    result = {
        'repo': str(REPO),
        'branch': branch_out if branch_rc == 0 else None,
        'commit': commit_out if commit_rc == 0 else None,
        'git_clean': status_rc == 0 and status_out == '',
        'git_status': status_out.splitlines()[:20] if status_out else [],
        'port': port,
        'port_open': listening,
        'health': health,
    }

    if branch_rc != 0:
        result['branch_error'] = branch_err
    if commit_rc != 0:
        result['commit_error'] = commit_err
    if status_rc != 0:
        result['git_status_error'] = status_err

    health_state = 'UP' if health.get('ok') else ('LISTENING_NO_HEALTH' if listening else 'DOWN')
    print(f"AEGIS status: {health_state}")
    print(f"Repo: {result['repo']}")
    print(f"Git: {result['branch'] or 'unknown'} @ {result['commit'] or 'unknown'}")
    print(f"Working tree clean: {'yes' if result['git_clean'] else 'no'}")
    if result['git_status']:
        print('Pending changes:')
        for line in result['git_status']:
            print(f"  {line}")
    print(f"Port {port}: {'open' if listening else 'closed'}")
    if health.get('ok'):
        payload = health.get('payload', {})
        print(f"Health endpoint: OK ({health.get('http_status')})")
        print(f"Platform: {payload.get('platform')} | status={payload.get('status')} | uptime={payload.get('uptime')}s")
    else:
        print(f"Health endpoint: FAIL -> {health.get('error') or health.get('http_status')}")

    print('\nJSON:')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
