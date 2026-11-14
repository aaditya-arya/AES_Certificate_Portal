import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/sqlite.js';
import {handleApi} from '../server/api.js';
import {newReport} from '../src/model.js';
import {newDocument} from '../src/document-model.js';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7z8AAAAASUVORK5CYII=';
function setup(bucket=null){const db=openDatabase(':memory:');const call=async(method,path,body,version)=>{const response=await handleApi(new Request(`http://localhost/api/v1${path}`,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(version?{'If-Match':`"${version}"`}:{})},...(body?{body:JSON.stringify(body)}:{})}),db,{bucket});const value=response.status===204?null:response.headers.get('content-type')?.includes('application/json')?await response.json():new Uint8Array(await response.arrayBuffer());return {status:response.status,body:value,headers:response.headers};};return {db,call};}
const fields=record=>Object.fromEntries(Object.keys(newDocument(record.type)).map(key=>[key,record[key]]));
async function fixture(call,type){const report=newReport();report.reportNo='AES/RELATED/001';report.client='TEST CLIENT';report.manufacturer='TEST VENDOR';await call('POST','/reports',report);const document=newDocument(type,report.id);document.preparedBy='Inspector';document.reviewedBy='Reviewer';document.summary='Inspection findings';document.result='Accepted';document.certificateScope='Transformer release';document.releaseDecision='Released';document.referenceDocuments='QAP clause 4';document.owner='Vendor engineer';document.items[0].description='Transformer CCA';for(const key of ['summary','result','certificateScope','releaseDecision','referenceDocuments','owner'])if(!Object.hasOwn(newDocument(type),key))delete document[key];if(type==='ncr')Object.assign(document,{title:'TEST NCR',itemName:'TEST transformer',attachments:[{id:crypto.randomUUID(),name:'TEST-ncr.png',data:image,caption:'TEST NCR file',purpose:'ncr-report'}]});if(type==='irc')Object.assign(document,{result:'Accepted',attachments:['signed-packing-list','reporter-signature'].map(purpose=>({id:crypto.randomUUID(),name:purpose+'.png',data:image,caption:purpose,purpose}))});if(type==='flash')Object.assign(document,{nonconformance:'NIL',outstanding:'NIL',actionBy:'None',attachments:Array.from({length:3},(_,i)=>({id:crypto.randomUUID(),name:`evidence-${i}.png`,caption:`Evidence ${i+1}`,data:image}))});return {report,document};}

