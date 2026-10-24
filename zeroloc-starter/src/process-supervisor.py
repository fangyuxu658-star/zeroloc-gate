"""Linux ownership supervisor. No shell, no network, no process-name matching."""
import ctypes
import json
import os
import select
import signal
import subprocess
import sys
import time

token, executable, encoded = sys.argv[1:]

def message(kind, **fields):
    try:
        os.write(3, (json.dumps(dict(type=kind, token=token, **fields)) + '\n').encode())
    except BrokenPipeError:
        # The engine can die first. Losing its observation pipe must never
        # terminate the retained owner before it cleans and reaps descendants.
        pass

stopping = False

def request_stop(_signal, _frame):
    global stopping
    stopping = True

signal.signal(signal.SIGTERM, request_stop)
signal.signal(signal.SIGINT, request_stop)

try:
    if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:
        raise RuntimeError('subreaper unavailable')
    # pidfds bind signals to a kernel process identity, including across PID reuse.
    fd = os.pidfd_open(os.getpid())
    os.close(fd)
    if not hasattr(signal, 'pidfd_send_signal'):
        raise RuntimeError('pidfd signalling unavailable')
    worker = subprocess.Popen([executable, *json.loads(encoded)], stdin=subprocess.DEVNULL, close_fds=True)
    message('ready', worker=worker.pid)
    exited = False
    while not stopping:
        if worker.poll() is not None and not exited:
            message('worker-exit', code=worker.returncode)
            exited = True
        readable, _, _ = select.select([0], [], [], 0.05)
        if readable:
            data = os.read(0, 4096)
            if not data or token.encode() in data:
                break

    def descendants():
        parents = {}
        for name in os.listdir('/proc'):
            if not name.isdigit():
                continue
            try:
                with open('/proc/' + name + '/stat') as handle:
                    fields = handle.read().rsplit(')', 1)[1].split()
                parents[int(name)] = int(fields[1])
            except (FileNotFoundError, ProcessLookupError):
                pass
        owned = {os.getpid()}
        while True:
            more = {pid for pid, parent in parents.items() if parent in owned}
            if more <= owned:
                return owned - {os.getpid()}
            owned |= more

    deadline = time.monotonic() + 5
    while True:
        for pid in descendants():
            try:
                # Revalidate ancestry after opening the identity handle.
                fd = os.pidfd_open(pid)
                try:
                    if pid in descendants():
                        signal.pidfd_send_signal(fd, signal.SIGKILL)
                finally:
                    os.close(fd)
            except ProcessLookupError:
                pass
        while True:
            try:
                if os.waitpid(-1, os.WNOHANG)[0] == 0:
                    break
            except ChildProcessError:
                break
        remaining = descendants()
        if not remaining:
            message('cleaned')
            break
        if time.monotonic() > deadline:
            message('cleanup-failed', remaining=sorted(remaining))
            # Retain the owning subreaper; parent must report the failure.
            deadline = time.monotonic() + 5
        time.sleep(0.02)
except Exception as error:
    message('failed', error=type(error).__name__)
    sys.exit(1)
