import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
import launcher


class LauncherTests(unittest.TestCase):
    def test_reuses_existing_process_without_spawning(self):
        with patch.object(launcher.subprocess, 'Popen') as spawn:
            self.assertEqual(launcher.ensure_process(8036, lambda: True, [], '', Path('unused.log')), '复用')
            spawn.assert_not_called()

    def test_wrong_service_is_not_killed_or_replaced(self):
        with patch.object(launcher, 'port_busy', return_value=True), patch.object(launcher.subprocess, 'Popen') as spawn:
            with self.assertRaisesRegex(RuntimeError, '占用'):
                launcher.ensure_process(8036, lambda: False, [], '', Path('unused.log'))
            spawn.assert_not_called()

    def test_dev_checks_exact_existing_app_not_any_html(self):
        with patch.object(launcher, 'read_url', return_value=b'<title>wrong app</title>'):
            self.assertFalse(launcher.dev_ready())
        with patch.object(launcher, 'read_url', return_value='<title>烟花编排工作台</title><script src="/@vite/client"></script><script src="/src/main.jsx"></script>'.encode()):
            self.assertTrue(launcher.dev_ready())

    def test_hidden_spawn_and_partial_launch_fail_are_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            child = Mock()
            child.poll.return_value = 1
            with patch.object(launcher, 'port_busy', return_value=False), patch.object(launcher.subprocess, 'Popen', return_value=child) as spawn:
                with self.assertRaisesRegex(RuntimeError, '启动失败'):
                    launcher.ensure_process(8036, lambda: False, ['python', 'service.py'], tmp, Path(tmp) / 'server.log')
                self.assertEqual(spawn.call_args.kwargs['creationflags'], getattr(launcher.subprocess, 'CREATE_NO_WINDOW', 0))

    def test_unconfigured_dev_does_not_install_or_build(self):
        with patch.object(launcher, 'dev_ready', return_value=False), patch.object(launcher, 'port_busy', return_value=False), patch.object(launcher.subprocess, 'Popen') as spawn:
            with self.assertRaisesRegex(RuntimeError, '未配置'):
                launcher.ensure_dev({'devPath': Path('not-existing-source'), 'nodePath': None})
            spawn.assert_not_called()


if __name__ == '__main__':
    unittest.main()
