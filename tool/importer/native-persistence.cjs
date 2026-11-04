const fs=require('node:fs');
const crypto=require('node:crypto');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function packageFile(pkg){
  if(!pkg.startsWith('/Game/')||pkg.includes('..'))throw Error('Unsupported native package');
  return 'E:/loc_ma5/DFMEditor/DFM/Content/'+pkg.slice(6)+'.uasset';
}
function verifyDiskSaved(file,id,beforeHash){
  if(!fs.existsSync(file))throw Error('Native package file missing: '+file);
  const bytes=fs.readFileSync(file);
  if(!bytes.length)throw Error('Native package file empty: '+file);
  if(!bytes.includes(Buffer.from(id,'utf8')))throw Error('Native ID missing from disk package: '+id);
  const sha256=hash(file);
  if(beforeHash===sha256)throw Error('Native package unchanged after save: '+file);
  return {file,bytes:bytes.length,sha256,modified:fs.statSync(file).mtime.toISOString()};
}
module.exports={packageFile,verifyDiskSaved,hash};
