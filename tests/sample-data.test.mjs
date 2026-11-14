import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomizeSampleReport} from '../src/sample-data.js';
import {newReport,blankRow,columns,issues,defaultActivityDetails} from '../src/model.js';

const reference={photos:[{id:'ref-a',data:'photo-a',caption:'Reference A',name:'a.jpg'},{id:'ref-b',data:'photo-b',caption:'Reference B',name:'b.jpg'}]};

test('fresh random scenarios use coherent dates, quantities and the original report structure',()=>{
 const early=randomizeSampleReport(reference,null,()=>0.1),late=randomizeSampleReport(reference,null,()=>0.9);
 assert.notEqual(early.client,late.client);assert.notEqual(early.project,late.project);assert.notEqual(early.reportNo,late.reportNo);assert.notEqual(early.calibration[0].identity,late.calibration[0].identity);
 for(const report of [early,late]){
  assert.deepEqual(issues(report),[]);assert.equal(report.activityDetailsMode,'custom');assert.ok(report.activityDetails.includes('sample job'));assert.notEqual(report.activityDetails,defaultActivityDetails);assert.equal(report.status,'draft');assert.deepEqual(report.completedSteps,[]);
  assert.ok(report.vendorPODate<=report.aesPODate);assert.ok(report.aesPODate<report.notificationDate);assert.ok(report.notificationDate<report.inspectionDate);assert.ok(report.inspectionDate<=report.inspectorDate);assert.ok(report.inspectorDate<=report.reviewerDate);assert.ok(report.reviewerDate<=report.reportDate);
  for(const row of report.equipment){assert.ok(parseInt(row.poQty)>=parseInt(row.offeredQty));assert.ok(parseInt(row.offeredQty)>=parseInt(row.inspectedQty));assert.ok(parseInt(row.inspectedQty)>0);}
  for(const row of report.calibration){assert.ok(row.date<report.inspectionDate);assert.ok(row.due>report.inspectorDate);}
  assert.equal(report.inspectorSignature,'');assert.equal(report.reviewerSignature,'');
 }
});

test('filling retains every extended row and photo while populating all editable row cells',()=>{
 const target=newReport(),counts={equipment:7,documents:9,activities:11,calibration:5,expenses:8,persons:6};
 for(const [type,count]of Object.entries(counts))target[type]=Array.from({length:count},()=>blankRow(type));
 target.photos=[{id:'my-photo',data:'my-upload',caption:'My old caption',name:'my-photo.jpg'}];const before=structuredClone(target);
 const report=randomizeSampleReport(reference,target,()=>0.4);
 assert.deepEqual(target,before,'Creating sample data must not mutate the original report.');assert.deepEqual(issues(report),[]);
 for(const [type,count]of Object.entries(counts)){
  assert.equal(report[type].length,count,type);assert.deepEqual(report[type].map(row=>row.id),target[type].map(row=>row.id),`${type} row identities`);
  for(const row of report[type])for(const [key]of columns[type])assert.ok(String(row[key]).trim(),`${type}.${key} is filled`);
 }
 assert.equal(report.photos.length,1);assert.equal(report.photos[0].id,'my-photo');assert.equal(report.photos[0].data,'my-upload');assert.notEqual(report.photos[0].caption,'My old caption');assert.ok(report.photos[0].caption.startsWith('SAMPLE JOB'));
 assert.equal(Number(report.duration),counts.expenses);assert.ok(report.expenses.every(row=>row.date>=report.inspectionDate&&row.date<=report.inspectorDate));
});
