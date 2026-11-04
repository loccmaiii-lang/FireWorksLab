const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {loadBackend} = require('./import-backend.cjs');
const python = 'E:/loc_ma5/DFMEditor/Engine/Binaries/ThirdParty/Python/Win64/python.exe';
const original = __dirname + '/backups/20261009-source-control-before.html';

// Execute production-generated Python, rather than returning handcrafted JSON.
// Stub the UE module and filesystem; no engine calls or asset/directory writes.
function fixture(options = {}) {
  let calls = 0, receipt;
  const prefix = `# -*- coding: utf-8 -*-
import sys, types, os, json
unreal = types.ModuleType('unreal')
sys.modules['unreal'] = unreal
class Text(object):
 def __unicode__(self): return u'\\u6e90\\u7801\\u7ba1\\u7406\\u670d\\u52a1\\u5668\\u5f53\\u524d\\u4e0d\\u53ef\\u7528: SSL failed'
class State(object):
 def __init__(self, pkg):
  self.is_valid = not pkg.endswith('Fail')
  self.is_added = pkg.endswith('Add')
  self.is_checked_out = pkg.endswith('Edit')
class SourceControl(object):
 available = ${options.offline ? 'False' : 'True'}
 @staticmethod
 def is_enabled(): return ${options.disabled ? 'False' : 'True'}
 @classmethod
 def is_available(cls): return cls.available
 @classmethod
 def query_file_state(cls, pkg):
  if ${options.exception ? 'True' : 'False'}: raise RuntimeError(u'\\u8fde\\u63a5\\u5f02\\u5e38')
  return State(pkg)
 @classmethod
 def check_out_or_add_file(cls, pkg, silent):
  if ${options.disconnect ? 'True' : 'False'}: cls.available = False
  return False
 @staticmethod
 def last_error_msg(): return Text()
unreal.SourceControl = SourceControl
unreal.Paths = type('Paths', (), {'project_content_dir':staticmethod(lambda: 'F:/Fake/Content')})
os.path.isfile = lambda path: ${options.missing ? 'False' : 'True'}
os.path.getsize = lambda path: 123
`;
  const api = async (route, body) => {
    if(body.function === 'SetMetadataTag' || body.function === 'SaveAsset') {
      calls++;
      return {data:{return_value:'True'}};
    }
    assert.equal(body.function, 'ExecutePythonCommandEx');
    const result = spawnSync(python, ['-c', prefix + body.args.PythonCommand], {encoding:'utf8'});
    if(result.error) throw result.error;
    if(result.status !== 0) return {data:{return_value:'False',out_CommandResult:result.stderr}};
    const line = result.stdout.trim();
    receipt = JSON.parse(line.slice('FWLSAVE:'.length));
    return {data:{return_value:'True',out_LogOutput:'Output='+JSON.stringify(line)}};
  };
  const backend = loadBackend(api,()=>{},options.original ? {htmlFile:original} : {});
  const it = {as:'Fixture_01',spec:{name:'Fixture'},importProgress:{saved:[],added:[],edited:[]}};
  const entries = (options.names || ['Fail']).map(name=>['tex:'+name,backend.MAP.dirs.flipbook+'/Fixture'+name]);
  return {it,entries,run:()=>backend.saveCreatedAssets(it,entries,'贴图'),receipt:()=>receipt,calls:()=>calls};
}

(async()=>{
  const old = fixture({original:true});
  await assert.rejects(old.run(),/Text.*not JSON serializable/);
  assert.equal(old.it.importProgress.saved.length,0);
  console.log('PASS old generated Python reproduces FText JSON failure and lost saved receipt');
  if(process.argv.includes('--reproduce')) return;

  const text = fixture({names:Array.from({length:12},(_,i)=>i+'Fail')});
  await assert.rejects(text.run(),/已保存，但版本管理.*源码管理服务器当前不可用: SSL failed/);
  assert.equal(text.it.importProgress.saved.length,12);
  assert.equal(text.receipt().length,12);
  assert(text.receipt().every(r=>r.saved && r.sc==='failed' && typeof r.reason==='string'));
  console.log('PASS native-style FText is Unicode JSON and failed source control remains a failure');

  const mixed = fixture({names:['Add','Edit','Fail']});
  await assert.rejects(mixed.run(),/版本管理/);
  assert.equal(mixed.it.importProgress.saved.length,3);
  assert.equal(mixed.it.importProgress.added.length,1);
  assert.equal(mixed.it.importProgress.edited.length,1);
  console.log('PASS mixed saved/add/edit counts survive one failed asset');

  const lost = fixture({names:['Fail','SecondFail'],disconnect:true});
  await assert.rejects(lost.run(),/SSL failed/);
  assert.equal(lost.it.importProgress.saved.length,2);
  assert.equal(lost.receipt()[1].sc,'offline');
  console.log('PASS availability is rechecked after provider disconnects mid-batch');

  const offline = fixture({offline:true});
  await assert.rejects(offline.run(),/版本管理.*SSL failed/);
  assert.equal(offline.it.importProgress.saved.length,1);
  assert.equal(offline.receipt()[0].sc,'offline');
  console.log('PASS initially offline provider preserves actual Unicode error and saved evidence');

  const exception = fixture({exception:true});
  await assert.rejects(exception.run(),/连接异常/);
  assert.equal(exception.it.importProgress.saved.length,1);
  console.log('PASS non-ASCII Python exception is normalized without dropping the error');

  const disabled = fixture({disabled:true});
  await disabled.run();
  assert.equal(disabled.receipt()[0].sc,'disabled');
  assert.equal(disabled.it.importProgress.saved.length,1);
  assert.equal(disabled.it.importProgress.added.length,0);
  console.log('PASS intentionally disabled provider is distinct from enabled-but-offline');

  const missing = fixture({missing:true});
  await assert.rejects(missing.run(),/磁盘文件未保存/);
  assert.equal(missing.it.importProgress.saved.length,0);
  console.log('PASS successful SaveAsset reply alone cannot claim a missing disk file was saved');
})().catch(error=>{console.error(error);process.exitCode=1;});
