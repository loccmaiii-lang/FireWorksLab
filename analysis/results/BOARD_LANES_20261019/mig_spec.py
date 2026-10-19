#!/usr/bin/env python3
"""看板升级迁移：lane / pri0 / due / confirmedAt / reviewBy / 相对时间词改写 / 对话框 lastRecordAt / meta。
用法：mig_spec.py <before_dir> <out_dir> <now_iso>
before_dir 下是 ArtifactData list 的导出 (items/ dialogs/ ...)；out_dir 写出每个文档的补丁 JSON（update 合并）。"""
import json,sys,re,subprocess,os,glob,collections as C
from datetime import datetime,timedelta,timezone
before,out,NOW=sys.argv[1],sys.argv[2],sys.argv[3]
HKT=timezone(timedelta(hours=8))
now=datetime.fromisoformat(NOW)
def load(coll):
    return {os.path.basename(f)[:-5]:json.load(open(f,encoding='utf-8')) for f in glob.glob(f'{before}/{coll}/*.json')}
def g(v): return v.get('data',v)
I={k:g(v) for k,v in load('items').items()}
D={k:g(v) for k,v in load('dialogs').items()}
OPEN=('没做','在做')
WINDOW={'现在':1,'下一步':3,'之后':7,'搁置':30}
MANUAL_NOW=['n97','n100','n93','n92','n90']
MANUAL_NEXT=['n95','n96','n99','n98','n85','n79','n26']
DUE={'n90':'2026-10-19','n93':'2026-10-19'}
PRI={'n97':(0,'UE 编辑器 10-19 02:13 崩溃，最终轮全量前要确认有没有丢改动（约 30 秒）'),'n90':(2,None)}
REPL={ # 行 -> 字段 -> [(旧,新)]  旧文必须恰好出现一次；'*' 表示整段替换
 'i15':{'recommend':[('周四以后再看','之后再看')]},
 'i24':{'recommend':[('今晚逐项','10-18 晚逐项')],'waitsOn':[('不拖明天烟花秀全量','不拖 10-19 烟花秀全量')]},
 'i26':{'recommend':[('周四以后','之后再做')]},
 'i27':{'recommend':[('周四以后；','之后再做；')]},
 'i29':{'recommend':[('周四以后','之后再做')]},
 'i32':{'recommend':[('周四以后','之后再做')]},
 'i36':{'recommend':[('周四以后一起问','之后一起问')]},
 'i37':{'recommend':[('今晚逐项','10-18 晚逐项')],'waitsOn':[('不拖明天烟花秀全量','不拖 10-19 烟花秀全量')]},
 'i45':{'recommend':[('周四以后，别和导出（23）这周抢','之后再做，别和导出（23）同期抢')]},
 'i46':{'recommend':[('周四测性能时顺手记','性能测试时顺手记')]},
 'n09':{'recommend':[('批。周三多个对话框','批。多个对话框')]},
 'n11':{'recommend':[('这周重导多，提速','重导多的时候，提速')]},
 'n14':{'recommend':[('周四以后排给界面那边','之后排给界面那边')]},
 'n18':{'recommend':[('周四测完再定','性能测试完再定')]},
 'n24':{'next':[('并入明天n79','并入 10-19 n79')]},
 'n25':{'recommend':[('周四测','性能测试时测')]},
 'n26':{'title':[('明天真手游核','10-19 真手游核')]},
 'n30':{'recommend':[('（周三那条）','（10-14 那条）')]},
 'n38':{'title':[('今晚只核大型B/C/D真实尺寸与倍率；','大型B/C/D真实尺寸与倍率核对（10-18 起）；')]},
 'n77':{'title':[('今晚只收明天全量必需版本；','10-19 全量只收必需版本；')]},
 'n79':{'title':[('今晚收B11r1同版候选，明天10-19烟花秀全量；','收B11r1同版候选，10-19 烟花秀全量；')]},
 'n80':{'title':[('窜天猴明天完成：','窜天猴 10-19 完成：')],'next':[('明天先完成实际终版','10-19 先完成实际终版')]},
 'n85':{'title':[('今晚定稿读回，明天测低档与显存','10-18 晚定稿读回，10-19 测低档与显存')],
        'recommend':[('明天以这批正式设置为性能基线；今晚只核最终包','10-19 以这批正式设置为性能基线；10-18 晚只核最终包')]},
 'n88':{'recommend':[('今晚定并在明天最终轮前导入','10-18 晚定并在 10-19 最终轮前导入')]},
 'n89':{'recommend':[('必须今晚选完','必须 10-18 晚选完')]},
 'n90':{'title':[('今晚烟花秀优先，结束后','烟花秀优先，结束后')],
        'recommend':[('今晚只收必需资源','10-18 晚只收必需资源'),('明天同版测烟花秀','10-19 同版测烟花秀')]},
 'n91':{'title':[('明天10-19完成窜天猴','10-19 完成窜天猴')],
        'next':[('今晚不抢烟花秀收口窗口','10-18 晚不抢烟花秀收口窗口'),('若全项目资源明天最终轮前必须定','若全项目资源在 10-19 最终轮前必须定')],
        'recommend':[('明天集中完成','10-19 集中完成')]},
 'n92':{'title':[('今晚收Night灯光实绑与偏移，明天全量','收Night灯光实绑与偏移，10-19 全量')]},
 'n93':{'title':[('今晚先定封版资源清单：明天10-19全量；','先定封版资源清单：10-19 全量前定；')],
        'next':[('今晚：B/C/D','10-18 晚：B/C/D'),('逐项确定；明天：用户','逐项确定；10-19：用户')]},
 'n95':{'title':[('今晚按现在大小封板','按 10-18 晚的大小封板')],'recommend':[('今晚不改大小','10-18 晚不改大小'),('按「今晚封板的大小」对齐','按「10-18 晚封板的大小」对齐'),('不超过今晚（性能）','不超过当时的大小（性能）'),('不要比今晚小（观感）','不要比当时小（观感）'),('等于保持今晚大小','等于保持 10-18 晚的大小')]},
 'n97':{'recommend':[('确认今晚改的粒子','确认 10-18 晚改的粒子')]},
}
def lane_of(k,v):
    if k in MANUAL_NOW: return '现在'
    if k in MANUAL_NEXT: return '下一步'
    if v.get('when')=='暂不建议': return '搁置'
    if str(v.get('pri')) in ('1','2'): return '下一步'
    return '之后'
