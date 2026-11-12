import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newReport,narrative,generalRows,location,displayDate,issues,validateImport} from '../src/model.js';

test('each repeatable data table starts with one row while metadata stays fixed',()=>{
 const r=newReport();for(const key of ['equipment','documents','activities','calibration','expenses','persons'])assert.equal(r[key].length,1,key);assert.equal(r.photos.length,0);assert.equal(generalRows(r).length,10);
});
test('opening paragraph follows its source fields and stops at state',()=>{
 const r=newReport();Object.assign(r,{client:'M/s. Client',manufacturer:'M/s. Factory',street:'Factory road',area:'Airoli',city:'Navi Mumbai',state:'Maharashtra',postalCode:'400708',inspectionDate:'2026-11-07'});
 assert.equal(narrative(r),'As requested by M/s. Client inspection carried out at M/s. Factory, Airoli, Maharashtra On 07.11.2026 and scope of services as described below.');
 assert.equal(location(r,true),'M/s. Factory, Factory road, Airoli, Navi Mumbai, Maharashtra, 400708');
 r.client='Changed client';assert.ok(narrative(r).includes('Changed client'));r.requesterIsClient=false;r.requester='Other requester';r.locationIsManufacturer=false;r.locationOrganization='Other factory';assert.ok(narrative(r).includes('Other requester'));assert.ok(narrative(r).includes('Other factory'));
});
test('review catches missing captions and invalid calibration date order',()=>{
 const r=newReport();r.photos=[{caption:''}];r.calibration[0].date='2026-12-01';r.calibration[0].due='2026-01-01';assert.ok(issues(r).some(x=>x.section===4));assert.ok(issues(r).some(x=>x.message.includes('due date precedes')));assert.equal(displayDate('2026-11-07'),'07.11.2026');
});
test('backup import creates distinct draft IDs, preserves values, rejects unsafe images',()=>{
 const r=newReport();r.client='Keep me';r.status='ready';const a=validateImport({format:'aes-report-backup-v1',reports:[r]})[0];assert.equal(a.client,'Keep me');assert.equal(a.status,'draft');assert.notEqual(a.id,r.id);
 assert.throws(()=>validateImport({format:'aes-report-backup-v1',reports:[{...r,inspectorSignature:'https://external/image.jpg'}]}));assert.throws(()=>validateImport({reports:[r]}));
});
