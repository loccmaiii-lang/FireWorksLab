const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'fx-persistence-'));
const file=path.join(folder,'ResourceFXTable.uasset');
const id='P_EFX_FireWorks_PersistenceFixture_01';
const hash=()=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(file,'original rows');
const before=hash();
const reply={success:true,data:{row_added:true}}; // Same absence of a saved flag as the native service.
assert.notEqual(reply.data.saved,false); // The old check incorrectly accepted this.
const {verifyDiskSaved}=require('./native-persistence.cjs');
assert.throws(()=>verifyDiskSaved(file,id,before),/unchanged|missing/);
fs.writeFileSync(file,'unrelated change');
assert.throws(()=>verifyDiskSaved(file,id,before),/missing/);
fs.writeFileSync(file,'native-name-map '+id);
const evidence=verifyDiskSaved(file,id,before);
assert.equal(evidence.sha256,hash());
assert(evidence.bytes>0);
assert.throws(()=>verifyDiskSaved(file,id,evidence.sha256),/unchanged/);
fs.writeFileSync(file,'');
assert.throws(()=>verifyDiskSaved(file,id,before),/empty/);
console.log('API success with unsaved or wrong disk contents is rejected; saved native ID accepted. No UE writes.');
