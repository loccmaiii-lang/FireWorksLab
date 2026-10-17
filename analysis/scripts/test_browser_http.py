"""HTTP 门禁入口及待推版本核对，不打开浏览器或修改服务。"""
import os
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
from urllib.parse import urlsplit, parse_qs

from browser_runtime import validation_url, verify_validation_source


class HttpValidationTests(unittest.TestCase):
    def test_http_preserves_path_query_and_fragment(self):
        result = validation_url('http://127.0.0.1:8034/baker?probe=1#delivery')
        self.assertEqual(urlsplit(result).path, '/baker')
        self.assertEqual(parse_qs(urlsplit(result).query, keep_blank_values=True), {'probe': ['1'], 'fast': ['']})
        self.assertEqual(urlsplit(result).fragment, 'delivery')

    def test_hook_environment_is_inherited(self):
        with patch.dict(os.environ, {'FW_GATE_HTML': 'http://127.0.0.1:8034/baker'}):
            self.assertTrue(validation_url(default=Path('tool/FireworkBaker.html')).startswith('http://127.0.0.1:8034/baker?'))
            self.assertTrue(validation_url('http://localhost:8034/baker?fast').startswith('http://localhost:8034/'))

    def test_default_file_entry_is_preserved(self):
        with patch.dict(os.environ, {}, clear=True), patch('browser_runtime.platform.system', return_value='Linux'):
            self.assertTrue(validation_url(default=Path('tool/FireworkBaker.html')).startswith('file:///'))

    def test_windows_defaults_to_authorized_http_entry(self):
        with patch.dict(os.environ, {}, clear=True), patch('browser_runtime.platform.system', return_value='Windows'):
            self.assertTrue(validation_url(default=Path('tool/FireworkBaker.html')).startswith('http://127.0.0.1:8034/baker?'))

    def source_check(self, actual, expected):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = actual
        with patch('browser_runtime.urlopen', return_value=response), patch.object(Path, 'read_bytes', return_value=expected):
            verify_validation_source('http://127.0.0.1:8034/baker?fast', Path('tool/FireworkBaker.html'))

    def test_git_line_endings_do_not_change_identity(self):
        self.source_check(b'<html>\r\n112\r\n', b'<html>\n112\n')

    def test_other_version_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, '不一致'):
            self.source_check(b'<html>111</html>', b'<html>112</html>')


if __name__ == '__main__':
    unittest.main()
