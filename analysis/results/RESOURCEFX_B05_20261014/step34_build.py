# 第 3 步汇总 + 第 4 步预览 / 待导入 CSV（离线，只读已存的读回与检查结果；不连 UE、不写表）
import json,csv,io,datetime
RB=json.load(open('读回.json',encoding='utf8'))
FIND=json.load(open('手游_M查找.json',encoding='utf8'))
CHK=json.load(open('手游占位检查_原始.json',encoding='utf8'))
BK=json.load(open('手游表_备份_写前.json',encoding='utf8'))
P4={'asset':'/Game/DataTables/Resource/ResourceFXTable','file':'E:/loc_ma5/DFMEditor/DFM/Content/DataTables/Resource/ResourceFXTable.uasset',
 'depotFile':'//DFProject/release/20260925_Ma5/DFM/Content/DataTables/Resource/ResourceFXTable.uasset','client':'locmai_ma5',
 'haveRev':25,'headRev':36,'headChange':8404091,'openedByMe':False,'readOnlyOnDisk':True,'otherOpen':['dongkunkan@DONGKUNKAN-MA5 (edit)'],
 'checkedAt':'2026-10-14T23:42+08:00','how':'p4 -c locmai_ma5 -ztag fstat（只读）+ 文件属性 R'}
chk={r['assetName']:r for r in CHK['rows']}
TPL={'trail':'新年烟花2.0_拖尾','L':'新年烟花2.0_大_Yellow','M':'新年烟花2.0_中_Yellow','S':'新年烟花2.0_小_Yellow'}
CAT={'P_EFX_FireWorks_GoldRayChry':'L','P_EFX_FireWorks_SilverChry':'M','P_EFX_FireWorks_Glitter':'M','P_EFX_FireWorks_Crackle':'S','P_EFX_FireWorks_Strobe':'S','P_EFX_FireWorks_LittleCombo':'S',
 'P_EFX_FireWorks_NY_Trail_Small':'trail','P_EFX_FireWorks_NY_Trail_Medium':'trail','P_EFX_FireWorks_NY_Trail_Large':'trail','P_EFX_FireWorks_RiseTrail_Tiny':'trail'}
old={r['_row_name']:r for r in BK['rows']}
mobileRowNames=set(old)
pcFull={r['ResourceId']:r for r in RB['pcFullRowsFor30']}
rows=[];preview=[]
for f in FIND['rows']:
    rid=f['resourceId'];pc=pcFull[rid]
    hit=[p for e in f['exact'] for p in e['paths']]
    r={'resourceId':rid,'pcRowName':pc['_row_name'],'pcFxSP':pc['FxSP'],'derivedMobileName':f['derivedMobileName'],'searchedDir':FIND['mobileDir']}
    if not hit:
        r.update(status='缺资产',reason=f"手游目录 /Game/Effects/Props/FireWorks（递归 {FIND['assetsInDir']} 个资产）里没有 {f['derivedMobileName']}；按名搜只有 {', '.join(h.split('.')[-1] for h in f['searchByName']['hits']) or '无'}"+('（那是 2802 小号_C_短爆裂 的手游版，不是爆裂星，不拿来顶）' if 'Crackle' in rid else ''),mobilePath=None,whoMakes='导出（23）出 _M 包 → 用户导入')
    else:
        path=hit[0];name=path.split('.')[-1];c=chk.get(name)
        r['mobilePath']=path
        r['check']={'enabledLOD0':c['enabledLOD0'],'gpu':c['gpuCount'],'textures':[(t['path'].split('.')[-1],t.get('effectiveLongEdge')) for t in c['textures']],'hdAssets':c['hdAssets'],'pass':c['pass']}
        if c['pass']: r.update(status='可写',reason='5 项全过：启用发射器 %d、GPU 0、贴图 ≤1024、引用链无 _HD、名字 _M'%c['enabledLOD0'])
        else: r.update(status='检查没过',reason='引用链含 '+', '.join(h.split('.')[-1] for h in c['hdAssets'])+'（其余 4 项过）',whoMakes='导出（23）改手游材质不引用 MPC_EFX_General_HD → 用户重导')
        if 'GoldRayChry' in rid: r['note']='提示词说金芒菊手游版是 GoldSpark_M；用户重导后 PC 行已改指 GoldRayChry_HD，手游目录也只有 GoldRayChry_M（没有 GoldSpark_M），按新名接'
        if 'Glitter' in rid: r['note']='重导后 PC 行已改指 Glitter_HD（T05 时是 Combo_HD）；手游目录有 Glitter_M，没有 Combo_M'
    if r['status']=='可写':
        t=dict(old[TPL[CAT[rid]]]);v={k:t[k] for k in t if k!='_row_name'}
        v.update(ResourceId=rid,FxSP=r['mobilePath'],FxSP_Low=r['mobilePath'],FxSP_High=r['mobilePath'],RowDescription=pc['RowDescription'])
        rn=pc['_row_name']
        assert rn not in mobileRowNames and not any(o.get('ResourceId')==rid for o in BK['rows'])
        diffPc={k:{'pc':pc.get(k),'mobileNew':v.get(k)} for k in ['FXType','AudioResourceId','NoneLoopAudioStopType','MaxInstanceNum','EffectScale'] if str(pc.get(k))!=str(v.get(k))}
        preview.append({'op':'新增行','rowName':rn,'template':TPL[CAT[rid]],'changedFromTemplate':{k:v[k] for k in ['ResourceId','FxSP','FxSP_Low','FxSP_High','RowDescription']},'values':v,'differsFromPcRow':diffPc})
    rows.append(r)
