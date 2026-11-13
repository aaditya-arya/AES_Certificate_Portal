import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {openDatabase} from '../server/sqlite.js';
import {newReport} from '../src/model.js';
import {newDocument} from '../src/document-model.js';
test('hosted Worker serves the plain frontend and persists reports and images through SQL/R2 bindings',{skip:!existsSync('dist/server/index.js')},async()=>{
 const {default:worker}=await import('../dist/server/index.js'),db=openDatabase(':memory:'),objects=new Map();
 const prepare=(sql,params=[])=>({sql,params,bind(...values){return prepare(sql,values);},first:()=>db.get(sql,params),all:async()=>({results:await db.all(sql,params)})});
 const env={DB:{prepare,batch:async statements=>(await db.batch(statements)).map(result=>({meta:{changes:result.changes}}))},BUCKET:{put:async(key,value)=>objects.set(key,new Uint8Array(value)),get:async key=>objects.has(key)?{arrayBuffer:async()=>objects.get(key).slice().buffer}:null,delete:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);},list:async({prefix})=>({objects:[...objects.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key})),truncated:false})}};
 const call=(path,options={})=>worker.fetch(new Request(`https://portal.example${path}`,options),env);
 try{
  const home=await call('/');assert.equal(home.status,200);assert.ok(gunzipSync(new Uint8Array(await home.arrayBuffer())).toString().includes('/assets/index-'));
  assert.equal((await(await call('/api/v1/health')).json()).data.storage,'d1');
  const report=newReport(),image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7z8AAAAASUVORK5CYII=';report.photos=[{id:'hosted-photo',data:image,name:'hosted.png',caption:'Hosted image round-trip'}];
  const created=await call('/api/v1/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});assert.equal(created.status,201);assert.equal(objects.size,1);assert.equal((await db.get('SELECT count(*) AS n FROM media_blobs')).n,0);
  const detail=await(await call(`/api/v1/reports/${report.id}`)).json();assert.equal(detail.data.report.photos[0].data,image);
  const document=newDocument('flash',report.id);document.attachments=[{id:crypto.randomUUID(),name:'document.png',data:image,caption:'Document evidence'}];
  const docCreated=await call('/api/v1/documents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(document)});assert.equal(docCreated.status,201);assert.equal(objects.size,2);
  const saved=(await docCreated.json()).data;assert.equal(saved.context.reportId,report.id);assert.equal((await call(`/api/v1/documents/${saved.id}/files/${saved.attachments[0].id}`)).status,200);
  assert.equal((await call(`/api/v1/reports/${report.id}`,{method:'DELETE',headers:{'If-Match':'"1"'}})).status,409);
  assert.equal((await call(`/api/v1/documents/${saved.id}`,{method:'DELETE',headers:{'If-Match':'"1"'}})).status,204);assert.equal(objects.size,1);
  assert.equal((await call(`/api/v1/reports/${report.id}`,{method:'DELETE',headers:{'If-Match':'"1"'}})).status,204);assert.equal(objects.size,0);
 }finally{db.close();}
});