patches={}; receipt={}; rows=[]
for k,v in sorted(I.items()):
    if v.get('status') not in OPEN: continue
    p={}
    lane=lane_of(k,v); p['lane']=lane
    if k in PRI:
        p['priLegacy']=v.get('pri'); p['pri']=PRI[k][0]
        if PRI[k][1]: p['urgentWhy']=PRI[k][1]
    if k in DUE: p['due']=DUE[k]
    # 文字改写
    changed_text=False
    for f,subs in REPL.get(k,{}).items():
        t=str(v.get(f) or ''); new=t
        for s in subs:
            if s=='*今晚→10-18 晚': new=new.replace('今晚','10-18 晚'); continue
            old,nw=s
            assert new.count(old)==1,(k,f,old,new.count(old))
            new=new.replace(old,nw)
        if new!=t:
            p[f]=new; changed_text=True; receipt.setdefault(k,{})[f]={'before':t,'after':new}
            if f=='title': p['titleLegacy']=t
    # 核实
    upd=datetime.fromisoformat(v['updatedAt'].replace('Z','+00:00'))
    if upd.astimezone(HKT).date()==now.date():
        conf=upd.astimezone(HKT)
        p['confirmedAt']=conf.isoformat(timespec='seconds')
    elif v.get('area')=='5.0':
        conf=now; p['confirmedAt']=NOW; p['confirmNote']='4.9.118 未到 5.0（tool/CHANGELOG 顶部），本行前提仍成立'
    else: conf=None
    p['reviewBy']=(conf+timedelta(days=WINDOW[lane])).date().isoformat() if conf else now.date().isoformat()
    if changed_text: p['updatedAt']=NOW
    patches[k]=p
    rows.append((k,lane,v.get('kind'),v.get('pri'),p.get('pri'),'已核' if conf else '待复核',v.get('area'),v['title'][:40]))
