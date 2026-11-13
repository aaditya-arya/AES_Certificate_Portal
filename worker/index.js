import {handleApi} from '../server/api.js';
import assets from './generated-assets.js';
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/')){
  if(!env.DB||!env.BUCKET)return Response.json({error:{code:'DATABASE_UNAVAILABLE',message:'SQL and image storage are not attached.'}},{status:503});
  const db={kind:'d1',get:async(sql,params=[])=>env.DB.prepare(sql).bind(...params).first(),all:async(sql,params=[])=>((await env.DB.prepare(sql).bind(...params).all()).results),batch:async(statements)=>(await env.DB.batch(statements.map(({sql,params})=>env.DB.prepare(sql).bind(...params)))).map(result=>({changes:result.meta.changes}))};
  return handleApi(request,db,{bucket:env.BUCKET,apiKey:env.API_KEY||'',allowedOrigins:(env.ALLOWED_ORIGINS||'').split(',').filter(Boolean)});
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const path=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname),asset=assets[path];
 if(!asset)return new Response('Not found',{status:404});
 const bytes=Uint8Array.from(atob(asset[1]),character=>character.charCodeAt(0));
 return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':asset[0],'Content-Encoding':'gzip','Cache-Control':path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'}});
}};