now=datetime.datetime.now().strftime('%Y-%m-%dT%H:%M+08:00')
json.dump({'format':'df.mobile-placeholder-check-summary/1','at':now,'scope':'B05 手游 10 个 ResourceId（手游种类 6 种 + 4 根尾缀）','script':'node analysis/scripts/手游占位检查.mjs <9 个 _M 路径>（原始结果 手游占位检查_原始.json，CLI 退出 1 = 有未过项）',
 'counts':{s:sum(1 for r in rows if r['status']==s) for s in ['可写','缺资产','检查没过']},'rows':rows},open('手游占位检查.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
json.dump({'format':'df.datatable-write-preview/1','at':now,'table':P4['asset'],'p4':P4,'backup':'手游表_备份_写前.json（/datatable/rows 全表 %d 行，23:38 读）'%BK['total'],
 'decision':'没写 UE：① 本机没有测过的 ResourceFX 写表路径（特效工作台「补 ResourceFX 行」页的执行写表在禁用态、只对武器配表测过 /datatable/row/add+update），按提示词不自己造；② 手游表本地 rev 25、P4 最新 36（落后 11 版，10-12 至 10-14 有 11 次别人的提交），且 dongkunkan 正签出编辑——在旧版上写再保存，提交时二进制没法合并，会冲掉别人的改动。',
 'rules':'只新增、不改不删旧行；ResourceId 与 PC 同；FxSP/Low/High 三格同一 _M 路径（2.0 先例）；其余字段整行照抄同类 2.0 旧行（花：大/中/小_Yellow，尾缀：2.0_拖尾），不抄 PC 的 _HD 路径',
 'rows':preview,'notWritten':[{'resourceId':r['resourceId'],'status':r['status'],'reason':r['reason']} for r in rows if r['status']!='可写']},open('手游表_预览.json','w',encoding='utf8'),ensure_ascii=False,indent=1)
# UE DataTable CSV（首列 --- 为行名），只含新增行
cols=[k for k in BK['rows'][0].keys() if k!='_row_name']
buf=io.StringIO();w=csv.writer(buf,quoting=csv.QUOTE_ALL,lineterminator='\n');w.writerow(['---']+cols)
for p in preview:w.writerow([p['rowName']]+[p['values'].get(k,'') for k in cols])
open('手游表_待导入.csv','w',encoding='utf-8-sig',newline='').write(buf.getvalue())
for r in rows:print(r['status'],r['resourceId'],(r.get('mobilePath') or '').split('.')[-1],'|',r['reason'][:110])
for p in preview:print('PREVIEW',p['rowName'],p['template'],p['differsFromPcRow'])
