import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import release


class ReleaseTests(unittest.TestCase):
    def test_workspace_delivery_and_legacy_path_are_deduplicated(self):
        expected = release.TOOL.parent / 'FXtools' / '烟花编排工作台'
        self.assertEqual(release.delivery_targets(None, {}), [expected.resolve()])
        self.assertEqual(release.delivery_targets(None, {'deliveryDir': str(expected)}), [expected.resolve()])
        old = release.TOOL / 'legacy'
        self.assertEqual(release.delivery_targets(None, {'deliveryDir': str(old)}), [expected.resolve(), old.resolve()])
        self.assertEqual(release.delivery_targets(old, {}), [old.resolve()])

    def test_copy_only_named_tools_keeps_personal_files_and_history(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, target = root / 'source', root / 'target'
            source.mkdir()
            target.mkdir()
            (source / 'app.html').write_bytes(b'new')
            (target / 'app.html').write_bytes(b'old')
            (target / 'my.dfshow').write_bytes(b'personal programme')
            (target / 'music.wav').write_bytes(b'personal audio')
            release.publish_files(source, target, ['app.html'])
            self.assertEqual((target / 'app.html').read_bytes(), b'new')
            self.assertEqual((target / 'my.dfshow').read_bytes(), b'personal programme')
            self.assertEqual((target / 'music.wav').read_bytes(), b'personal audio')

    def test_failure_rolls_back_already_published_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, target = root / 'source', root / 'target'
            source.mkdir()
            target.mkdir()
            for name in ['a', 'b']:
                (source / name).write_bytes(b'new')
                (target / name).write_bytes(b'old')
            replace = release.os.replace
            def fail_second(src, dst):
                if Path(src).name == 'b' and Path(src).parent.name == 'new':
                    raise PermissionError('模拟文件被占用')
                replace(src, dst)
            with patch.object(release.os, 'replace', side_effect=fail_second):
                with self.assertRaises(PermissionError):
                    release.publish_files(source, target, ['a', 'b'])
            for name in ['a', 'b']:
                self.assertEqual((target / name).read_bytes(), b'old')

    def test_changed_source_or_corrupt_artifact_cannot_deploy(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'App.jsx').write_text('source', encoding='utf-8')
            html = root / 'app.html'
            html.write_text('html', encoding='utf-8')
            manifest = {'sha256': hashlib.sha256(b'html').hexdigest(), 'sourceFiles': {'App.jsx': hashlib.sha256(b'source').hexdigest()}}
            html.with_name(html.name + '.build.json').write_text(json.dumps(manifest), encoding='utf-8')
            release.verify_artifact(html, root)
            (root / 'App.jsx').write_text('edited', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, '源码'):
                release.verify_artifact(html, root)
            html.write_text('corrupted', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'HTML'):
                release.verify_artifact(html, root)

    def test_zip_contains_only_listed_delivery_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'app.html').write_bytes(b'offline')
            (root / 'private.dfshow').write_bytes(b'personal')
            release.make_zip(root, ['app.html'], 'app.zip')
            with release.zipfile.ZipFile(root / 'app.zip') as bundle:
                self.assertEqual(bundle.namelist(), ['app.html'])
                self.assertEqual(bundle.read('app.html'), b'offline')


if __name__ == '__main__':
    unittest.main()
