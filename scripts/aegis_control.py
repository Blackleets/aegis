#!/usr/bin/env python
from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
RUNTIME_DIR = REPO / '.runtime'
PID_FILE = RUNTIME_DIR / 'aegis.pid'
LOG_FILE = RUNTIME_DIR / 'aegis.log'
DEFAULT_START_TIMEOUT = 45
DEFAULT_STOP_TIMEOUT = 20


def ensure_runtime_dir() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)


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


def read_pid() -> int | None:
    if not PID_FILE.exists():
        return None
    try:
        value = PID_FILE.read_text(encoding='utf-8').strip()
        return int(value) if value else None
    except Exception:
        return None


def write_pid(pid: int) -> None:
    ensure_runtime_dir()
    PID_FILE.write_text(str(pid), encoding='utf-8')


def clear_pid() -> None:
    try:
        PID_FILE.unlink()
    except FileNotFoundError:
        pass


def process_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def netstat_listening_pids(port: int) -> list[int]:
    try:
        proc = subprocess.run(['netstat', '-ano'], capture_output=True, timeout=10)
        output = proc.stdout.decode(errors='replace')
    except Exception:
        return []

    pids: list[int] = []
    needle = f':{port}'
    for raw in output.splitlines():
        line = raw.strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 5:
            continue
        proto = parts[0].upper()
        local_addr = parts[1]
        if proto not in {'TCP', 'TCPV6'}:
            continue
        if not local_addr.endswith(needle):
            continue
        state = parts[3].upper() if len(parts) >= 5 else ''
        pid_token = parts[-1]
        if state != 'LISTENING':
            continue
        try:
            pids.append(int(pid_token))
        except ValueError:
            continue
    return sorted(set(pids))


def tail_log(lines: int = 60) -> str:
    if not LOG_FILE.exists():
        return ''
    try:
        content = LOG_FILE.read_text(encoding='utf-8', errors='replace').splitlines()
        return '\n'.join(content[-lines:])
    except Exception as e:
        return f'<failed to read log: {e}>'


def resolve_npm() -> str:
    npm = shutil.which('npm') or shutil.which('npm.cmd') or shutil.which('npm.CMD')
    if not npm:
        raise RuntimeError('npm no está disponible en PATH')
    return npm


def build_running_snapshot(port: int) -> dict:
    managed_pid = read_pid()
    managed_alive = bool(managed_pid and process_alive(managed_pid))
    listeners = netstat_listening_pids(port)
    health = healthcheck(port)
    branch_rc, branch_out, _ = run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
    commit_rc, commit_out, _ = run(['git', 'rev-parse', '--short', 'HEAD'])
    status_rc, status_out, _ = run(['git', 'status', '--short'])
    return {
        'repo': str(REPO),
        'branch': branch_out if branch_rc == 0 else None,
        'commit': commit_out if commit_rc == 0 else None,
        'git_clean': status_rc == 0 and status_out == '',
        'git_status': status_out.splitlines()[:20] if status_out else [],
        'port': port,
        'port_open': tcp_open('127.0.0.1', port),
        'managed_pid': managed_pid,
        'managed_pid_alive': managed_alive,
        'listening_pids': listeners,
        'log_file': str(LOG_FILE),
        'health': health,
    }


def print_snapshot(snapshot: dict) -> None:
    state = 'UP' if snapshot['health'].get('ok') else ('LISTENING_NO_HEALTH' if snapshot['port_open'] else 'DOWN')
    print(f'AEGIS control status: {state}')
    print(f"Repo: {snapshot['repo']}")
    print(f"Git: {snapshot.get('branch') or 'unknown'} @ {snapshot.get('commit') or 'unknown'}")
    print(f"Working tree clean: {'yes' if snapshot.get('git_clean') else 'no'}")
    print(f"Port {snapshot['port']}: {'open' if snapshot['port_open'] else 'closed'}")
    print(f"Managed PID: {snapshot['managed_pid'] or 'none'} ({'alive' if snapshot['managed_pid_alive'] else 'dead/missing'})")
    print(f"Listeners on port: {snapshot['listening_pids'] or 'none'}")
    print(f"Log file: {snapshot['log_file']}")
    if snapshot['health'].get('ok'):
        payload = snapshot['health'].get('payload', {})
        print(f"Health: OK ({snapshot['health'].get('http_status')}) | uptime={payload.get('uptime')}s")
    else:
        print(f"Health: FAIL -> {snapshot['health'].get('error') or snapshot['health'].get('http_status')}")
    print('\nJSON:')
    print(json.dumps(snapshot, ensure_ascii=False, indent=2))


