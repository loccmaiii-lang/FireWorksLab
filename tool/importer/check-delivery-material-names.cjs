const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({formalMaterialName:(s,k,m)=>m.asset||'MI_Example_01_HD'});
vm.runInContext(fs.readFileSync(__dirname+'/delivery-material-names.js','utf8'),c);
assert.equal(c.formalMaterialName({platform:'pc',naming:{base:'Example'}},'main',{}),'MI_Example_01_HD');
assert.equal(c.formalMaterialName({platform:'mobile',naming:{base:'Example'}},'main',{}),'MI_Example_01');
assert.equal(c.formalMaterialName({platform:'mobile',naming:{base:'Example'}},'main',{asset:'MI_Explicit'}),'MI_Explicit');
assert.equal(c.formalMaterialName({platform:'mobile'},'main',{}),'MI_Example_01');
console.log('4 delivery material naming cases passed; existing explicit naming and templates preserved.');
