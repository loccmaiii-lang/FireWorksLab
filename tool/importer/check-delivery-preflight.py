"""临时目录验证包级门与跨会话登记，正式根与 UE 均不写。"""
import hashlib,importlib.util,json,struct,tempfile,io,contextlib,sys
from unittest.mock import patch
from pathlib import Path
spec=importlib.util.spec_from_file_location('private_gate',Path(__file__).with_name('delivery-preflight.py'));gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)
with tempfile.TemporaryDirectory() as temporary:
    root=Path(temporary);revision=root/'Trail'/'revisions'/'fixture';revision.mkdir(parents=True)
    data=b'\x89PNG\r\n\x1a\n'+b'\x00'*8+struct.pack('>II',64,64)+b'fixture'
    texture='T_EFX_FireWorks_RiseTrail_S_Loop_16x1_01'
    config={'format':'fwl.cascade/1','name':'RiseTrail_S_M','platform':'mobile','tier':'M','textures':{'seq':{'class':'flipbook','file':texture+'.png','asset':texture,'sha256':hashlib.sha256(data).hexdigest()}},'materials':{'loop':{'textures':{'main':'seq'}}},'emitters':[{'name':'RiseLoop','max_alive':1,'material':'loop','gpu':False,'required':{'duration_s':3}}]}
    (revision/(texture+'.png')).write_bytes(data);(revision/'cascade_mobile.json').write_text(json.dumps(config),encoding='utf-8')
    assert gate.inspect(revision,root=root)['ok']
    assert not (root/'.workspace/texture-fingerprints.json').exists()
    proof={'ramp|fixture':{'pkg':'/Game/Effects/Common/Texture/Ramp/Existing_R','diskHash':'a'*64}}
    assert gate.inspect(revision,True,proof,root=root)['ok']
    assert gate.inspect(revision,root=root)['registry']['ueProofs']==proof
    config['name']='RiseTrail_S_Mobile_HD';(revision/'cascade_mobile.json').write_text(json.dumps(config),encoding='utf-8')
    assert not gate.inspect(revision,root=root)['ok']
    config['name']='RiseTrail_S_M';config['emitters']*=10;(revision/'cascade_mobile.json').write_text(json.dumps(config),encoding='utf-8')
    assert not gate.inspect(revision,root=root)['ok']
    config['emitters']=config['emitters'][:1];config['derived']={'from':'RiseTrail_L'};(revision/'cascade_mobile.json').write_text(json.dumps(config),encoding='utf-8')
    result=gate.inspect(revision,root=root);assert not result['ok'] and any('派生资源开了新贴图名' in x for x in result['problems'])
print('PASS 上游好包通过、坏命名与超预算拦截、只读不登记、跨会话登记保留；零正式文件/UE写入')

# CLI实际解析路径：先验证输入再登记；不依赖命令行容纳整个证明对象。
def cli(arguments,payload=b''):
    output=io.StringIO();error=io.StringIO()
    with patch.object(sys,'stdin',io.TextIOWrapper(io.BytesIO(payload),encoding='utf-8')),contextlib.redirect_stdout(output),contextlib.redirect_stderr(error):
        result=gate.main(arguments)
    return result,output.getvalue(),error.getvalue()

large={str(i):{'pkg':'/Game/Fixture/'+str(i),'note':'中文换行\n与引号"反斜杠\\','diskHash':'a'*64} for i in range(2000)}
with patch.object(gate,'inspect',return_value={'ok':True}) as inspect:
    result,_,_=cli(['D:/Fixture','--register','--proofs-stdin'],json.dumps(large,ensure_ascii=False).encode('utf-8'))
    assert result==0 and inspect.call_args.args[2]==large
print('PASS 超长UTF8标准输入无截断，2000条证明完整交给登记')
with patch.object(gate,'inspect',return_value={'ok':True}) as inspect:
    result,_,_=cli(['D:/Fixture','--register','--proofs','{"legacy":{}}'])
    assert result==0 and inspect.call_args.args[2]=={'legacy':{}}
print('PASS 旧小规模--proofs调用兼容')
for payload in [b'bad',b'',b'[]',b'null',b'"text"',b'\xff']:
    with patch.object(gate,'inspect') as inspect:
        result,_,error=cli(['D:/Fixture','--register','--proofs-stdin'],payload)
        assert result==2 and not inspect.called and error
print('PASS 损坏JSON/UTF8、空输入和非对象在任何登记前失败')
with patch.object(gate,'inspect') as inspect:
    result,_,error=cli(['D:/Fixture','--proofs-stdin'],b'{}')
    assert result==2 and not inspect.called
print('PASS 预检不消费登记stdin，不扩大写入范围')
with patch.object(gate,'inspect',return_value={'ok':False,'problems':['模拟规范错误']}) as inspect:
    result,output,error=cli(['D:/Fixture','--register','--proofs-stdin'],b'{}')
    assert result==1 and json.loads(output)['ok'] is False
print('PASS 规范失败维持退出码1，不能冒充登记成功')
