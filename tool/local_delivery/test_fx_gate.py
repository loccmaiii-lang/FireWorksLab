"""fx_gate.py 的检查（4.9.69）：合规包通过；10-12 那几种错各一个包都拦下；共享登记跨会话去重。"""
import copy
import hashlib
import io
import json
import struct
import tempfile
import unittest
import zipfile
from pathlib import Path

import fx_gate


def png(w=1024, h=1024, salt=0):
    return b'\x89PNG\r\n\x1a\n' + struct.pack('>I', 13) + b'IHDR' + struct.pack('>II', w, h) + bytes([8, 6, 0, 0, 0, salt])


GOOD_MOBILE = {
    'format': 'fwl.cascade/1', 'name': 'RiseTrail_S_M', 'platform': 'mobile', 'tier': 'M',
    'textures': {
        'loop': {'file': 'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01.png', 'class': 'flipbook'},
        'ramp': {'file': 'T_EFX_FireWorks_RiseTrail_S_R.png', 'class': 'ramp'},
    },
    'materials': {'loop': {'textures': {'main': 'loop', 'ramp': 'ramp'}}, 'dot': {'role': 'soft_dot'}},
    'emitters': [
        {'name': 'RiseLoop', 'material': 'loop', 'gpu': False, 'max_alive': 1, 'required': {'delay_s': 0, 'duration_s': 3}},
        {'name': 'HeadGlow', 'material': 'dot', 'gpu': False, 'max_alive': 1, 'required': {'delay_s': 0, 'duration_s': 3}},
        {'name': 'SparksCoarse', 'material': 'dot', 'gpu': False, 'max_alive': 48, 'required': {'delay_s': 0, 'duration_s': 3}},
    ],
}
GOOD_PC = {
    'format': 'fwl.cascade/1', 'name': 'RiseTailS', 'platform': 'pc',
    'textures': {'loop': {'file': 'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01_HD.png', 'class': 'flipbook'},
                 'ramp': {'file': 'T_EFX_FireWorks_RiseTrail_S_R.png', 'class': 'ramp'}},
    'emitters': [{'name': 'RiseLoop', 'gpu': False}],
}


def make(tmp, mobile=None, pc=None, pngs=None, name='pkg'):
    d = Path(tmp) / name
    d.mkdir(parents=True, exist_ok=True)
    (d / 'cascade_mobile.json').write_text(json.dumps(mobile or GOOD_MOBILE, ensure_ascii=False), encoding='utf-8')
    (d / 'cascade.json').write_text(json.dumps(pc or GOOD_PC, ensure_ascii=False), encoding='utf-8')
    files = pngs or {
        'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01.png': png(1024, 1024, 1),
        'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01_HD.png': png(2048, 2048, 2),
        'T_EFX_FireWorks_RiseTrail_S_R.png': png(256, 8, 3),
    }
    for f, b in files.items():
        (d / f).write_bytes(b)
    return d


