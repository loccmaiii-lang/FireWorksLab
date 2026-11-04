  async function readPack(dir,configFile='cascade.json'){
    if(!['cascade.json','cascade_mobile.json'].includes(configFile))throw Error('素材配置仅支持 cascade.json / cascade_mobile.json');
    const lines=await py(`p = ${pyStr(dir)}
p = os.path.abspath(p)
config_file = ${pyStr(configFile)}
result = {'directory':p.replace('\\\\','/'), 'candidates':[]}
if not os.path.isdir(p):
 result['error'] = 'missing_directory'
elif not os.path.isfile(os.path.join(p, config_file)):
 result['error'] = 'missing_cascade'
 result['candidates'] = [os.path.join(p,n).replace('\\\\','/') for n in sorted(os.listdir(p)) if os.path.isfile(os.path.join(p,n,config_file))][:30]
else:
 try:
  import hashlib, zlib
  source = io.open(os.path.join(p,config_file),encoding='utf-8').read()
  d = json.loads(source)
  for t in (d.get('textures') or {}).values():
   name = t.get('file','')
   if not isinstance(name,basestring) or not name or os.path.isabs(name) or ':' in name or '\\x00' in name: raise ValueError('Invalid texture file path')
   filename = os.path.realpath(os.path.join(p,name))
   if not filename.startswith(os.path.realpath(p) + os.sep): raise ValueError('Texture file escapes package directory')
  ex = dict((k,os.path.isfile(os.path.join(p,t.get('file','')))) for k,t in (d.get('textures') or {}).items())
  hashes = {}
  for k,t in (d.get('textures') or {}).items():
   if ex[k]:
    h = hashlib.sha256()
    fnv, crc, size = 2166136261, 0, 0
    with open(os.path.join(p,t['file']),'rb') as image:
     while True:
      part = image.read(1024*1024)
      if not part: break
      h.update(part)
      if t.get('hash') and t.get('class') in ['ramp','cutout']:
       crc = zlib.crc32(part,crc)
       size += len(part)
       for value in bytearray(part): fnv = ((fnv ^ value) * 16777619) & 0xffffffff
    hashes[k] = h.hexdigest()
    if t.get('hash') and t.get('class') in ['ramp','cutout']:
     actual = '%08x%08x%x' % (crc & 0xffffffff,fnv,size)
     if t['hash'] != actual: raise ValueError('Texture content fingerprint mismatch: ' + k)
  result.update({'spec':d,'configFile':config_file,'exists':ex,'sourceHash':hashlib.sha256(source.encode('utf-8')).hexdigest(),'textureHashes':hashes})
 except (ValueError,IOError,TypeError,AttributeError) as error:
  result.update({'error':'invalid_cascade','reason':str(error)})
print('FWLJSON:' + json.dumps(result))
`,60000);
    const output=lines.find(line=>line.startsWith('FWLJSON:')||line.startsWith('FWLPACKERROR:'));
    if(!output)throw Error('未收到素材读取结果，请检查 UE 连接');
    const result=JSON.parse(output.slice(output.indexOf(':')+1));
    if(result.error){
      const messages={missing_directory:'素材目录不存在，请检查路径。',missing_cascade:'该目录没有 cascade.json。请选择具体效果文件夹，而不是素材总目录。',invalid_cascade:'cascade.json 无法读取，请核对导出的配置文件。'};
      const error=Error((messages[result.error]||'素材包读取失败。').replace(/cascade\.json/g,configFile)+(result.reason?' '+result.reason:''));
      error.packDiagnostic=result;throw error;
    }
    return result;
  }
