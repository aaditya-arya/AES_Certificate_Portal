import {readFile} from 'node:fs/promises';
import {newReport} from '../src/model.js';

// Test-only fixtures enter IndexedDB directly; no import/export feature is exposed.
export async function seedSample(page,overrides={}) {
  const report=newReport();
  Object.assign(report,{reportNo:'AES/UX/REFERENCE/001',client:'M/s. Reference Client Limited',project:'Transformer inspection',manufacturer:'M/s. Reference Factory Limited',area:'Airoli',state:'Maharashtra',inspectionDate:'2026-11-07',reportDate:'2026-11-12',stages:['Final Inspection'],inspector:'Reference Inspector',reviewer:'Reference Reviewer',inspectorDate:'2026-11-07',reviewerDate:'2026-11-07'});
  Object.assign(report.persons[0],{name:'Reference Attendee',organization:'Reference Factory'});
  Object.assign(report.equipment[0],{itemNo:'1',description:'100/125MVA Transformer',poQty:'02 Nos.',offeredQty:'01 No.',inspectedQty:'01 No.'});
  Object.assign(report.documents[0],{description:'Schedule of tests',number:'DOC-001',revision:'02',date:'2026-11-07',status:'Approved'});
  Object.assign(report.activities[0],{clause:'4.1',description:'Electrical clearance verification',quantum:'100%',scope:'W'});
  Object.assign(report.calibration[0],{instrument:'Measuring tape',identity:'MT-11',date:'2026-01-01',due:'2026-12-31',traceability:'NABL'});
  Object.assign(report.expenses[0],{date:'2026-11-07',entry:'09:30',exit:'17:03',travel:'01 Hr.',km:'12'});
  report.photos=await Promise.all(Array.from({length:8},async(_,i)=>({id:crypto.randomUUID(),name:`photo-${i+1}.jpeg`,caption:`Inspection photograph ${i+1}`,data:`data:image/jpeg;base64,${(await readFile(`public/example/photo-${i+1}.jpeg`)).toString('base64')}`})));
  Object.assign(report,overrides);
  await page.getByText('Saved locally',{exact:true}).waitFor();
  await page.evaluate(report=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('keyval-store',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('keyval');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,transaction=db.transaction('keyval','readwrite'),store=transaction.objectStore('keyval');
      const existing=store.get('aes-reports-v1');
      existing.onsuccess=()=>store.put([report,...(existing.result||[])],'aes-reports-v1');
      transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>{db.close();reject(transaction.error);};
    };
  }),report);
  await page.reload();
  await page.locator('.report-link').filter({hasText:report.reportNo}).click();
  await page.getByLabel('Client name',{exact:true}).waitFor();
}
