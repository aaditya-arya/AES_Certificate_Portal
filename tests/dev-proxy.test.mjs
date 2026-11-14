import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createTestVite} from './vite-server.mjs';
import config from '../vite.config.js';
import {startServer} from '../server/index.js';

test('development proxy preserves browser origins for localhost and 127.0.0.1 without permitting other sites',async()=>{
 const api=startServer({port:0,database:':memory:'});await once(api.server,'listening');
 const proxy=config.server.proxy['/api'];
 const vite=await createTestVite({configFile:false,server:{proxy:{'/api':{...proxy,target:`http://127.0.0.1:${api.server.address().port}`}}}});
 try{
  await vite.listen();const port=vite.httpServer.address().port;
  for(const host of ['127.0.0.1','localhost']){
   const origin=`http://${host}:${port}`;
   const response=await fetch(`${origin}/api/v1/reports`,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});
   assert.equal(response.status,201,`${origin}: ${await response.text()}`);
  }
  const blocked=await fetch(`http://127.0.0.1:${port}/api/v1/reports`,{method:'POST',headers:{Origin:'https://unrelated.example','Content-Type':'application/json'},body:'{}'});
  assert.equal(blocked.status,403);
 }finally{await vite.close();await api.close();}
});
