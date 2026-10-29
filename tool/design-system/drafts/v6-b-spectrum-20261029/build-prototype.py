"""从受保护的原B生成独立视觉适配入口，不改原B或真实引擎。"""
from pathlib import Path
import hashlib, json

HERE=Path(__file__).resolve().parent
BASE=HERE.parent/'v4-workflows-20261029'
NAME=HERE.name

def write(name, text):
    (HERE/name).write_bytes(text.replace('\r\n','\n').encode('utf-8'))

source=(BASE/'studio.js').read_text(encoding='utf-8')
needle="const key='fwl.workflow-demo.20261029.'+concept;"
assert source.count(needle)==1
variant=source.replace(needle,"const key='fwl.workflow-demo.20261029.spectrum-b.'+concept;")
write('studio.js',variant)
html=(BASE/'b.html').read_text(encoding='utf-8')
html=html.replace('<head>','<head><base href="../v4-workflows-20261029/">',1)
html=html.replace('<title>B · 分组聚焦</title>','<title>B · Adobe统一组件 · 独立Demo</title>',1)
html=html.replace('src="studio.js"',f'src="../{NAME}/studio.js"',1)
html=html.replace('</head>',f'<link rel="stylesheet" href="../v5-spectrum-20261029/spectrum-tokens.css"><link rel="stylesheet" href="../v5-spectrum-20261029/spectrum-components.css"><link rel="stylesheet" href="../{NAME}/b-adapter.css"><script defer src="../{NAME}/b-adapter.js"></script></head>',1)
html=html.replace('data-concept="focus"','data-concept="focus" data-design="spectrum" data-density="compact"',1)
write('b.html',html)
manifest={
    'source':'v4-workflows-20261029/b.html + studio.js',
    'studioModification':'Only the local demo storage key; no parameter, transaction, preview or export logic changed',
    'storageKey':'fwl.workflow-demo.20261029.spectrum-b.focus',
    'originalStorageKey':'fwl.workflow-demo.20261029.focus',
    'baseHref':'../v4-workflows-20261029/',
    'sharedSpectrum':['../v5-spectrum-20261029/spectrum-tokens.css','../v5-spectrum-20261029/spectrum-components.css'],
    'sameRuntime':['parameters.json','focus-panel.js','engine-bridge.js','studio.css','focus-panel.css'],
    'baseHashes':{n:hashlib.sha256((BASE/n).read_bytes()).hexdigest() for n in ['b.html','studio.js','parameters.json','focus-panel.js','engine-bridge.js','studio.css','focus-panel.css']},
    'generatedHashes':{n:hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['b.html','studio.js']},
    'productionSourceChanged':False,
}
write('build-manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('B variant generated; original controller differs only by isolated storage key')
