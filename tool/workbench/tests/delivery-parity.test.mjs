import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildDelivery,initialMapping,ueText} from '../src/delivery-model.mjs';
import {buildDelivery as original,initialMapping as oldMap} from './fixtures/legacy/delivery-model.mjs';
import {qualityEvents,normalize} from '../src/editing-model.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const seed=read('../public/data/score24-v05.json'),actor=read('./fixtures/legacy/engine-target-v05.json');
test('actor delivery matches 8017 properties and manifest exactly for all tiers',()=>{const mapping=initialMapping(seed.doc,actor);assert.deepEqual(mapping,oldMap(seed.doc,actor));mapping.G_RED5=2;for(const tier of ['high','medium','low']){const events=qualityEvents(seed.doc,seed.profiles,tier);const actual=buildDelivery(seed.doc,events,'B4',actor,mapping);assert.deepEqual(actual,original(seed.doc,events,'B4',actor,mapping));assert.equal(actual.properties.EffectTemplate.Entries.length,events.filter(e=>e.pointId==='B4').length);assert(ueText(actual.properties.EffectTemplate).startsWith('('));}assert.equal(buildDelivery(seed.doc,seed.doc.events,'B4',actor,{}).properties,null);});