test('new document migrations preserve an existing inspection database and enforce document-number uniqueness',async()=>{
 const path=join(mkdtempSync(join(tmpdir(),'aes-upgrade-')),'portal.sqlite'),old=new DatabaseSync(path);old.exec(readFileSync('drizzle/0000_swift_yellowjacket.sql','utf8'));old.exec('CREATE TABLE node_migrations(name TEXT PRIMARY KEY)');old.prepare('INSERT INTO node_migrations(name) VALUES(?)').run('0000_swift_yellowjacket.sql');
 const report=newReport(),now=new Date().toISOString();report.client='EXISTING SQL CLIENT';old.prepare('INSERT INTO reports(id,document,version,mutation_id,workflow,report_no,client,project,inspection_date,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(report.id,JSON.stringify(report),1,'existing','remaining','','EXISTING SQL CLIENT','','','draft',now,now);old.close();
 const db=openDatabase(path);try{assert.equal((await db.get('SELECT client FROM reports WHERE id=?',[report.id])).client,'EXISTING SQL CLIENT');assert.equal((await db.get('SELECT count(*) AS n FROM inspection_documents')).n,0);assert.equal((await db.get("SELECT count(*) AS n FROM sqlite_master WHERE name='documents_number_unique'")).n,1);}finally{db.close();}
});

test('simultaneous document edits cannot combine different versions or leak attachment references',async()=>{
 const {db,call}=setup();try{const {document}=await fixture(call,'flash');document.attachments=[];const created=(await call('POST','/documents',document)).body.data;
 const a=fields(created),b=structuredClone(a);a.summary='EDITOR A';b.summary='EDITOR B';a.attachments=[{id:crypto.randomUUID(),name:'a.png',data:image}];b.attachments=[{id:crypto.randomUUID(),name:'b.png',data:image}];
 const outcomes=await Promise.all([call('PUT',`/documents/${created.id}`,a,1),call('PUT',`/documents/${created.id}`,b,1)]);assert.deepEqual(outcomes.map(item=>item.status).sort(),[200,409]);const saved=(await call('GET',`/documents/${created.id}`)).body.data;assert.equal(saved.version,2);assert.equal(saved.attachments.length,1);assert.equal((await db.get('SELECT count(*) AS n FROM document_files')).n,1);assert.equal((await call('GET',`/documents/${created.id}/history`)).body.data.length,2);
 }finally{db.close();}
});

test('all four modules round-trip with links, search, optimistic versions and immutable issued records',async()=>{
 const {db,call}=setup();try{for(const type of ['flash','irc','punch','ncr']){
  const {report,document}=await fixture(call,type);const created=await call('POST','/documents',document);assert.equal(created.status,201,JSON.stringify(created.body));let saved=created.body.data;assert.equal(saved.context.reportNo,report.reportNo);assert.equal(saved.version,1);
  assert.equal((await call('GET',`/documents?type=${type}&q=TEST%20VENDOR`)).body.meta.total,1);assert.equal((await call('GET',`/documents?type=${type}&q=%25`)).body.meta.total,0);assert.equal((await call('GET',`/documents?type=${type}&q=preparedBy`)).body.meta.total,0);
  assert.equal((await call('PUT',`/documents/${saved.id}`,fields(saved))).status,428);
  saved=(await call('PUT',`/documents/${saved.id}`,fields(saved),1)).body.data;assert.equal(saved.version,2);assert.equal((await call('PUT',`/documents/${saved.id}`,fields(saved),1)).status,409);
  const issued=await call('POST',`/documents/${saved.id}/transitions`,{action:'issue'},2);assert.equal(issued.status,200,JSON.stringify(issued.body));saved=issued.body.data;assert.equal(saved.status,['punch','ncr'].includes(type)?'open':'issued');
  if(saved.status==='issued')assert.equal((await call('PUT',`/documents/${saved.id}`,fields(saved),3)).body.error.code,'DOCUMENT_LOCKED');
  assert.equal((await call('DELETE',`/reports/${report.id}`,null,1)).body.error.code,'LINKED_DOCUMENTS');
  assert.equal((await call('GET',`/documents/${saved.id}/versions/2`)).body.data.status,'draft');assert.equal((await call('GET',`/documents/${saved.id}/history`)).body.data.length,3);
 }assert.equal((await call('GET','/document-changes?after=0')).body.data.length,12);}finally{db.close();}
});

test('Flash revisions and cancellation retain issued snapshots; Punch/NCR closure and reopening validate evidence',async()=>{
 const {db,call}=setup();try{
  let {document}=await fixture(call,'flash');let saved=(await call('POST','/documents',document)).body.data;
  saved=(await call('POST',`/documents/${saved.id}/transitions`,{action:'issue'},1)).body.data;
  saved=(await call('POST',`/documents/${saved.id}/transitions`,{action:'revise'},2)).body.data;assert.equal(saved.revision,'01');assert.equal(saved.status,'draft');assert.equal((await call('GET',`/documents/${saved.id}/versions/2`)).body.data.status,'issued');
  assert.equal(saved.summary,'');assert.equal(saved.result,'');assert.equal(saved.attachments.length,0);assert.equal(saved.items[0].description,'');assert.equal((await call('GET',`/documents/${saved.id}/versions/2`)).body.data.attachments.length,3);const fresh=(await fixture(call,'flash')).document;Object.assign(saved,{summary:fresh.summary,result:fresh.result,nonconformance:fresh.nonconformance,outstanding:fresh.outstanding,actionBy:fresh.actionBy,items:fresh.items,attachments:fresh.attachments});saved=(await call('PUT',`/documents/${saved.id}`,fields(saved),3)).body.data;saved=(await call('POST',`/documents/${saved.id}/transitions`,{action:'issue'},4)).body.data;assert.equal((await call('POST',`/documents/${saved.id}/transitions`,{action:'cancel-issue'},5)).status,422);
  saved=(await call('POST',`/documents/${saved.id}/transitions`,{action:'cancel-issue',note:'Correction requested'},5)).body.data;assert.equal(saved.status,'draft');
  for(const type of ['punch','ncr']){
   ({document}=await fixture(call,type));saved=(await call('POST','/documents',document)).body.data;saved=(await call('POST',`/documents/${saved.id}/transitions`,{action:'issue'},1)).body.data;
   assert.equal((await call('POST',`/documents/${saved.id}/transitions`,{action:'request-close'},2)).body.error.code,'CLOSURE_INCOMPLETE');
   saved.closedDate='2026-11-13';saved.verification='Evidence reviewed';if(type==='ncr'){saved.cause='Torque setting';saved.correctiveAction='Re-torqued to QAP';}saved.items[0].status='closed';saved.items[0].resolution='Verified corrected';
   saved=(await call('PUT',`/documents/${saved.id}`,fields(saved),2)).body.data;saved=(await call('POST',`/documents/${saved.id}/transitions`,{action:'request-close'},3)).body.data;assert.equal(saved.status,'closure_requested');assert.equal((await call('PUT',`/documents/${saved.id}`,fields(saved),4)).body.error.code,'DOCUMENT_LOCKED');saved=(await call('POST',`/documents/${saved.id}/transitions`,{action:'close'},4)).body.data;assert.equal(saved.status,'closed');
   assert.equal((await call('POST',`/documents/${saved.id}/transitions`,{action:'reopen'},5)).status,422);saved=(await call('POST',`/documents/${saved.id}/transitions`,{action:'reopen',note:'Additional defect found'},5)).body.data;assert.equal(saved.status,'open');assert.equal(saved.closedDate,'');
  }
 }finally{db.close();}
});

test('attachments remain versioned, export binary data, prevent cross-document access and clean SQL/R2 on draft deletion',async()=>{
 for(const hosted of [false,true]){
  const objects=new Map(),bucket=hosted?{put:async(key,bytes)=>objects.set(key,new Uint8Array(bytes)),get:async key=>objects.has(key)?{arrayBuffer:async()=>objects.get(key).slice().buffer}:null,list:async({prefix})=>({objects:[...objects.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key})),truncated:false}),delete:async keys=>{for(const key of keys)objects.delete(key);}}:null;
  const {db,call}=setup(bucket);try{
   const {document}=await fixture(call,'flash');document.attachments=[{id:crypto.randomUUID(),name:'inspection.png',data:image,caption:'Inspection evidence'}];let saved=(await call('POST','/documents',document)).body.data;
   const fileId=saved.attachments[0].id;assert.equal((await call('GET',`/documents/${saved.id}/export`)).body.data.attachments[0].data,image);assert.equal((await call('GET',`/documents/${saved.id}/files/${fileId}`)).status,200);
   saved.attachments=[];saved=(await call('PUT',`/documents/${saved.id}`,fields(saved),1)).body.data;assert.equal((await call('GET',`/documents/${saved.id}/files/${fileId}`)).status,404);assert.equal((await call('GET',`/documents/${saved.id}/files/${fileId}?version=1`)).status,200);
   assert.equal((await call('DELETE',`/documents/${saved.id}`,null,2)).status,204);assert.equal((await db.get('SELECT count(*) AS n FROM document_files')).n,0);assert.equal(objects.size,0);assert.equal((await call('POST','/documents',document)).body.error.code,'ID_RETIRED');
  }finally{db.close();}
 }
});