class Gate(unittest.TestCase):
    def test_same_delivery_survives_editor_identity_change(self):
        known = {'textures': {'T': {'sha256': 'old', 'source': 'rv:old', 'resourceName': 'Same'}}}
        incoming = {'T': {'sha256': 'new'}}
        self.assertTrue(fx_gate.check_registry({'T': 'flipbook'}, incoming, known, 'my:new', 'Same')[0], '同名但来源不同，须明确确认迭代')
        proof = {'sourceKey': 'my:new', 'resourceName': 'Same', 'assets': [
            {'file': 'T.png', 'before': 'old', 'after': 'new', 'sourceKey': 'rv:old', 'resource': 'Same'}]}
        self.assertEqual(fx_gate.check_registry({'T': 'flipbook'}, incoming, known, 'my:new', 'Same', proof)[0], [])
        self.assertTrue(fx_gate.check_registry({'T': 'flipbook'}, incoming, known, 'my:new', 'Other')[0])
        self.assertTrue(fx_gate.check_registry({'T': 'flipbook'}, incoming, known, 'my:new')[0])
        self.assertTrue(fx_gate.check_registry({'T': 'flipbook'}, incoming, known, '')[0])

    def test_old_revision_registration_recovers_unique_delivery_name(self):
        root = Path(self.tmp)
        workspace = root / '.workspace'; workspace.mkdir(exist_ok=True)
        (workspace / 'texture-fingerprints.json').write_text(json.dumps({'textures': {'T': {'resource': 'revision', 'source': 'old'}}}))
        (root / 'workspace-resources.json').write_text(json.dumps({'resources': [{'revisionId': 'revision', 'name': 'Same'}]}))
        self.assertEqual(fx_gate.load_registry(root)['textures']['T']['resourceName'], 'Same')
        # 只读归属恢复不得偷偷修改共享登记。
        self.assertNotIn('resourceName', json.loads((workspace / 'texture-fingerprints.json').read_text())['textures']['T'])
        (root / 'workspace-resources.json').write_text(json.dumps({'resources': [{'revisionId': 'revision', 'name': 'Same'}, {'revisionId': 'revision', 'name': 'Other'}]}))
        self.assertNotIn('resourceName', fx_gate.load_registry(root)['textures']['T'])

    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def test_good(self):
        r = fx_gate.check(make(self.tmp))
        self.assertTrue(r['ok'], r['problems'])

    def test_zip(self):
        d = make(self.tmp)
        z = Path(self.tmp) / 'p.zip'
        with zipfile.ZipFile(z, 'w') as zf:
            for f in d.iterdir():
                zf.write(f, 'RiseTrail_S/' + f.name)
        self.assertTrue(fx_gate.check(z)['ok'])

    def bad(self, mobile, want, pngs=None, pc=None):
        r = fx_gate.check(make(self.tmp, mobile, pc, pngs))
        self.assertFalse(r['ok'])
        self.assertTrue(any(want in x for x in r['problems']), r['problems'])

    def test_0_never_stream(self):     # 用户 10-18：永远不勾 NeverStream
        pc = copy.deepcopy(GOOD_PC); k = next(iter(pc['textures'])); pc['textures'][k]['never_stream'] = True
        self.bad(None, 'NeverStream', pc=pc)

    def test_1_mobile_hd_name(self):     # 10-12：手机粒子叫 _Mobile_HD
        m = copy.deepcopy(GOOD_MOBILE); m['name'] = 'RiseTrail_S_Mobile_HD'
        self.bad(m, '带 _HD / _Mobile')

    def test_1_tier(self):
        m = copy.deepcopy(GOOD_MOBILE); m['tier'] = 'L'; m['name'] = 'RiseTrail_S_L'
        self.bad(m, '不是 H / M')

    def test_2_budget(self):     # 10-12：手机尾缀 10 个发射器、有 GPU
        m = copy.deepcopy(GOOD_MOBILE)
        m['emitters'] += [{'name': 'SparksFine', 'material': 'dot', 'gpu': True, 'max_alive': 400, 'required': {}}]
        r = fx_gate.check(make(self.tmp, m))
        txt = ' '.join(r['problems'])
        for w in ('超过 _M 上限 3', 'GPU 发射器 SparksFine', '超过 50'):
            self.assertIn(w, txt)

    def test_2_two_sequences(self):     # 近段 + 远段同时在 = 两层 overdraw
        m = copy.deepcopy(GOOD_MOBILE)
        m['textures']['far'] = {'file': 'T_EFX_FireWorks_RiseTrail_S_Far_16x2_01.png', 'class': 'flipbook'}
        m['materials']['far'] = {'textures': {'main': 'far'}}
        m['emitters'][2] = {'name': 'TrailFar', 'material': 'far', 'gpu': False, 'max_alive': 1, 'required': {'delay_s': 0.6, 'duration_s': 10}}
        p = {'T_EFX_FireWorks_RiseTrail_S_Far_16x2_01.png': png(1024, 512, 9)}
        d = make(self.tmp, m)
        (d / 'T_EFX_FireWorks_RiseTrail_S_Far_16x2_01.png').write_bytes(p['T_EFX_FireWorks_RiseTrail_S_Far_16x2_01.png'])
        r = fx_gate.check(d)
        self.assertTrue(any('同一时刻有 2 张大序列' in x for x in r['problems']), r['problems'])

    def test_3_hd_texture_and_size(self):
        m = copy.deepcopy(GOOD_MOBILE)
        m['textures']['loop']['file'] = 'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01_HD.png'
        r = fx_gate.check(make(self.tmp, m))
        txt = ' '.join(r['problems'])
        self.assertIn('引用了 _HD 贴图', txt)
        self.assertIn('超过 1024', txt)

    def test_3_any_texture_over_1024(self):     # 用户 10-12 22:01：旧 2048 共用图也不行（Ramp / 轮廓图一样）
        pngs = {'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01.png': png(1024, 1024, 1), 'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01_HD.png': png(2048, 2048, 2),
                'T_EFX_FireWorks_RiseTrail_S_R.png': png(2048, 8, 3)}
        self.bad(None, '手机贴图超过 1024', pngs=pngs)

    def test_4_derived_new_textures(self):     # 10-12：主角尾缀开了 RiseTrail_Hero_L_* 一套新图
        pc = copy.deepcopy(GOOD_PC); pc['derived'] = {'from': 'RiseTrail_L', 'system': 'RiseTrail_Hero'}
        self.bad(None, '派生资源开了新贴图名', pc=pc)

    def test_5_sha_mismatch(self):
        m = copy.deepcopy(GOOD_MOBILE); m['textures']['loop']['sha256'] = '0' * 64
        self.bad(m, 'sha256 不一致')

    def test_registry_clash_and_duplicate(self):
        root = Path(self.tmp) / 'root'
        first = fx_gate.check(make(self.tmp, name='a'), root, 'ef:RT6S')
        self.assertTrue(first['ok'])
        fx_gate.register(first, root, 'RiseTrail_S')
        # 同一个效果重导、内容一样：通过
        self.assertTrue(fx_gate.check(make(self.tmp, name='b'), root, 'ef:RT6S')['ok'])
        # 别的效果同名不同内容：撞名
        pngs = {'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01.png': png(1024, 1024, 77),
                'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01_HD.png': png(2048, 2048, 2), 'T_EFX_FireWorks_RiseTrail_S_R.png': png(256, 8, 3)}
        r = fx_gate.check(make(self.tmp, pngs=pngs, name='c'), root, 'ef:other')
        self.assertTrue(any('撞名但内容不同' in x for x in r['problems']), r['problems'])
        # 换名字、内容一样：序列图拦（写改用哪张），Ramp 只提示复用（M 尾缀那张 Ramp 和 S 一样）
        m = json.loads(json.dumps(GOOD_MOBILE).replace('RiseTrail_S_', 'RiseTrail_M_')); m['name'] = 'RiseTrail_M_M'
        pc = json.loads(json.dumps(GOOD_PC).replace('RiseTrail_S_', 'RiseTrail_M_'))
        pngs = {'T_EFX_FireWorks_RiseTrail_M_Loop_16x1_01.png': png(1024, 1024, 1),
                'T_EFX_FireWorks_RiseTrail_M_Loop_16x1_01_HD.png': png(2048, 2048, 5), 'T_EFX_FireWorks_RiseTrail_M_R.png': png(256, 8, 3)}
        r = fx_gate.check(make(self.tmp, m, pc, pngs, name='d'), root, 'ef:RT6M')
        self.assertTrue(any('改用 T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01' in x for x in r['problems']), r['problems'])
        self.assertTrue(any('T_EFX_FireWorks_RiseTrail_S_R' in x and '导入器会复用' in x for x in r['info']), r['info'])
        self.assertFalse(any(x.startswith('T_EFX_FireWorks_RiseTrail_M_R：') for x in r['problems']), r['problems'])

    def test_iteration_requires_exact_content_and_ownership(self):
        asset = 'T_EFX_FireWorks_GlitterChry_Main_4x4_01_HD'
        known = {'textures': {asset: {'sha256': 'old', 'source': 'rv:QA20', 'resourceName': 'GlitterChry_D150'}}}
        pngs = {asset: {'sha256': 'new', 'size': [2048, 2048]}}
        proof = {'sourceKey': 'my:goldB', 'resourceName': 'GlitterChry', 'assets': [
            {'file': asset + '.png', 'before': 'old', 'after': 'new', 'sourceKey': 'rv:QA20', 'resource': 'GlitterChry_D150'}]}
        def problems(p=None, source='my:goldB', name='GlitterChry'):
            return fx_gate.check_registry({}, pngs, known, source, name, p)[0]
        self.assertTrue(problems(), '没有明确迭代仍要拦截')
        self.assertFalse(problems(proof), '保存的逐资产迭代证据可供导入检查核对')
        variant = copy.deepcopy(proof)
        variant['deliveryName'] = 'GlitterChry_V1-V3'
        self.assertFalse(problems(variant, name='GlitterChry_V1-V3'), '种子变体容器名可不同于逻辑粒子名')
        self.assertTrue(problems(proof, source='my:unrelated'))
        self.assertTrue(problems(proof, name='Other'))
        known['textures'][asset]['sha256'] = 'changed'
        self.assertTrue(problems(proof), '旧文件改变后，旧确认失效')
        known['textures'][asset]['sha256'] = 'old'
        pngs[asset]['sha256'] = 'changed'
        self.assertTrue(problems(proof), '包内容改变后，旧确认失效')
        pngs[asset]['sha256'] = 'new'
        known['textures'][asset]['resourceName'] = 'GlitterChry'
        self.assertTrue(problems(), '同名不能代替来源与指纹')

    def test_iteration_metadata_reaches_real_check_entry(self):
        root = Path(self.tmp) / 'registry'
        old = fx_gate.check(make(self.tmp, name='old'), root, 'rv:old')
        old['resourceName'] = 'Same_D150'
        fx_gate.register(old, root, 'Same_D150')
        package = make(self.tmp, name='next')
        asset = 'T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01_HD'
        before = old['textures'][asset]['sha256']
        (package / (asset + '.png')).write_bytes(png(2048, 2048, 99))
        after = hashlib.sha256((package / (asset + '.png')).read_bytes()).hexdigest()
        metadata = {'sourceKey': 'my:new', 'iterationOf': {'sourceKey': 'my:new', 'resourceName': 'Same', 'assets': [
            {'file': asset + '.png', 'before': before, 'after': after, 'sourceKey': 'rv:old', 'resource': 'Same_D150'}]}}
        receipt = package / 'workspace-resource.json'
        receipt.write_text(json.dumps({'name': 'Same', 'metadata': metadata}), encoding='utf-8')
        checked = fx_gate.check(package, root)
        self.assertTrue(checked['ok'], checked['problems'])
        # 直接下载 ZIP 没有服务回执，消费同一生产来源和确认记录。
        receipt.unlink()
        exported = package / 'workspace-export.json'
        exported.write_text(json.dumps({'format': 'df.firework-export/1', 'resourceName': 'Same', **metadata}), encoding='utf-8')
        self.assertTrue(fx_gate.check(package, root)['ok'])
        receipt.write_text(json.dumps({'name': 'Same', 'metadata': {}}), encoding='utf-8')
        self.assertFalse(fx_gate.check(package, root)['ok'], '存在正式回执时，不用ZIP生产记录补造缺失归属')
        receipt.unlink()
        exported.unlink()
        metadata.pop('iterationOf')
        receipt.write_text(json.dumps({'name': 'Same', 'metadata': metadata}), encoding='utf-8')
        self.assertFalse(fx_gate.check(package, root)['ok'])

    def test_cli_exit_codes(self):
        self.assertEqual(fx_gate.main([str(make(self.tmp)), '--json']), 0)
        m = copy.deepcopy(GOOD_MOBILE); m['name'] = 'X_Mobile'
        self.assertEqual(fx_gate.main([str(make(self.tmp, m, name='bad'))]), 1)
        self.assertEqual(fx_gate.main([str(Path(self.tmp) / 'nope')]), 2)


if __name__ == '__main__':
    unittest.main()
