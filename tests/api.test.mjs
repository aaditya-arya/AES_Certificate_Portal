import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/sqlite.js';
import {handleApi} from '../server/api.js';
import {newReport} from '../src/model.js';
import {randomizeSampleReport} from '../src/sample-data.js';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7z8AAAAASUVORK5CYII=';
const fixture=()=>randomizeSampleReport({photos:[{id:'photo',data:image,caption:'Test',name:'test.png'}]},null,()=>0.4);
function client(db,options={}){return async(method,path,data,headers={})=>{const response=await handleApi(new Request(`http://localhost/api/v1${path}`,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})}),db,options);return {status:response.status,headers:response.headers,body:response.status===204?null:await response.json()};};}
test('CRUD is durable, versioned, searchable and records deletions without resurrecting retired IDs',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'aes-sql-test-')),filename=join(directory,'reports.sqlite');let db=openDatabase(filename),api=client(db);const report=newReport();
 try{
  let result=await api('POST','/reports',report);assert.equal(result.status,201);assert.equal(result.headers.get('etag'),'"1"');
  assert.equal((await api('GET','/dashboard')).body.data.remaining,1);
  report.client='KEEP THIS CLIENT';result=await api('PUT',`/reports/${report.id}`,report,{'If-Match':'"1"'});assert.equal(result.status,200);
  assert.equal((await api('PUT',`/reports/${report.id}`,{...report,client:'stale'},{'If-Match':'"1"'})).status,409);
  db.close();db=openDatabase(filename);api=client(db);assert.ok(existsSync(filename));assert.equal((await api('GET',`/reports/${report.id}`)).body.data.report.client,'KEEP THIS CLIENT');
  assert.equal((await api('GET','/reports?q=KEEP&searchBy=client')).body.meta.total,1);assert.equal((await api('GET',"/reports?q='OR%201%3D1--")).body.meta.total,0);
  assert.equal((await api('DELETE',`/reports/${report.id}`,null,{'If-Match':'"1"'})).status,409);assert.equal((await api('DELETE',`/reports/${report.id}`,null,{'If-Match':'"2"'})).status,204);
  assert.equal((await api('GET',`/reports/${report.id}`)).status,404);assert.equal((await api('POST','/reports',report)).body.error.code,'ID_RETIRED');
  const events=(await api('GET','/changes?after=0')).body;assert.deepEqual(events.data.map(event=>event.operation),['created','updated','deleted']);assert.equal(events.meta.nextAfter,3);
 }finally{db.close();}
});
test('all fields, extended rows, photos and signatures round-trip through SQLite and JSON export',async()=>{
 const db=openDatabase(':memory:'),api=client(db),report=fixture();report.inspectorSignature=image;report.reviewerSignature=image;report.createdAt='2026-01-02T03:04:05.000Z';
 try{
  assert.equal((await api('POST','/reports',report)).status,201);const detail=(await api('GET',`/reports/${report.id}`)).body.data;
  assert.equal(detail.report.photos[0].data,image);assert.equal(detail.report.inspectorSignature,image);assert.deepEqual(detail.report.equipment,report.equipment);assert.deepEqual(detail.report.documents,report.documents);
  assert.equal(detail.report.createdAt,report.createdAt);assert.equal(detail.derived.requester,report.client);assert.ok(detail.derived.openingParagraph.includes(report.state));
  assert.equal((await db.get('SELECT count(*) AS n FROM media_blobs')).n,1,'Identical image bytes are deduplicated');assert.equal((await db.get('SELECT count(*) AS n FROM report_media')).n,3);
  const exported=await api('GET',`/reports/${report.id}/export`);assert.equal(exported.body.schemaVersion,'1.0');assert.deepEqual(exported.body.data.report.photos,report.photos);
  assert.equal((await api('GET','/dashboard')).body.data.draft,1);report.status='ready';assert.equal((await api('PUT',`/reports/${report.id}`,report,{'If-Match':'"1"'})).status,200);assert.equal((await api('GET','/dashboard')).body.data.completed,1);
  assert.equal((await api('DELETE',`/reports/${report.id}`,null,{'If-Match':'"2"'})).status,204);assert.equal((await db.get('SELECT count(*) AS n FROM media_blobs')).n,0);
 }finally{db.close();}
});
test('concurrent editors cannot partially replace each other’s rows or images',async()=>{
 const db=openDatabase(':memory:'),api=client(db),report=fixture();try{
  await api('POST','/reports',report);const [a,b]=await Promise.all([api('PUT',`/reports/${report.id}`,{...report,client:'Editor A'},{'If-Match':'"1"'}),api('PUT',`/reports/${report.id}`,{...report,client:'Editor B'},{'If-Match':'"1"'})]);assert.deepEqual([a.status,b.status].sort(),[200,409]);const detail=(await api('GET',`/reports/${report.id}`)).body.data;assert.equal(detail.version,2);assert.equal(detail.report.photos[0].data,image);assert.equal((await api('GET','/changes')).body.data.length,2);
 }finally{db.close();}
});
test('API rejects malformed reports, unsafe images, unreviewable completed reports and unauthorized integrations',async()=>{
 const db=openDatabase(':memory:'),api=client(db,{apiKey:'test-only-integration-key'});try{
  assert.equal((await api('POST','/reports',{...newReport(),status:'ready'})).status,422);assert.equal((await api('POST','/reports',{...newReport(),persons:'bad'})).status,422);assert.equal((await api('POST','/reports',{...fixture(),inspectorSignature:'https://example.com/image.png'})).status,422);
  const report=newReport();await api('POST','/reports',report);assert.equal((await api('PUT',`/reports/${report.id}`,report)).status,428);assert.equal((await api('GET','/reports?offset=Infinity')).status,400);
  assert.equal((await api('GET','/integration/reports')).status,401);assert.equal((await api('GET','/integration/reports',null,{Authorization:'Bearer test-only-integration-key'})).status,200);
  assert.equal((await api('GET','/reports',null,{Origin:'https://untrusted.example'})).status,403);
  const schema=(await api('GET','/openapi.json')).body;assert.equal(schema.openapi,'3.1.0');assert.ok(schema.paths['/reports/{id}/export']);
 }finally{db.close();}
});
