import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import preflight


class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'tool/workbench').mkdir(parents=True)
        (self.root / 'tool/FireworkBaker.html').write_bytes(b'baker-current')
        (self.root / 'tool/烟花编排工作台.html').write_bytes(b'release-current')

    def responses(self, port, path):
        if path == '/api/health':
            return json.dumps({'format': 'df.local-delivery/1', 'toolRoot': str(self.root / 'tool')}).encode()
        if path == '/__fwl_health':
            return json.dumps({'format': 'df.workbench-dev/1', 'root': str(self.root / 'tool/workbench')}).encode()
        if path == '/baker':
            return b'baker-current'
        if path == '/release/':
            return b'release-current'
        return '<title>烟花编排工作台</title>/@vite/client /src/main.jsx'.encode()

    def test_repeated_checks_reuse_without_starting(self):
        with patch.object(preflight, 'listening', return_value=True), patch.object(preflight, 'get', side_effect=self.responses), patch.object(preflight, 'start') as start:
            for _ in range(2):
                for tool in preflight.PORTS:
                    self.assertIn('复用', preflight.ensure(tool, True, self.root, release=True))
            start.assert_not_called()

    def test_starts_only_requested_missing_service_then_verifies(self):
        with patch.object(preflight, 'listening', return_value=False), patch.object(preflight, 'get', side_effect=self.responses), patch.object(preflight, 'start') as start:
            preflight.ensure('baker', True, self.root)
            start.assert_called_once_with('baker', self.root)

    def test_check_only_never_starts_missing_service(self):
        with patch.object(preflight, 'listening', return_value=False), patch.object(preflight, 'start') as start:
            with self.assertRaisesRegex(RuntimeError, '未启动'):
                preflight.ensure('baker', False, self.root)
            start.assert_not_called()

    def test_unknown_service_and_old_health_never_start_replacement(self):
        for response in (b'not-json', b'[]', b'null', b'{"format":"df.local-delivery/1"}'):
            with self.subTest(response=response), patch.object(preflight, 'listening', return_value=True), patch.object(preflight, 'get', return_value=response), patch.object(preflight, 'start') as start:
                with self.assertRaises(RuntimeError):
                    preflight.ensure('baker', True, self.root)
                start.assert_not_called()

    def test_same_app_from_other_worktree_is_rejected(self):
        for tool, key, fmt in [('baker', 'toolRoot', 'df.local-delivery/1'), ('workbench', 'root', 'df.workbench-dev/1')]:
            with self.subTest(tool=tool), patch.object(preflight, 'get', return_value=json.dumps({'format': fmt, key: str(self.root / 'other')}).encode()):
                with self.assertRaisesRegex(RuntimeError, '另一工作树'):
                    preflight.verify(tool, self.root)

    def test_current_root_with_stale_baker_or_release_bytes_fails(self):
        for tool, target in [('baker', '/baker'), ('workbench', '/release/')]:
            def response(port, path):
                return b'stale' if path == target else self.responses(port, path)
            with self.subTest(tool=tool), patch.object(preflight, 'get', side_effect=response):
                with self.assertRaisesRegex(RuntimeError, '字节不同'):
                    preflight.verify(tool, self.root, release=True)

    def test_socket_permission_denial_is_not_missing_service(self):
        with patch.object(preflight.socket, 'create_connection', side_effect=PermissionError('denied')), patch.object(preflight, 'start') as start:
            with self.assertRaises(PermissionError):
                preflight.ensure('workbench', True, self.root)
            start.assert_not_called()

    def test_scoped_cli_does_not_touch_other_service(self):
        with patch.object(preflight, 'ensure', return_value='ready') as ensure:
            self.assertEqual(preflight.main(['--tool', 'workbench', '--start']), 0)
            ensure.assert_called_once_with('workbench', True, release=False)


if __name__ == '__main__':
    unittest.main()
