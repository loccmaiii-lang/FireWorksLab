import json
import os
from pathlib import Path
import subprocess
import tempfile
import types
import unittest
from unittest.mock import patch

from job_lock import ProcessLock, gpu_lock_path
import run_jobs
from watch_jobs import Monitor, select_jobs, save_json


class SelectionTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.repo = Path(self.directory.name)
        (self.repo / 'analysis/jobs').mkdir(parents=True)
        (self.repo / 'analysis/scripts').mkdir(parents=True)

    def job(self, jid, **fields):
        save_json(self.repo / 'analysis/jobs' / (jid + '.json'), {'id': jid, **fields})

    def test_completed_failed_changed_and_draft_tasks(self):
        self.job('DONE')
        save_json(self.repo / 'analysis/results/DONE/done.json', {'ok': True})
        self.job('FAIL', start='analysis/jobs/起点/FAIL.json')
        save_json(self.repo / 'analysis/jobs/起点/FAIL.json', {'P': {'size': 1}})
        self.job('DRAFT', ready=False)
        self.job('HIGH', priority=10)
        selected, completed, paused = select_jobs(self.repo, {})
        self.assertEqual([item[0]['id'] for item in selected], ['HIGH', 'FAIL'])
        self.assertEqual(completed, ['DONE'])
        attempts = {'FAIL': {'fingerprint': selected[1][1]}}
        self.assertEqual([j['id'] for j, _ in select_jobs(self.repo, attempts)[0]], ['HIGH'])
        save_json(self.repo / 'analysis/jobs/起点/FAIL.json', {'P': {'size': 2}})
        self.assertEqual([j['id'] for j, _ in select_jobs(self.repo, attempts)[0]], ['HIGH', 'FAIL'])

    def test_job_id_cannot_escape_result_directory(self):
        save_json(self.repo / 'analysis/jobs/BAD.json', {'id': '../../private'})
        with self.assertRaises(ValueError): select_jobs(self.repo, {})

    def test_locks_are_exclusive_and_release(self):
        first = ProcessLock(self.repo / 'lock')
        second = ProcessLock(self.repo / 'lock')
        self.assertTrue(first.acquire())
        self.assertFalse(second.acquire())
        first.close()
        self.assertTrue(second.acquire())
        second.close()

    def test_failed_runner_attempts_once_and_releases_claim(self):
        self.job('FAIL')
        compare = types.ModuleType('compare')
        compare.SimSession = lambda: types.SimpleNamespace(renderer='GPU', mode='gpu', soft=False, close=lambda: None)
        with patch.dict('sys.modules', {'compare': compare}), \
                patch.object(run_jobs, 'JOBS', str(self.repo / 'analysis/jobs')), \
                patch.object(run_jobs, 'RES', str(self.repo / 'analysis/results')), \
                patch.object(run_jobs, 'run_job', return_value=False) as execute:
            self.assertEqual(run_jobs.worker([], False), 1)
            self.assertEqual(execute.call_count, 1)
        self.assertFalse((self.repo / 'analysis/results/FAIL/_claim.json').exists())

    def test_browser_failure_also_releases_claim(self):
        self.job('FAIL')
        compare = types.ModuleType('compare')
        def broken(): raise RuntimeError('browser unavailable')
        compare.SimSession = broken
        with patch.dict('sys.modules', {'compare': compare}), \
                patch.object(run_jobs, 'JOBS', str(self.repo / 'analysis/jobs')), \
                patch.object(run_jobs, 'RES', str(self.repo / 'analysis/results')):
            self.assertEqual(run_jobs.worker([], False), 1)
        self.assertTrue((self.repo / 'analysis/results/FAIL/error.json').exists())
        self.assertFalse((self.repo / 'analysis/results/FAIL/_claim.json').exists())


class GitFlowTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        base = Path(self.directory.name)
        self.remote, self.cloud, self.worker = base / 'remote.git', base / 'cloud', base / 'worker'
        self.git(base, 'init', '--bare', str(self.remote))
        self.git(base, 'clone', str(self.remote), str(self.cloud))
        self.git(self.cloud, 'checkout', '-b', 'main')
        self.identity(self.cloud)
        save_json(self.cloud / 'analysis/jobs/NEW.json', {'id': 'NEW'})
        (self.cloud / 'tool/data').mkdir(parents=True)
        (self.cloud / 'tool/data/review.js').write_text('initial', encoding='utf-8')
        (self.cloud / 'tool/data/video_meta.json').write_text('{}', encoding='utf-8')
        self.commit_cloud('initial')
        self.git(base, 'clone', '-b', 'main', str(self.remote), str(self.worker))
        self.identity(self.worker)
        self.monitor = Monitor(self.worker, base / 'state')
        self.executions = []
        self.fail = False
        self.monitor.script = self.fake_script

    def git(self, repo, *args):
        return subprocess.check_output(['git', *args], cwd=repo, text=True, encoding='utf-8', stderr=subprocess.DEVNULL)

    def identity(self, repo):
        self.git(repo, 'config', 'user.name', 'Monitor Test')
        self.git(repo, 'config', 'user.email', 'monitor-test@example.invalid')

    def commit_cloud(self, title):
        self.git(self.cloud, 'add', '.')
        self.git(self.cloud, 'commit', '-m', title)
        self.git(self.cloud, 'push', 'origin', 'main')

    def fake_script(self, relative, *args, **kwargs):
        if relative.endswith('run_jobs.py'):
            ids = [arg for arg in args if not arg.startswith('--')]
            self.executions.extend(ids)
            for jid in ids:
                save_json(self.worker / 'analysis/results' / jid / ('error.json' if self.fail else 'done.json'),
                          {'error': 'simulated'} if self.fail else {'ok': True})
            return int(self.fail)
        done = sorted(path.parent.name for path in (self.worker / 'analysis/results').glob('*/done.json'))
        (self.worker / 'tool/data/review.js').write_text(json.dumps(done), encoding='utf-8')
        return 0

    def test_batch_uploads_and_completed_tasks_do_not_repeat(self):
        self.assertEqual(self.monitor.cycle(), 0)
        self.assertEqual(self.executions, ['NEW'])
        self.assertEqual(self.monitor.state['pending_publish'], [])
        self.assertIn('true', self.git(self.remote, 'show', 'main:analysis/results/NEW/done.json'))
        self.assertEqual(self.monitor.cycle(), 0)
        self.assertEqual(self.executions, ['NEW'])

    def test_failed_task_is_uploaded_and_waits_for_changed_input(self):
        self.fail = True
        self.assertEqual(self.monitor.cycle(), 1)
        self.assertIn('simulated', self.git(self.remote, 'show', 'main:analysis/results/NEW/error.json'))
        self.assertEqual(self.monitor.cycle(), 0)
        self.assertEqual(self.executions, ['NEW'])
        self.git(self.cloud, 'pull', '--ff-only', 'origin', 'main')
        save_json(self.cloud / 'analysis/jobs/NEW.json', {'id': 'NEW', 'priority': 1})
        self.commit_cloud('correct task')
        self.fail = False
        self.assertEqual(self.monitor.cycle(), 0)
        self.assertEqual(self.executions, ['NEW', 'NEW'])

    def test_interrupted_batch_recovers_without_recomputing(self):
        save_json(self.worker / 'analysis/results/NEW/done.json', {'ok': True})
        self.monitor.state['pending_publish'] = ['NEW']
        self.assertEqual(self.monitor.cycle(), 0)
        self.assertEqual(self.executions, [])
        self.assertIn('true', self.git(self.remote, 'show', 'main:analysis/results/NEW/done.json'))

    def test_concurrent_cloud_review_is_regenerated_after_push_rejection(self):
        actual_git = self.monitor.git
        concurrent = [False]
        def race(*args, **kwargs):
            if args[:2] == ('push', 'origin') and not concurrent[0]:
                concurrent[0] = True
                save_json(self.cloud / 'analysis/results/OTHER/done.json', {'ok': True})
                (self.cloud / 'tool/data/review.js').write_text('cloud review', encoding='utf-8')
                self.commit_cloud('another cloud task completed')
            return actual_git(*args, **kwargs)
        self.monitor.git = race
        self.assertEqual(self.monitor.cycle(), 0)
        review = self.git(self.remote, 'show', 'main:tool/data/review.js')
        self.assertEqual(json.loads(review), ['NEW', 'OTHER'])
        self.assertEqual(self.git(self.worker, 'status', '--porcelain').strip(), '')

    def test_other_gpu_batch_prevents_checkout_sync_and_execution(self):
        with ProcessLock(gpu_lock_path(self.worker)):
            self.assertEqual(self.monitor.cycle(), 0)
        self.assertEqual(self.executions, [])
        self.assertEqual(self.monitor.state['phase'], 'gpu_busy')


if __name__ == '__main__': unittest.main()
