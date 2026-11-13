import {createInterface} from 'node:readline';
import assert from 'node:assert/strict';
import {newReport} from '../src/model.js';

// Credentials are supplied through hidden stdin and never persisted.
console.log('Ready for hosted verification JSON on stdin (input is hidden).');
const terminal=createInterface({input:process.stdin,terminal:false});
const input=await new Promise(resolve=>terminal.once('line',resolve));terminal.close();
const {url,token}=JSON.parse(input),origin=new URL(url).origin;
const call=(path,options={})=>fetch(`${origin}/api/v1${path}`,{...options,redirect:'error',headers:{'OAI-Sites-Authorization':`Bearer ${token}`,...options.headers}});
const report=newReport();report.reportNo=`DEPLOY-CHECK-${crypto.randomUUID()}`;report.client='Temporary deployment verification';
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7z8AAAAASUVORK5CYII=';
report.photos=[{id:'check-photo',name:'check.png',caption:'Temporary storage verification',data:image}];
let created=false;
try{
 const health=await call('/health');assert.equal(health.status,200);assert.equal((await health.json()).data.storage,'d1');
 const response=await call('/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});assert.equal(response.status,201);created=true;
 const detail=await call(`/reports/${report.id}`);assert.equal(detail.status,200);const saved=(await detail.json()).data;assert.equal(saved.report.client,report.client);assert.equal(saved.report.photos[0].data,image);
 const media=await call(`/reports/${report.id}/media/photo-check-photo`);assert.equal(media.status,200);assert.equal(media.headers.get('Content-Type'),'image/png');
 const schema=await call('/openapi.json');assert.equal(schema.status,200);assert.equal((await schema.json()).openapi,'3.1.0');
 console.log('Hosted D1 report, R2 photograph, media download and OpenAPI verification passed.');
}finally{
 if(created){const deleted=await call(`/reports/${report.id}`,{method:'DELETE',headers:{'If-Match':'"1"'}});assert.equal(deleted.status,204);assert.equal((await call(`/reports/${report.id}`)).status,404);console.log('Temporary test report and image removed.');}
}