def wait_for_health(port: int, timeout: int) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if healthcheck(port).get('ok'):
            return True
        time.sleep(1)
    return False


def wait_for_port_close(port: int, timeout: int) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if not tcp_open('127.0.0.1', port):
            return True
        time.sleep(1)
    return False


def kill_pid(pid: int) -> None:
    if os.name == 'nt':
        subprocess.run(['taskkill', '/PID', str(pid), '/T', '/F'], capture_output=True)
    else:
        os.kill(pid, signal.SIGTERM)


def cmd_status(_args: argparse.Namespace) -> int:
    snapshot = build_running_snapshot(detect_port())
    print_snapshot(snapshot)
    return 0


def cmd_logs(args: argparse.Namespace) -> int:
    ensure_runtime_dir()
    output = tail_log(args.lines)
    if output:
        print(output)
    else:
        print('<log vacío>')
    return 0


def cmd_start(args: argparse.Namespace) -> int:
    ensure_runtime_dir()
    port = detect_port()
    if healthcheck(port).get('ok'):
        print(f'AEGIS ya está operativo en http://127.0.0.1:{port}')
        snapshot = build_running_snapshot(port)
        if not snapshot['managed_pid'] and snapshot['listening_pids']:
            write_pid(snapshot['listening_pids'][0])
        return 0

    npm = resolve_npm()
    with LOG_FILE.open('a', encoding='utf-8') as log:
        log.write(f'\n===== START {time.strftime("%Y-%m-%d %H:%M:%S")} =====\n')
        log.flush()
        kwargs = {
            'cwd': str(REPO),
            'stdout': log,
            'stderr': log,
            'stdin': subprocess.DEVNULL,
            'close_fds': True,
        }
        if os.name == 'nt':
            creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW
            proc = subprocess.Popen([npm, 'run', 'start'], creationflags=creationflags, **kwargs)
        else:
            proc = subprocess.Popen([npm, 'run', 'start'], start_new_session=True, **kwargs)

    write_pid(proc.pid)
    print(f'AEGIS start lanzado con PID {proc.pid}; esperando healthcheck...')
    ok = wait_for_health(port, args.timeout)
    snapshot = build_running_snapshot(port)
    print_snapshot(snapshot)
    if ok:
        return 0

    print('\nÚltimas líneas del log:')
    print(tail_log(80))
    return 1


def cmd_stop(args: argparse.Namespace) -> int:
    port = detect_port()
    candidates: list[int] = []
    managed_pid = read_pid()
    if managed_pid:
        candidates.append(managed_pid)
    for pid in netstat_listening_pids(port):
        if pid not in candidates:
            candidates.append(pid)

    if not candidates:
        clear_pid()
        print('AEGIS ya estaba detenido.')
        return 0

    print(f'Deteniendo PIDs: {candidates}')
    for pid in candidates:
        try:
            kill_pid(pid)
        except Exception as e:
            print(f'No pude detener PID {pid}: {e}')

    closed = wait_for_port_close(port, args.timeout)
    clear_pid()
    snapshot = build_running_snapshot(port)
    print_snapshot(snapshot)
    return 0 if closed else 1


def cmd_restart(args: argparse.Namespace) -> int:
    stop_rc = cmd_stop(argparse.Namespace(timeout=args.stop_timeout))
    start_rc = cmd_start(argparse.Namespace(timeout=args.start_timeout))
    return 0 if stop_rc == 0 and start_rc == 0 else 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Control local de runtime para AEGIS')
    sub = parser.add_subparsers(dest='command', required=True)

    status_p = sub.add_parser('status', help='Mostrar estado')
    status_p.set_defaults(func=cmd_status)

    logs_p = sub.add_parser('logs', help='Mostrar log runtime')
    logs_p.add_argument('--lines', type=int, default=60)
    logs_p.set_defaults(func=cmd_logs)

    start_p = sub.add_parser('start', help='Arrancar AEGIS')
    start_p.add_argument('--timeout', type=int, default=DEFAULT_START_TIMEOUT)
    start_p.set_defaults(func=cmd_start)

    stop_p = sub.add_parser('stop', help='Parar AEGIS')
    stop_p.add_argument('--timeout', type=int, default=DEFAULT_STOP_TIMEOUT)
    stop_p.set_defaults(func=cmd_stop)

    restart_p = sub.add_parser('restart', help='Reiniciar AEGIS')
    restart_p.add_argument('--stop-timeout', type=int, default=DEFAULT_STOP_TIMEOUT)
    restart_p.add_argument('--start-timeout', type=int, default=DEFAULT_START_TIMEOUT)
    restart_p.set_defaults(func=cmd_restart)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == '__main__':
    raise SystemExit(main())
