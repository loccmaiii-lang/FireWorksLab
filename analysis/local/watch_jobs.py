"""One ordinary, token-free GPU queue check; scheduled every 30 minutes."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import subprocess
import sys

from job_lock import ProcessLock, gpu_lock_path

JOB_ID = re.compile(r'[A-Za-z0-9][A-Za-z0-9_-]*\Z')
GENERATED = {'tool/data/review.js', 'tool/data/video_meta.json'}


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def save_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(temporary, path)


def load_json(path, default):
    path = Path(path)
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def execution_hash(repo):
    digest = hashlib.sha256()
    paths = sorted((repo / 'analysis/scripts').glob('*.py'))
    paths += [repo / 'analysis/local/run_jobs.py', repo / 'tool/FireworkBaker.html']
    for path in paths:
        if path.is_file():
            digest.update(str(path.relative_to(repo)).encode())
            digest.update(path.read_bytes())
    return digest.digest()


def fingerprint(job, repo, code_hash):
    digest = hashlib.sha256(code_hash)
    digest.update(json.dumps(job, sort_keys=True, ensure_ascii=False).encode())
    def inputs(value):
        if isinstance(value, dict):
            for child in value.values(): inputs(child)
        elif isinstance(value, list):
            for child in value: inputs(child)
        elif isinstance(value, str) and value.lower().endswith(('.json', '.mp4', '.png')):
            path = (repo / value).resolve()
            if path.is_relative_to(repo) and path.is_file():
                digest.update(value.encode())
                if path.suffix.lower() == '.json':
                    digest.update(path.read_bytes())
                else:
                    # Video and image contents are immutable Git inputs; stat avoids reading huge files.
                    digest.update(str(path.stat().st_size).encode())
                    digest.update(str(path.stat().st_mtime_ns).encode())
    inputs(job)
    return digest.hexdigest()


def select_jobs(repo, attempts):
    selected, completed, paused = [], [], []
    code_hash = execution_hash(repo)
    for path in sorted((repo / 'analysis/jobs').glob('*.json')):
        job = load_json(path, {})
        jid = job.get('id', '')
        if not isinstance(jid, str) or not JOB_ID.fullmatch(jid) or jid != path.stem:
            raise ValueError('Invalid task ID in ' + str(path))
        if (repo / 'analysis/results' / jid / 'done.json').exists():
            completed.append(jid)
            continue
        if job.get('enabled') is False or job.get('ready') is False or job.get('status') in ('draft', 'withdrawn', 'cancelled'):
            paused.append(jid)
            continue
        mark = fingerprint(job, repo, code_hash)
        if attempts.get(jid, {}).get('fingerprint') == mark:
            paused.append(jid)
            continue
        selected.append((job, mark))
    selected.sort(key=lambda item: -item[0].get('priority', 0))
    return selected, completed, paused


class Monitor:
    def __init__(self, repo, state_dir, workers=3, deps=None):
        self.repo = Path(repo).resolve()
        self.state_dir = Path(state_dir).resolve()
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.workers = workers
        self.state_path = self.state_dir / 'state.json'
        self.state = load_json(self.state_path, {'attempts': {}, 'pending_publish': []})
        self.env = dict(os.environ, FW_LINE='后台监控', FW_RENDER='gpu', FW_REQUIRE_GPU='1',
                        PYTHONIOENCODING='utf-8', GIT_TERMINAL_PROMPT='0', GCM_INTERACTIVE='never', GIT_EDITOR='true')
        if deps:
            self.env['PYTHONPATH'] = str(Path(deps).resolve())

    def status(self, phase, **fields):
        self.state.update(phase=phase, updated_at=now(), pid=os.getpid(), repo=str(self.repo), **fields)
        save_json(self.state_path, self.state)
        save_json(self.state_dir / 'status.json', self.state)
        logging.info('%s %s', phase, json.dumps(fields, ensure_ascii=False))

    def git(self, *args, check=True):
        result = subprocess.run(['git', *args], cwd=self.repo, env=self.env,
                                capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180,
                                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        if check and result.returncode:
            raise RuntimeError('git ' + ' '.join(args) + ': ' + result.stderr.strip())
        return result

    def script(self, relative, *args, log_name='batch.log'):
        # pythonw.exe has no console; use python.exe for child computation and capture its log.
        python = Path(sys.executable)
        if python.name.lower() == 'pythonw.exe': python = python.with_name('python.exe')
        with (self.state_dir / log_name).open('a', encoding='utf-8') as log:
            return subprocess.run([str(python), '-u', str(self.repo / relative), *args],
                                  cwd=self.repo, env=self.env, stdout=log, stderr=subprocess.STDOUT,
                                  creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)).returncode

    def review(self):
        if self.script('analysis/scripts/review_to_baker.py', log_name='review.log'):
            raise RuntimeError('Review generation failed; see review.log')

    def rebase(self):
        result = self.git('rebase', 'origin/main', check=False)
        while result.returncode:
            conflicts = set(self.git('diff', '--name-only', '--diff-filter=U').stdout.splitlines())
            if not conflicts or not conflicts.issubset(GENERATED):
                self.git('rebase', '--abort', check=False)
                raise RuntimeError('Remote synchronization needs review; local result commits retained: ' + result.stderr.strip())
            # Use current remote data, then regenerate from both sides' result directories.
            self.git('restore', '--source=origin/main', '--worktree', '--', *sorted(conflicts))
            self.review()
            self.git('add', '--', *sorted(GENERATED))
            result = self.git('rebase', '--continue', check=False)

    def commit(self, message, paths):
        existing = [path for path in paths if (self.repo / path).exists()]
        if not existing: return
        self.git('add', '--', *existing)
        staged = self.git('diff', '--cached', '--name-only').stdout.splitlines()
        if any(not any(name == path or name.startswith(path + '/') for path in existing) for name in staged):
            raise RuntimeError('Unexpected staged files; not committing unrelated work')
        if self.git('diff', '--cached', '--quiet', check=False).returncode:
            self.git('commit', '-m', message)

    def check_clean(self):
        # Ignore nontracked dependency/output directories; never stash or overwrite tracked edits.
        if self.git('status', '--porcelain', '--untracked-files=no').stdout.strip():
            raise RuntimeError('Worker checkout has unexpected tracked edits; not synchronizing')

    def publish(self):
        ids = self.state.get('pending_publish', [])
        if any(not JOB_ID.fullmatch(jid) for jid in ids): raise ValueError('Invalid saved publication IDs')
        if not ids: return
        self.status('uploading', batch=ids)
        self.commit('gpu: results for ' + ', '.join(ids),
                    ['analysis/results/' + jid for jid in ids] + sorted(GENERATED))
        self.check_clean()
        # A remote push can arrive between fetch and push. Retry against its latest result inventory.
        for _ in range(3):
            self.git('fetch', 'origin')
            self.rebase()
            self.review()
            self.commit('gpu: refresh review for ' + ', '.join(ids), sorted(GENERATED))
            if self.git('push', 'origin', 'HEAD:main', check=False).returncode == 0:
                self.state['pending_publish'] = []
                self.status('uploaded', last_uploaded=now(), uploaded=ids)
                return
        raise RuntimeError('Upload failed; results retained and will be uploaded next check')

    def cycle(self, dry_run=False):
        with ProcessLock(self.state_dir / 'monitor.lock'):
            self.status('checking', last_checked=now(), dry_run=dry_run)
            available = ProcessLock(gpu_lock_path(self.repo))
            if not available.acquire():
                self.status('gpu_busy', finished_at=now())
                return 0
            available.close()
            if self.state.get('pending_publish'):
                if dry_run:
                    self.status('dry_run', pending_publish=self.state['pending_publish'])
                    return 0
                self.publish()
            self.check_clean()
            self.git('fetch', 'origin')
            self.rebase()
            selected, completed, paused = select_jobs(self.repo, self.state['attempts'])
            self.status('ready', checked_commit=self.git('rev-parse', 'HEAD').stdout.strip(),
                        pending=[job['id'] for job, _ in selected], completed_count=len(completed), paused=paused)
            if not selected or dry_run:
                self.status('dry_run' if dry_run else 'idle', pending_count=len(selected), finished_at=now())
                return 0
            ids = [job['id'] for job, _ in selected]
            batch_log = datetime.now().strftime('batch-%Y%m%d-%H%M%S.log')
            # Save before launch: a reboot or process crash leaves a recoverable upload list.
            self.state['pending_publish'] = ids
            self.status('running', batch=ids, batch_log=batch_log)
            result = self.script('analysis/local/run_jobs.py', '--no-review', '--workers=' + str(self.workers),
                                 *ids, log_name=batch_log)
            if result == 75:
                self.state['pending_publish'] = []
                self.status('gpu_busy', finished_at=now())
                return 0
            failed = []
            for job, mark in selected:
                jid = job['id']
                if not (self.repo / 'analysis/results' / jid / 'done.json').exists():
                    failed.append(jid)
                    self.state['attempts'][jid] = {'fingerprint': mark, 'failed_at': now(), 'exit_code': result}
                else:
                    self.state['attempts'].pop(jid, None)
            self.status('computed', failed=failed)
            self.publish()
            self.status('idle', pending_count=0, failed=failed, finished_at=now())
            return int(bool(failed))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--state-dir', required=True)
    parser.add_argument('--deps')
    parser.add_argument('--workers', type=int, choices=(1, 2, 3), default=3)
    parser.add_argument('--once', action='store_true', help='One check; Windows schedules the next one')
    parser.add_argument('--dry-run', action='store_true', help='Synchronize and inspect without running or publishing jobs')
    args = parser.parse_args()
    Path(args.state_dir).mkdir(parents=True, exist_ok=True)
    logging.basicConfig(filename=str(Path(args.state_dir) / 'monitor.log'), level=logging.INFO,
                        format='%(asctime)s %(levelname)s %(message)s', encoding='utf-8', force=True)
    logging.info('Started queue checker pid=%s repo=%s', os.getpid(), args.repo)
    monitor = Monitor(args.repo, args.state_dir, args.workers, args.deps)
    try:
        return monitor.cycle(args.dry_run)
    except BlockingIOError:
        logging.info('Another monitor check is still running; skipped')
        return 0
    except Exception as error:
        logging.exception('Queue check failed; no local work discarded')
        monitor.status('error', error=str(error), finished_at=now())
        return 1


if __name__ == '__main__':
    sys.exit(main())
