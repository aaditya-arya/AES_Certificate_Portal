import {ApiError,fail,normalizeReport,validId} from './validation.js';
import {repository} from './repository.js';
import {getOpenapi} from './openapi.js';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const expected=request=>{const raw=request.headers.get('If-Match');if(!raw)fail(428,'VERSION_REQUIRED','Send If-Match with the report version.');const match=/^(?:"(\d+)"|(\d+))$/.exec(raw);if(!match)fail(400,'INVALID_VERSION','If-Match must contain a numeric version.');return Number(match[1]||match[2]);};
async function body(request){
 if(!request.headers.get('content-type')?.includes('application/json'))fail(415,'JSON_REQUIRED','Use Content-Type: application/json.');
 const limit=32*1024*1024,reader=request.body?.getReader();if(!reader)fail(400,'INVALID_JSON','The JSON body is empty.');const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();fail(413,'BODY_TOO_LARGE','A report request can contain at most 32 MB.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let position=0;for(const chunk of chunks){bytes.set(chunk,position);position+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail(400,'INVALID_JSON','Send valid JSON.');}
}
export async function handleApi(request,db,{bucket=null,apiKey='',allowedOrigins=[]}={}){
 const url=new URL(request.url),origin=request.headers.get('Origin');const allowed=origin&&(origin===url.origin||allowedOrigins.includes(origin));
 const cors=allowed?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Expose-Headers':'ETag','Access-Control-Allow-Headers':'Content-Type, If-Match, Authorization','Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, OPTIONS'}:{};
 try{
  if(origin&&!allowed)fail(403,'ORIGIN_NOT_ALLOWED','This browser origin is not allowed.');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  let path=url.pathname.replace(/\/$/,'');
  if(path.startsWith('/api/v1/integration/')){
   if(!apiKey)fail(503,'INTEGRATION_NOT_CONFIGURED','Set API_KEY on the server to enable authenticated integration access.');
   if(request.headers.get('authorization')!==`Bearer ${apiKey}`)fail(401,'UNAUTHORIZED','A valid Bearer API key is required.');
   path=path.replace('/api/v1/integration/','/api/v1/');
  }
  const store=repository(db,bucket),method=request.method;
  if(path==='/api/v1/health'&&method==='GET'){await db.get('SELECT 1 AS ok');return json({data:{status:'ok',storage:db.kind||'d1',apiVersion:'1'}},200,cors);}
  if(path==='/api/v1/openapi.json'&&method==='GET')return json(getOpenapi(),200,cors);
  if(path==='/api/v1/dashboard'&&method==='GET')return json({data:await store.dashboard()},200,cors);
  if(path==='/api/v1/changes'&&method==='GET'){
   const after=Math.max(0,Number(url.searchParams.get('after'))||0),data=await store.changes(after,Number(url.searchParams.get('limit'))||100);return json({data,meta:{nextAfter:data.at(-1)?.sequence||after}},200,cors);
  }
  if(path==='/api/v1/reports'&&method==='GET'){for(const name of ['limit','offset'])if(url.searchParams.has(name)){const number=Number(url.searchParams.get(name));if(!Number.isSafeInteger(number)||number<(name==='limit'?1:0)||(name==='limit'&&number>100))fail(400,'INVALID_PAGINATION','Use limit 1–100 and a non-negative integer offset.');}const {items,...meta}=await store.list(url.searchParams);return json({data:items,meta},200,cors);}
  if(path==='/api/v1/reports'&&method==='POST'){
   const input=await body(request),normalized=normalizeReport(input),saved=await store.save(normalized,0);return json({data:saved},201,{...cors,ETag:`"${saved.version}"`,Location:`/api/v1/reports/${saved.id}`});
  }
  const route=/^\/api\/v1\/reports\/([^/]+)(?:\/(export|media)(?:\/([^/]+))?)?$/.exec(path);
  if(route){const id=decodeURIComponent(route[1]);if(!validId(id))fail(400,'INVALID_ID','Invalid report ID.');
   if(route[2]==='media'&&method==='GET'){
    const media=await store.getMedia(id,decodeURIComponent(route[3]||''));if(!media)fail(404,'NOT_FOUND','Image not found.');return new Response(media.bytes,{headers:{...cors,'Content-Type':media.mime,'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}});
   }
   if(method==='GET'&&(!route[2]||route[2]==='export')){
    const data=await store.detail(id);if(!data)fail(404,'NOT_FOUND','Report not found.');return json({schemaVersion:'1.0',data},200,{...cors,ETag:`"${data.version}"`,...(route[2]?{'Content-Disposition':`attachment; filename="AES-${id}.json"`}:{})});
   }
   if(!route[2]&&method==='PUT'){const version=expected(request);if(version<1)fail(400,'INVALID_VERSION','Use POST to create a new report.');const saved=await store.save(normalizeReport(await body(request),id),version);return json({data:saved},200,{...cors,ETag:`"${saved.version}"`});}
   if(!route[2]&&method==='DELETE'){await store.remove(id,expected(request));return new Response(null,{status:204,headers:cors});}
  }
  fail(404,'NOT_FOUND','API route not found.');
 }catch(error){if(error instanceof ApiError)return json({error:{code:error.code,message:error.message,...(error.details?{details:error.details}:{})}},error.status,{...cors,...(error.status===401?{'WWW-Authenticate':'Bearer'}:{})});console.error('API request failed:',error.message);return json({error:{code:'INTERNAL_ERROR',message:'The database request could not be completed.'}},500,cors);}
}
