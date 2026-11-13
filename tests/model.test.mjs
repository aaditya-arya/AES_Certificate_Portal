import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newReport,narrative,generalRows,location,displayDate,issues,parseDateToIso,progress,stepDone,hydrateReport,searchReportFields,defaultActivityDetails,activityDetailsText,filterReports} from '../src/model.js';

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
test('typed and calendar dates normalize only when the real calendar date exists',()=>{
 assert.equal(parseDateToIso('7.11.2026'),'2026-11-07');assert.equal(parseDateToIso('07/11/2026'),'2026-11-07');assert.equal(parseDateToIso('2026-11-07'),'2026-11-07');
 for(const value of ['31.02.2026','2026-02-29','31.04.2026','2026-13-01','11.11.26','00.01.2026'])assert.equal(parseDateToIso(value),'',value);
 assert.equal(parseDateToIso('29.02.2028'),'2028-02-29');
 const r=newReport();r.reportDate='31.02.2026';assert.ok(issues(r).some(x=>x.path==='reportDate'));
});
test('default text does not complete an unreviewed step, and an invalidated step loses completion',()=>{
 const r=newReport();assert.equal(progress(r),0);assert.equal(stepDone(r,2),false);r.completedSteps=[2,3,4];assert.equal(progress(r),43);assert.equal(stepDone(r,4),true,'Photographs are optional, but their step is reviewed explicitly');r.conclusion='';assert.equal(stepDone(r,3),false);assert.equal(progress(r),29);
});
test('field search finds labels and values in hidden steps, tables and photographs',()=>{
 const r=newReport();r.documents[0].number='DOC-UNIQUE-987';r.photos=[{id:'p1',caption:'Transformer clearance side view',name:'inspection.jpg'}];r.reviewer='Unique Reviewer';
 assert.equal(searchReportFields(r,'DOC-UNIQUE-987')[0].section,1);assert.equal(searchReportFields(r,'reviewer name')[0].path,'reviewer');assert.equal(searchReportFields(r,'clearance side')[0].path,'photos.p1.caption');assert.ok(searchReportFields(r,'calibration due').some(x=>x.path.endsWith('.due')));assert.equal(searchReportFields(r,'zzzxxyyy').length,0);
});
test('legacy reports retain their custom activity text and data during hydration',()=>{
 const raw={...newReport(),activityDetails:'Existing inspection findings',client:'Legacy client'};delete raw.activityDetailsMode;delete raw.completedSteps;
 const r=hydrateReport(raw);assert.equal(r.client,'Legacy client');assert.equal(r.activityDetailsMode,'custom');assert.equal(activityDetailsText(r),'Existing inspection findings');assert.equal(progress(r),0);
 const fresh=newReport();assert.equal(activityDetailsText(fresh),defaultActivityDetails);assert.ok(defaultActivityDetails.includes('As per QAP S. No. B 4.4:'));
});

test('a legacy Ready report with invalid data returns to draft without losing its values',()=>{
 const raw={...newReport(),status:'ready',reportDate:'31.02.2026',client:'Retain this client'};delete raw.completedSteps;
 const migrated=hydrateReport(raw);assert.equal(migrated.status,'draft');assert.equal(migrated.reportDate,'31.02.2026');assert.equal(migrated.client,'Retain this client');assert.ok(!migrated.completedSteps.includes(6));
});

test('report filters combine selected-field search, accreditation, stage, status and inclusive visit dates',()=>{
 const a={...newReport(),reportNo:'AES/001',client:'Copper Client',project:'Transformer project',state:'Maharashtra',inspectionDate:'2026-11-07',status:'ready',stages:['Final Inspection']};a.calibration[0].traceability='NABL';a.equipment[0].description='Power transformer';a.documents[0].number='UNIQUE-DOC-12';
 const b={...newReport(),reportNo:'AES/002',client:'Steel Client',project:'Copper project',state:'Gujarat',inspectionDate:'2026-11-10',stages:['Pre-Shipment Inspection']};b.calibration[0].traceability='NPL';
 const c={...newReport(),reportNo:'AES/003',inspectionDate:''};const reports=[a,b,c];
 assert.deepEqual(filterReports(reports,{search:'copper',searchBy:'client'}),[a]);assert.deepEqual(filterReports(reports,{search:'copper',searchBy:'project'}),[b]);assert.deepEqual(filterReports(reports,{search:'unique-doc-12'}),[a]);assert.deepEqual(filterReports(reports,{search:'power transformer',searchBy:'equipment'}),[a]);assert.deepEqual(filterReports(reports,{search:'Maharashtra',searchBy:'location'}),[a]);
 assert.deepEqual(filterReports(reports,{search:'  COPPER client ',searchBy:'client',accreditation:'NABL',stage:'Final Inspection',status:'ready',dateFrom:'2026-11-07',dateTo:'2026-11-07'}),[a]);assert.deepEqual(filterReports(reports,{accreditation:'NPL',status:'draft',dateFrom:'2026-11-08'}),[b]);assert.deepEqual(filterReports(reports,{status:'ready',stage:'Pre-Shipment Inspection'}),[]);assert.deepEqual(filterReports(reports,{dateTo:'2026-11-07'}),[a]);assert.deepEqual(filterReports(reports),reports);
});
