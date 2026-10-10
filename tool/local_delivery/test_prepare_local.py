import hashlib
import tempfile
import unittest
from pathlib import Path
from prepare_local import prepare


class LocalDeploymentTests(unittest.TestCase):
    def test_native_ui_is_local_and_original_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); tool = root / 'tool'; local = tool / 'local_delivery'; local.mkdir(parents=True)
            for name in ('directory-client.js', 'delivery-host.js'):
                (local / name).write_text('// ' + name)
            original = root / 'private.html'
            original.write_text("<body><main>Actual native UI</main><script>" + ''.join(
                "parent.postMessage({type:'" + kind + "',receipts:{}},location.origin);\n"
                for kind in ('workspace-view-state', 'workspace-import-state')) + '</script></body>')
            digest = hashlib.sha256(original.read_bytes()).digest()
            self.assertTrue(prepare(tool, original))
            output = (local / 'runtime/importer.html').read_text()
            self.assertIn('Actual native UI', output)
            self.assertNotIn('parent.postMessage', output)
            self.assertEqual(output.count("location.protocol==='file:'?'*':location.origin"), 2)
            self.assertIn('// directory-client.js', output)
            self.assertEqual(hashlib.sha256(original.read_bytes()).digest(), digest)
            self.assertFalse((tool / 'FireworkBaker.html').exists())

    def test_missing_setup_does_not_invent_private_paths(self):
        with tempfile.TemporaryDirectory() as folder:
            self.assertFalse(prepare(folder, setup=Path(folder) / 'missing.json'))

    def test_invalid_importer_cannot_replace_existing_local_component(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); dest = root / 'local_delivery/runtime/importer.html'; dest.parent.mkdir(parents=True)
            dest.write_text('previous'); src = root / 'bad.html'; src.write_text('<body>wrong</body>')
            with self.assertRaisesRegex(ValueError, '状态接口'):
                prepare(root, src)
            self.assertEqual(dest.read_text(), 'previous')
