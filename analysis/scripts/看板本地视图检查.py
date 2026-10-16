"""本地看板数据安全检查，不连接浏览器、线上表或UE。"""
import copy
import importlib.util
import json
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('board_local', Path(__file__).with_name('看板本地视图.py'))
M = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(M)
ROOT = Path(__file__).resolve().parents[2]
AT = '2026-10-15T23:09:06+08:00'


class LocalBoardChecks(unittest.TestCase):
    def test_real_pending_projected_without_mutation(self):
        snapshot = M.read_json(ROOT/'协作/看板快照.json')
        pending = M.read_json(ROOT/'协作/看板待同步.json')
        saved = copy.deepcopy([snapshot, pending])
        view = M.project(snapshot, pending, AT, 'test')
        self.assertEqual([snapshot, pending], saved)
        self.assertEqual(view['导出时间'], snapshot['导出时间'])
        applied = {e['id'] for e in pending['条目'] if e.get('appliedAt')}
        self.assertTrue(applied.isdisjoint(view['本地视图']['尚未应用']))
        self.assertNotIn('items/n78', view['items'])
        self.assertEqual(view['items']['n75']['status'], '已做')
        self.assertEqual(view['items']['n74'].get('syncedAt'), snapshot['items']['n74'].get('syncedAt'))

    def test_later_revision_and_applied_entries(self):
        snap = {'导出时间': AT, 'items': {}}
        first = {'id':'P001','时间':AT,'集合':'items','行':'new','字段':{'title':'旧'},'appliedAt':None}
        second = {'id':'P002','时间':AT,'集合':'items','行':'local-P001','字段':{'title':'新'},'appliedAt':None}
        view = M.project(snap, {'条目':[first, second]}, AT, 'test')
        self.assertEqual(view['items']['local-P001']['title'], '新')
        second['appliedAt'] = AT
        view = M.project(snap, {'条目':[first, second]}, AT, 'test')
        self.assertEqual(view['items']['local-P001']['title'], '旧')

    def test_cloud_assigned_id_keeps_later_local_feedback_target(self):
        snap = {'导出时间': AT, 'items': {'online-7': {'title':'已在线创建'}}}
        first = {'id':'P001','时间':AT,'集合':'items','行':'new','字段':{'title':'旧'},'appliedAt':AT,'线上行':'online-7'}
        second = {'id':'P002','时间':AT,'集合':'items','行':'local-P001','字段':{'feedback':'用户意见'},'appliedAt':None}
        view = M.project(snap, {'条目':[first,second]}, AT, 'test')
        self.assertEqual(view['items']['online-7']['feedback'], '用户意见')
        self.assertNotIn('local-P001', view['items'])

    def test_qualified_cloud_receipt_keeps_updates_on_the_real_row(self):
        for coll in M.COLLS:
            for local_id in ('g17', 'local-P001'):
                with self.subTest(collection=coll, local_id=local_id):
                    snap = {'导出时间': AT, coll: {'online-7': {'title': '云端终值', 'feedback': '原用户意见'}}}
                    first = {'id': 'P001', '时间': AT, '集合': coll, '行': 'new',
                             '字段': {'id': local_id, 'title': '已应用的旧值'},
                             'appliedAt': AT, '线上行': f'{coll}/online-7'}
                    second = {'id': 'P002', '时间': AT, '集合': coll, '行': local_id,
                              '字段': {'title': '本机新证据'}, 'appliedAt': None}
                    pending = {'条目': [first, second]}
                    saved = copy.deepcopy([snap, pending])
                    view = M.project(snap, pending, AT, 'test')
                    self.assertEqual(view[coll]['online-7']['title'], '本机新证据')
                    self.assertEqual(view[coll]['online-7']['feedback'], '原用户意见')
                    self.assertEqual(set(view[coll]), {'online-7'})
                    self.assertEqual(view['本地视图']['尚未应用'], ['P002'])
                    self.assertEqual([snap, pending], saved)

    def test_newer_online_field_is_never_overwritten_by_projection(self):
        snap = {'导出时间':AT,'items':{'i01':{'title':'线上用户新标题','recommend':'原推荐','updatedAt':'2026-10-15T23:30:00+08:00'}}}
        entry = {'id':'P001','时间':AT,'集合':'items','行':'i01', '基于':AT,
                 '基于字段':{'title':'旧标题','recommend':'原推荐'},
                 '字段':{'title':'AI准备的标题','recommend':'新推荐'},'appliedAt':None}
        view = M.project(snap,{'条目':[entry]},AT,'test')
        self.assertEqual(view['items']['i01']['title'],'线上用户新标题')
        self.assertEqual(view['items']['i01']['recommend'],'新推荐')
        self.assertIn('P001',view['本地视图']['冲突待看'])

    def fixture(self, root):
        directory = root/'协作'
        directory.mkdir()
        (directory/'看板快照.json').write_text(json.dumps({'导出时间':AT,'items':{'i01':{'title':'原'}}}), encoding='utf-8')
        (directory/'看板待同步.json').write_text(json.dumps({'格式':'df.board-pending/1','条目':[]}), encoding='utf-8')
        return directory

    def export(self, path, fields=None):
        data = {'format':'df.board-feedback/1','board':M.BOARD,'baseSnapshotAt':AT,'entries':[
            {'eventId':'client:i01:1','collection':'items','row':'i01','at':AT,
             'fields':fields or {'feedback':'用户意见','feedbackAt':AT},'baseValues':{'feedback':''}}]}
        path.write_text(json.dumps(data), encoding='utf-8')

    def test_feedback_duplicate_import_is_idempotent(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.fixture(root)
            file = root/'feedback.json'
            self.export(file)
            self.assertEqual(M.import_feedback(root,[file]), 1)
            saved = (root/'协作/看板待同步.json').read_bytes()
            self.assertEqual(M.import_feedback(root,[file]), 0)
            self.assertEqual((root/'协作/看板待同步.json').read_bytes(), saved)

    def test_invalid_file_never_partially_imports(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            directory = self.fixture(root)
            good, bad = root/'good.json', root/'bad.json'
            self.export(good)
            self.export(bad, {'owner':'冒充管理员'})
            saved = (directory/'看板待同步.json').read_bytes()
            with self.assertRaises(ValueError): M.import_feedback(root,[good,bad])
            self.assertEqual((directory/'看板待同步.json').read_bytes(), saved)

    def test_build_keeps_online_snapshot_and_is_repeatable(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            directory = self.fixture(root)
            (directory/'全局看板.html').write_text('<script type="application/json" id="snap">{}</script>',encoding='utf-8')
            (directory/'看板本机反馈.js').write_text('window.FWBLocal={};',encoding='utf-8')
            old = (directory/'看板快照.json').read_bytes()
            M.build(root, AT, 'test')
            first = (directory/'全局看板.html').read_bytes()
            M.build(root, AT, 'test')
            self.assertEqual((directory/'全局看板.html').read_bytes(), first)
            self.assertEqual((directory/'看板快照.json').read_bytes(), old)

    def test_feedback_text_cannot_close_embedded_script(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);directory=self.fixture(root)
            data=M.read_json(directory/'看板快照.json')
            data['items']['i01']['feedback']='</script><script>坏内容</script>'
            (directory/'看板快照.json').write_text(json.dumps(data),encoding='utf-8')
            (directory/'全局看板.html').write_text('<script type="application/json" id="snap">{}</script>',encoding='utf-8')
            (directory/'看板本机反馈.js').write_text('window.FWBLocal={};',encoding='utf-8')
            M.build(root,AT,'test')
            page=(directory/'全局看板.html').read_text(encoding='utf-8')
            embedded=re.search(r'id="snap">(.*?)</script>',page,re.S).group(1)
            self.assertEqual(json.loads(embedded)['items']['i01']['feedback'],data['items']['i01']['feedback'])
            self.assertNotIn('</script><script>坏内容',page)

    def test_javascript_export_python_import_and_git_ack(self):
        code = '''
const fs=require('node:fs'),vm=require('node:vm');
const ctx={crypto:{randomUUID:()=> 'roundtrip-test'}};
vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),ctx);
let saved=null;const storage={getItem:()=>saved,setItem:(k,v)=>saved=v};
const view={'导出时间':'2026-10-15T23:09:06+08:00',items:{i01:{feedback:''}},resources:{},dialogs:{}};
const session=new ctx.FWBLocal.Session(storage,view);
session.write('items','i01',{feedback:'导出回流意见',feedbackAt:'2026-10-15T23:09:06+08:00'},'2026-10-15T23:09:06+08:00');
process.stdout.write(JSON.stringify({feedback:session.export('2026-10-15T23:09:06+08:00'),saved}));
'''
        result=subprocess.run(['node','-e',code,str(ROOT/'协作/看板本机反馈.js')],check=True,capture_output=True,text=True,encoding='utf-8')
        exported=json.loads(result.stdout)
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);directory=self.fixture(root)
            file=root/'feedback.json';file.write_text(json.dumps(exported['feedback']),encoding='utf-8')
            self.assertEqual(M.import_feedback(root,[file]),1)
            view=M.project(M.read_json(directory/'看板快照.json'),M.read_json(directory/'看板待同步.json'),AT,'test')
            self.assertEqual(view['items']['i01']['feedback'],'导出回流意见')
            self.assertEqual(view['本地视图']['反馈已入Git'],[exported['feedback']['entries'][0]['eventId']])


if __name__ == '__main__': unittest.main(verbosity=2)
