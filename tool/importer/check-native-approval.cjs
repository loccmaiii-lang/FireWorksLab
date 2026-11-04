const assert=require('node:assert/strict');
const fs=require('node:fs');
if(fs.existsSync(__dirname+'/research/calibration-20261002/native-authorization.json'))throw Error('Approval exists; do not erase it for this fixture');
const api=require('./engine_api.cjs');
let calls=0;
api.request=async()=>{calls++;throw Error('Unexpected engine call before user confirmation');};
const {execute}=require('./import_calibrated.cjs');
(async()=>{
  await assert.rejects(execute(),/Awaiting explicit user approval/);
  assert.equal(calls,0);
  console.log('Missing-approval fixture rejected execution before any UE API calls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
