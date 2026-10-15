# -*- coding: utf-8 -*-
"""
极简 UE4 包(.uasset/.umap)只读解析器 —— 针对本项目定制 UE4.24（FileVersionUE4=522, LegacyFileVersion=-4613）。
只解析：名称表 / 导入表 / 导出表 / 带标签属性(FPropertyTag)。包头里定制引擎多出来的字段不解析（读到缩略图偏移即止）。
用途：读取关卡中 Actor 的 RelativeLocation、核对序列里 MovieSceneFloatChannel 的落盘数据。不支持写入。
"""
import struct, io

class R:
    def __init__(s, b, p=0): s.b=b; s.p=p
    def i32(s): v=struct.unpack_from('<i',s.b,s.p)[0]; s.p+=4; return v
    def u32(s): v=struct.unpack_from('<I',s.b,s.p)[0]; s.p+=4; return v
    def i64(s): v=struct.unpack_from('<q',s.b,s.p)[0]; s.p+=8; return v
    def u16(s): v=struct.unpack_from('<H',s.b,s.p)[0]; s.p+=2; return v
    def u8(s): v=s.b[s.p]; s.p+=1; return v
    def f32(s): v=struct.unpack_from('<f',s.b,s.p)[0]; s.p+=4; return v
    def raw(s,n): v=s.b[s.p:s.p+n]; s.p+=n; return v
    def fstr(s):
        n=s.i32()
        if n==0: return ''
        if n>0: v=s.b[s.p:s.p+n-1].decode('latin1'); s.p+=n; return v
        n=-n; v=s.b[s.p:s.p+2*n-2].decode('utf-16le'); s.p+=2*n; return v
    def guid(s): return s.raw(16)

class Pkg:
    def __init__(s, path):
        s.path=path
        s.b=open(path,'rb').read()
        r=R(s.b)
        s.tag=r.u32(); s.legacy=r.i32()
        if s.legacy!=-4: s.ue3=r.i32()
        s.ver=r.i32(); s.lic=r.i32()
        n=r.i32(); s.custom=[(r.guid(),r.i32()) for _ in range(n)]
        s.off_total_header=r.p; s.total_header=r.i32()
        s.folder=r.fstr(); s.pkgflags=r.u32()
        s.off_namecount=r.p
        s.name_count=r.i32(); s.name_off=r.i32()
        if s.ver>=516: s.loc_id=r.fstr()
        s.off_gather=r.p
        s.gather_count=r.i32(); s.gather_off=r.i32()
        s.off_exportcount=r.p
        s.export_count=r.i32(); s.export_off=r.i32()
        s.import_count=r.i32(); s.import_off=r.i32()
        s.off_depends=r.p; s.depends_off=r.i32()
        s.softref_count=r.i32(); s.softref_off=r.i32()
        s.off_searchable=r.p; s.searchable_off=r.i32()
        s.off_thumb=r.p; s.thumb_off=r.i32()
        # names
        r.p=s.name_off; s.names=[]
        for _ in range(s.name_count):
            nm=r.fstr(); r.u16(); r.u16(); s.names.append(nm)
        # imports
        r.p=s.import_off; s.imports=[]
        for _ in range(s.import_count):
            cp=s.fname(r); cn=s.fname(r); outer=r.i32(); on=s.fname(r)
            s.imports.append(dict(class_package=cp,class_name=cn,outer=outer,name=on))
        r.p=s.export_off; s.exports=[]
        for i in range(s.export_count):
            st=r.p
            e=dict(entry_off=st)
            e['class']=r.i32(); e['super']=r.i32(); e['template']=r.i32(); e['outer']=r.i32()
            e['name']=s.fname(r); e['flags']=r.u32()
            e['size_off']=r.p; e['size']=r.i64(); e['off_off']=r.p; e['offset']=r.i64()
            r.raw(12); r.guid(); r.u32(); r.i32(); r.i32(); r.raw(20)
            e['entry_size']=r.p-st
            s.exports.append(e)
    def fname(s, r):
        i=r.i32(); n=r.i32()
        nm=s.names[i]
        return nm if n==0 else '%s_%d'%(nm,n-1)
    def objname(s, idx):
        if idx==0: return 'None'
        if idx<0: return s.imports[-idx-1]['name']
        return s.exports[idx-1]['name']
    def fullpath(s, idx):
        parts=[]
        while idx!=0:
            if idx<0: o=s.imports[-idx-1]; parts.append(o['name']); idx=o['outer']
            else: o=s.exports[idx-1]; parts.append(o['name']); idx=o['outer']
        return '.'.join(reversed(parts))
    def classname(s, e): return s.objname(e['class'])

    # tagged property parsing (subset)
    def read_tag(s, r):
        name=s.fname(r)
        if name=='None': return None
        t=dict(name=name, type=s.fname(r)); t['size']=r.i32(); t['index']=r.i32()
        ty=t['type']
        if ty=='StructProperty': t['struct']=s.fname(r); r.guid()
        elif ty=='BoolProperty': t['bool']=r.u8()
        elif ty in ('ByteProperty','EnumProperty'): t['enum']=s.fname(r)
        elif ty in ('ArrayProperty','SetProperty'): t['inner']=s.fname(r)
        elif ty=='MapProperty': t['inner']=s.fname(r); t['value']=s.fname(r)
        hg=r.u8()
        if hg: r.guid()
        t['val_off']=r.p
        return t
    def props(s, start, end):
        r=R(s.b,start); out=[]
        while r.p<end:
            t=s.read_tag(r)
            if t is None: break
            t['raw']=s.b[r.p:r.p+t['size']]
            out.append(t); r.p+=t['size']
        return out, r.p
    def decode(s, t):
        ty=t['type']; b=t['raw']
        if ty=='FloatProperty': return struct.unpack('<f',b)[0]
        if ty=='IntProperty': return struct.unpack('<i',b)[0]
        if ty=='BoolProperty': return bool(t['bool'])
        if ty in ('ByteProperty','EnumProperty'):
            if len(b)==8: return s.names[struct.unpack('<i',b[:4])[0]]
            return b[0]
        if ty=='ObjectProperty':
            return s.fullpath(struct.unpack('<i',b)[0])
        if ty=='NameProperty': return s.names[struct.unpack('<i',b[:4])[0]]
        if ty=='StructProperty':
            st=t['struct']
            if st in ('Vector','Rotator'): return struct.unpack('<3f',b[:12])
            if st=='Color': return tuple(b[:4])  # BGRA
            if st=='LinearColor': return struct.unpack('<4f',b[:16])
        return b[:32].hex()+('...' if len(b)>32 else '')
