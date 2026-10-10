import io
import json
import tempfile
import unittest
import zipfile
from unittest.mock import patch
from pathlib import Path
from store import Store


def pack(prefix='', image=b'original-png', extra=None):
    out = io.BytesIO()
    with zipfile.ZipFile(out, 'w') as z:
        c = {'format': 'fwl.cascade/1', 'name': 'Test_01', 'textures': {'seq': {'file': 'T_Test.png'}}, 'emitters': [{'name': 'Main'}]}
        z.writestr(prefix + 'cascade.json', json.dumps(c))
        z.writestr(prefix + 'cascade_mobile.json', json.dumps(c))
        z.writestr(prefix + 'T_Test.png', image)
        z.writestr(prefix + '命名对照.txt', '原命名')
        if extra:
            z.writestr(*extra)
    return out.getvalue()


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = Store(Path(self.tmp.name) / 'settings.json')
        self.store.set_root(str(Path(self.tmp.name) / 'resources'))

    def test_publish_multilevel_original_bytes_and_persistence(self):
        r = self.store.publish(pack('Test/'), 'Test.zip', {'duration': 4})
        self.assertEqual((Path(r['directory']) / 'Test/T_Test.png').read_bytes(), b'original-png')
        self.assertEqual({p['platform'] for p in r['packages']}, {'pc', 'mobile'})
        self.assertEqual(len(Store(self.store.config).resources()['resources']), 1)

    def test_immutable_idempotent_revision_and_new_version(self):
        first = self.store.publish(pack(), 'Test')
        duplicate = self.store.publish(pack(), 'Test')
        second = self.store.publish(pack(image=b'new'), 'Test')
        self.assertEqual(first['deliveryId'], duplicate['deliveryId'])
        self.assertNotEqual(first['revisionId'], second['revisionId'])
        self.assertEqual(Path(first['directory'], 'T_Test.png').read_bytes(), b'original-png')
        self.assertEqual(len(self.store.resources()['resources']), 2)

    def test_modified_index_cannot_escape_root(self):
        r = self.store.publish(pack(), 'Test')
        index = self.store.root / 'workspace-resources.json'
        data = json.loads(index.read_text(encoding='utf-8'))
        data['resources'][0]['relativeDirectory'] = '../outside'
        index.write_text(json.dumps(data), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, '目录'):
            self.store.receipt(r['deliveryId'])

    def test_invalid_zip_cannot_publish(self):
        for extra in [('../escape.png', b'x'), ('C:/file', b'x'), ('t_test.PNG', b'x'), ('CON.txt', b'x')]:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                self.store.publish(pack(extra=extra), 'Test')
        self.assertEqual(self.store.resources()['resources'], [])

    def test_missing_reference_and_corruption_not_published(self):
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w') as z:
            z.writestr('cascade.json', json.dumps({'format': 'fwl.cascade/1', 'textures': {'seq': {'file': 'missing.png'}}, 'emitters': [{}]}))
        with self.assertRaises(ValueError):
            self.store.publish(out.getvalue(), 'Test')
        r = self.store.publish(pack(), 'Test')
        Path(r['directory'], 'T_Test.png').write_bytes(b'tampered')
        with self.assertRaisesRegex(ValueError, '变更'):
            self.store.receipt(r['deliveryId'])

    def test_symlink_and_crc_fail_before_index(self):
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w') as z:
            info = zipfile.ZipInfo('link')
            info.external_attr = (0o120777 << 16)
            z.writestr(info, 'target')
        with self.assertRaises(ValueError):
            self.store.publish(out.getvalue(), 'Test')
        raw = bytearray(pack())
        offset = raw.index(b'original-png')
        raw[offset] = ord('X')
        with self.assertRaises(zipfile.BadZipFile):
            self.store.publish(raw, 'Test')
        self.assertEqual(self.store.resources()['resources'], [])

    def test_import_receipt_never_claims_playback(self):
        r = self.store.publish(pack(), 'Test')
        self.store.record_import(r['deliveryId'], {'rows': [{'state': 'done'}]})
        self.assertFalse(self.store.receipt(r['deliveryId'])['importReceipt']['enginePlaybackVerified'])
        with self.assertRaises(ValueError):
            self.store.resource_file(r['deliveryId'], '../settings.json')

    def test_index_write_failure_keeps_previous_revision(self):
        first = self.store.publish(pack(), 'Test')
        from store import atomic_json
        def fail_index(path, data):
            if path.name == 'workspace-resources.json':
                raise OSError('isolated disk failure')
            return atomic_json(path, data)
        with patch('store.atomic_json', side_effect=fail_index), self.assertRaises(OSError):
            self.store.publish(pack(image=b'new'), 'Test')
        self.assertEqual(self.store.resources()['resources'][0]['deliveryId'], first['deliveryId'])
        self.assertEqual(len(self.store.resources()['resources']), 1)


if __name__ == '__main__':
    unittest.main()
