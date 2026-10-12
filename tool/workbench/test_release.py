import hashlib
import json
import shutil
import subprocess
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

    def test_original_music_is_placed_beside_the_offline_page_but_never_overwrites(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            music, fresh, mine = root / 'repo.wav', root / 'fresh', root / 'mine'
            music.write_bytes(b'RIFF original')
            fresh.mkdir()
            mine.mkdir()
            (mine / 'music.wav').write_bytes(b'personal audio')
            self.assertTrue(release.publish_music(fresh, music))
            self.assertEqual((fresh / 'music.wav').read_bytes(), b'RIFF original')
            self.assertFalse(release.publish_music(fresh, music))
            self.assertFalse(release.publish_music(mine, music))
            self.assertEqual((mine / 'music.wav').read_bytes(), b'personal audio')
            self.assertFalse(release.publish_music(fresh, root / 'missing.wav'))
            self.assertEqual(sorted(p.name for p in fresh.iterdir()), ['music.wav'])

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

    def test_lf_fingerprints_match_crlf_and_lf_checkouts(self):
        """16.0.19：Windows 构建机的 CRLF 工作区与云端 LF 检出要能互相核对同一份成品。"""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            html = root / 'app.html'
            html.write_bytes(b'html')
            manifest_file = html.with_name(html.name + '.build.json')
            lf_hash = hashlib.sha256(b'a\nb\n').hexdigest()
            for body in [b'a\r\nb\r\n', b'a\nb\n', b'a\r\nb\n']:
                (root / 'App.jsx').write_bytes(body)
                manifest_file.write_text(json.dumps({'sha256': hashlib.sha256(b'html').hexdigest(), 'fingerprint': 'sha256-lf',
                                                     'sourceFiles': {'App.jsx': lf_hash}}), encoding='utf-8')
                release.verify_artifact(html, root)
            # 旧清单（原字节，构建机整篇 CRLF）：云端 LF 检出也认；内容真的改了仍然拦住。
            manifest_file.write_text(json.dumps({'sha256': hashlib.sha256(b'html').hexdigest(),
                                                 'sourceFiles': {'App.jsx': hashlib.sha256(b'a\r\nb\r\n').hexdigest()}}), encoding='utf-8')
            (root / 'App.jsx').write_bytes(b'a\nb\n')
            release.verify_artifact(html, root)
            (root / 'App.jsx').write_bytes(b'a\nc\n')
            with self.assertRaisesRegex(ValueError, '源码'):
                release.verify_artifact(html, root)

    def test_data_only_refuses_when_app_inputs_changed(self):
        self.assertEqual(release.data_only_blockers({'tool/workbench/public/data/cloud-latest.json',
                                                     'tool/workbench/release.py', 'tool/workbench/scripts/publish-show.mjs',
                                                     'tool/offline-workbench/build.mjs', 'tool/workbench/README.md'}), [])
        self.assertEqual(release.data_only_blockers({'tool/workbench/src/App.jsx', 'tool/workbench/public/data/size-spec.json',
                                                     'tool/workbench/package-lock.json', 'tool/offline-workbench/bootstrap.js',
                                                     'tool/workbench/fixtures/demo.dfshow'}),
                         ['tool/offline-workbench/bootstrap.js', 'tool/workbench/fixtures/demo.dfshow',
                          'tool/workbench/package-lock.json', 'tool/workbench/public/data/size-spec.json',
                          'tool/workbench/src/App.jsx'])
        self.assertEqual(release.data_only_blockers({'tool/workbench/srcx/a.js'}), [])

    def test_tool_version_cannot_reuse_a_data_only_number(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'src').mkdir()
            (root / 'public/data').mkdir(parents=True)
            (root / 'src/connection.mjs').write_text("export const WORKBENCH_VERSION='16.0.19';", encoding='utf-8')
            cloud = root / release.CLOUD_LATEST
            release.version_guard(root)
            cloud.write_text(json.dumps({'version': '16.0.19', 'publishMode': 'with-app'}), encoding='utf-8')
            release.version_guard(root)
            cloud.write_text(json.dumps({'version': '16.0.19', 'publishMode': 'data-only'}), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, '16.0.19'):
                release.version_guard(root)
            (root / 'src/connection.mjs').write_text("export const WORKBENCH_VERSION='16.0.20';", encoding='utf-8')
            release.version_guard(root)

    @unittest.skipUnless(shutil.which('node'), '需要 Node.js')
    def test_data_patch_changes_only_the_cloud_programme(self):
        script = (release.TOOL / 'offline-workbench/patch-data.mjs').as_uri()
        code = f"""
import {{patchCloudLatest,encode}} from {json.dumps(script)};
const data={{'size-spec':{{a:'<b>\\u2028'}},'cloud-latest':{{version:'16.0.1',x:1}}}};
const head='<!doctype html><script id="df-offline-data" type="application/json">',tail='</script><script id="df-offline-runtime">var a="</"+"script>"</script>';
const html=head+encode(JSON.stringify(data))+tail;
const r=patchCloudLatest(html,{{version:'16.0.2',y:'</script>'}},{{'size-spec':data['size-spec']}});
const block=r.html.slice(head.length,r.html.length-tail.length);
if(!r.html.startsWith(head)||!r.html.endsWith(tail)||r.previous.version!=='16.0.1'||block.includes('</'))throw Error('patch');
const back=JSON.parse(block);if(back['cloud-latest'].version!=='16.0.2'||JSON.stringify(back['size-spec'])!==JSON.stringify(data['size-spec'])||Object.keys(back).join()!=='size-spec,cloud-latest')throw Error('data');
let refused=0;try{{patchCloudLatest(head+JSON.stringify(data)+tail,{{}})}}catch{{refused++}}
try{{patchCloudLatest(html,{{}},{{'size-spec':{{a:'changed'}}}})}}catch{{refused++}}
if(refused!==2)throw Error('refuse');console.log('ok');
"""
        out = subprocess.run(['node', '--input-type=module', '-e', code], capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(out.returncode, 0, out.stderr)
        self.assertEqual(out.stdout.strip(), 'ok')


if __name__ == '__main__':
    unittest.main()