test('release safeguards and invalid links, statuses, files, transitions and duplicate numbers are rejected',async()=>{
 const {db,call}=setup();try{
  const {report,document}=await fixture(call,'ncr');let ncr=(await call('POST','/documents',document)).body.data;await call('POST',`/documents/${ncr.id}/transitions`,{action:'issue'},1);
  const irc=newDocument('irc',report.id);Object.assign(irc,{result:'Accepted',attachments:['signed-packing-list','reporter-signature'].map(purpose=>({id:crypto.randomUUID(),name:purpose+'.png',data:image,caption:purpose,purpose})),preparedBy:'Inspector',reviewedBy:'Reviewer',releaseDecision:'Released',certificateScope:'Transformer'});irc.items[0].description='Transformer';let saved=(await call('POST','/documents',irc)).body.data;
  assert.equal((await call('POST',`/documents/${saved.id}/transitions`,{action:'issue'},1)).body.error.code,'OPEN_QUALITY_ITEMS');
  const duplicate={...irc,attachments:irc.attachments.map(f=>({...f,id:crypto.randomUUID()})),id:crypto.randomUUID(),number:saved.number,numberingMode:'manual'};assert.equal((await call('POST','/documents',duplicate)).status,409);
  assert.equal((await call('POST','/documents',{...irc,id:crypto.randomUUID(),number:'INVALID',reportId:'missing'})).status,422);
  assert.equal((await call('PUT',`/documents/${saved.id}`,{...fields(saved),status:'issued'},1)).status,422);
  assert.equal((await call('POST','/documents',{...irc,id:crypto.randomUUID(),number:'BAD FILE',attachments:[{id:crypto.randomUUID(),name:'fake.pdf',data:'data:application/pdf;base64,SGVsbG8='}]})).status,422);
  assert.equal((await call('POST',`/documents/${saved.id}/transitions`,{action:'close'},1)).status,409);
  assert.equal((await call('GET','/documents?limit=10000')).status,400);
 }finally{db.close();}
});
