import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Readable} from 'node:stream';
import {openDatabase} from './sqlite.js';
import {handleApi} from './api.js';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.ttf':'font/ttf','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
export function startServer({port=Number(process.env.PORT)||3001,host=process.env.HOST||'127.0.0.1',database=process.env.DATABASE_PATH||'data/aes-portal.sqlite',root=resolve('dist/client'),apiKey=process.env.API_KEY||'',password=process.env.PORTAL_PASSWORD||'',allowedOrigins=(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean)}={}){
 if(!['127.0.0.1','localhost','::1'].includes(host)&&!password)throw Error('Set PORTAL_PASSWORD before exposing the Node server beyond localhost.');
 const db=openDatabase(database);
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
   if(password){const basic=`Basic ${Buffer.from(`aes:${password}`).toString('base64')}`,token=apiKey&&req.headers.authorization===`Bearer ${apiKey}`;if(req.headers.authorization!==basic&&!(url.pathname.startsWith('/api/')&&token)){res.writeHead(401,{'WWW-Authenticate':'Basic realm="AES Portal"'});res.end('Sign in to AES Portal.');return;}}
   if(url.pathname.startsWith('/api/')){
    const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Readable.toWeb(req),duplex:'half'}:{})});const result=await handleApi(request,db,{apiKey,allowedOrigins});
    res.writeHead(result.status,Object.fromEntries(result.headers));if(result.body)Readable.fromWeb(result.body).pipe(res);else res.end();return;
   }
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   const pathname=decodeURIComponent(url.pathname),file=resolve(root,`.${pathname==='/'||/^\/reports\/[A-Za-z0-9_-]{1,300}\/?$/.test(pathname)?'/index.html':pathname}`);
   if(file!==root&&!file.startsWith(`${root}${sep}`)){res.writeHead(403);res.end();return;}
   let bytes;try{const info=await stat(file);if(!info.isFile())throw Error('not file');bytes=await readFile(file);}catch{res.writeHead(404);res.end('Not found. Run npm run build before npm start.');return;}
   res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch(error){console.error(error.message);if(!res.headersSent)res.writeHead(500);res.end('The request failed.');}
 });
 server.listen(port,host,()=>{console.log(`AES Node.js portal: http://${host}:${server.address().port}`);console.log(`SQL database: ${db.filename}`);});
 return {server,db,close:()=>new Promise(resolve=>server.close(()=>{db.close();resolve();}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const running=startServer();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>running.close().then(()=>process.exit(0)));}
