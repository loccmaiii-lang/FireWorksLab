"""Startup contract tests; no browser, UE call, or real service launch."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import launcher


class LauncherTests(unittest.TestCase):
    def test_local_setup_and_explicit_arguments(self):
        with tempfile.TemporaryDirectory() as folder:
            setup = Path(folder) / 'launcher.json'
            setup.write_text(json.dumps({'configPath': 'saved.json', 'importerPath': 'private.html'}))
            self.assertEqual(launcher.resolve_options(setup, None, None), ('saved.json', 'private.html'))
            self.assertEqual(launcher.resolve_options(setup, 'other.json', 'other.html'), ('other.json', 'other.html'))

    def test_existing_service_reused_without_starting_or_importing(self):
        with patch.object(launcher, 'probe', return_value={'format': launcher.FORMAT, 'importerAvailable': True}), patch.object(launcher.subprocess, 'Popen') as spawn:
            self.assertEqual(launcher.ensure_service('settings.json', 'private.html', 8034), 'http://127.0.0.1:8034/baker')
            spawn.assert_not_called()

    def test_missing_private_importer_rejected_before_launch(self):
        with patch.object(launcher, 'probe', return_value=None), patch.object(launcher.subprocess, 'Popen') as spawn:
            with self.assertRaisesRegex(ValueError, '导入器'):
                launcher.ensure_service('settings.json', 'missing-private-entry.html', 8034)
            spawn.assert_not_called()

    def test_new_service_uses_loopback_and_hidden_child(self):
        with tempfile.TemporaryDirectory() as folder:
            importer = Path(folder) / 'private.html'; importer.write_text('fixture')
            process = Mock(); process.poll.return_value = None
            with patch.object(launcher, 'probe', side_effect=[None, {'format': launcher.FORMAT, 'importerAvailable': True}]), patch.object(launcher.subprocess, 'Popen', return_value=process) as spawn:
                self.assertEqual(launcher.ensure_service(str(Path(folder) / 'settings.json'), str(importer), 8037), 'http://127.0.0.1:8037/baker')
                args, kwargs = spawn.call_args
                self.assertIn('--importer', args[0]); self.assertIn('--port', args[0]); self.assertIn('8037', args[0])
                self.assertEqual(kwargs['creationflags'], getattr(launcher.subprocess, 'CREATE_NO_WINDOW', 0))

    def test_crashed_child_is_not_reported_as_connected(self):
        with tempfile.TemporaryDirectory() as folder:
            process = Mock(); process.poll.return_value = 1
            with patch.object(launcher, 'probe', return_value=None), patch.object(launcher.subprocess, 'Popen', return_value=process):
                with self.assertRaisesRegex(RuntimeError, '启动失败'):
                    launcher.ensure_service(str(Path(folder) / 'settings.json'), None, 8037)

    def test_browser_is_optional_and_opens_only_after_connection(self):
        with patch.object(launcher, 'prepare'), patch.object(launcher, 'ensure_service', return_value='http://127.0.0.1:8034/baker'), patch.object(launcher.webbrowser, 'open') as browser:
            launcher.main(['--no-browser']); browser.assert_not_called()
            launcher.main([]); browser.assert_called_once_with('http://127.0.0.1:8034/baker', new=2)


if __name__ == '__main__':
    unittest.main()