os.makedirs(f'{out}/items',exist_ok=True)
for k,p in patches.items(): json.dump(p,open(f'{out}/items/{k}.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(receipt,open(f'{out}/文字改写回执.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
# 对话框 lastRecordAt
MAP={'g01':['21'],'g02':['23'],'g03':['22','22-本机'],'g04':['本机同步检测','8'],'g05':['comet&silver3.0'],'g06':['手游编排'],'g07':['新花型'],
 'g08':['FanGold'],'g09':['相机渲染'],'g10':['Material调研'],'g11':['5'],'g12':['帧号排查'],'g13':['24'],'g14':['点位架构','启动性能','15','9','16'],
 'g16':['窜天猴与仙女棒'],'g17':['21-本机'],'g18':['25','WorkBuddy-T19补测'],'g19':['26'],'g20':['网格垂柳'],'g21':['T17'],'g22':['彩千轮3'],'g23':['画质排查']}
os.makedirs(f'{out}/dialogs',exist_ok=True)
dl=[]
for gid,names in MAP.items():
    best=None
    for n in names:
        f=f'对话记录/对话框{n}.md'
        if not os.path.exists(f): continue
        t=subprocess.run(['git','log','-1','--format=%cI','--',f],capture_output=True,text=True).stdout.strip()
        if t and (best is None or datetime.fromisoformat(t)>datetime.fromisoformat(best)): best=t
    if best:
        t=datetime.fromisoformat(best).astimezone(HKT).isoformat(timespec='seconds')
        json.dump({'lastRecordAt':t},open(f'{out}/dialogs/{gid}.json','w',encoding='utf-8'),ensure_ascii=False)
        dl.append((gid,D.get(gid,{}).get('name'),D.get(gid,{}).get('state'),t))
# meta
meta={'rev':1,'lanes':['现在','下一步','之后','搁置'],'caps':{'urgent':1,'focus':3,'now':5},
 'reviewDays':WINDOW,'stale':{'warnHours':24,'badHours':72},
 'patrolAt':NOW,'patrolBy':'总管（21）云端','updatedAt':NOW,
 'note':'milestone 为空表示当前没有硬节点；要设置时写 milestone:{name,date,note}，页面顶部会出现倒计时。'}
os.makedirs(f'{out}/meta',exist_ok=True)
json.dump(meta,open(f'{out}/meta/board.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
# 汇总
print('open rows',len(rows))
print('lane',C.Counter(r[1] for r in rows))
print('已核/待复核',C.Counter(r[5] for r in rows))
print('lane x 核',C.Counter((r[1],r[5]) for r in rows))
for lane in ('现在','下一步'):
    print('==',lane)
    for r in rows:
        if r[1]==lane: print('  ',r)
print('== 待复核 by kind/pri',C.Counter((r[2],r[3]) for r in rows if r[5]=='待复核'))
print('文字改写行',len(receipt),sorted(receipt))
print('dialogs',len(dl))
for x in dl: print('  ',x)

STRICT=re.compile('今晚|今早|今天|明天|明晚|明早|昨晚|昨天|本周|这周|下周|周三前|周四以后|周四前')
bad=[]
for k,v in I.items():
    if v.get('status') not in OPEN: continue
    for f in ('title','next','recommend','waitsOn','blocks'):
        val=patches.get(k,{}).get(f, v.get(f) or '')
        if STRICT.search(str(val)): bad.append((k,f,STRICT.search(str(val)).group(0)))
print('改写后仍含相对时间词(title/next/recommend/waitsOn/blocks):',bad)
